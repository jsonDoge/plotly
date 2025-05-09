use anchor_lang::{accounts::program, prelude::*};
use anchor_spl::token_interface::Mint as MintInterface;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        verify_sized_collection_item, CreateMasterEditionV3, CreateMetadataAccountsV3,
        MasterEditionAccount, Metadata, MetadataAccount, VerifySizedCollectionItem,
    },
    token::{
        self, mint_to,
        spl_token::{self, instruction::transfer},
        Mint, MintTo, SetAuthority, Token, TokenAccount, Transfer, TransferChecked,
    },
};
use mpl_token_metadata::types::{Collection, CollectionDetails, Creator};

use crate::state::{AccWithBump, Plant, Plot};
use crate::{errors::ErrorCode, state::Farm};

#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32)]
pub struct DepositToPlot<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // value same as plot_currency
    pub plot_currency_mint: Box<InterfaceAccount<'info, MintInterface>>,

    #[account(
        seeds = [b"farm", plot_currency_mint.key().as_ref()],
        bump,
    )]
    pub farm: Box<Account<'info, Farm>>,

    // Create new mint account, NFTs have 0 decimals
    #[account(
        init_if_needed,
        payer = user,
        mint::decimals = 0,
        mint::authority = farm_auth,
        mint::freeze_authority =  farm_auth,
        seeds = [b"plot_mint", &plot_x.to_le_bytes()[..], &plot_y.to_le_bytes()[..], farm.key().as_ref()],
        bump,
    )]
    pub plot_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [b"plot", plot_mint.key().as_ref()],
        bump,
    )]
    pub plot: Box<Account<'info, Plot>>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"plant", plot_mint.key().as_ref()],
        bump,
        space = 8 + Plant::INIT_SPACE,
    )]
    pub plant: Box<Account<'info, Plant>>,

    // Create associated token account, if needed
    // This is the account that will hold the NFT
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_mint,
        associated_token::authority = user,
    )]
    pub user_associated_plot_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_account: Box<Account<'info, TokenAccount>>,

    // User plot currency account
    #[account(
        mut,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = user,
    )]
    pub user_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    // Farm plot currency TREASURY
    #[account(
        mut,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    // PDA authority
    #[account(
        seeds = [b"farm_auth", farm.key().as_ref()],
        bump,
    )]
    pub farm_auth: Box<Account<'info, AccWithBump>>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> DepositToPlot<'info> {
    pub fn deposit_to_plot(
        &mut self,
        plot_x: u32,
        plot_y: u32,
        balance_to_add: u64,
        program_id: &Pubkey,
    ) -> Result<()> {
        if (balance_to_add == 0) {
            return Err(ErrorCode::ZeroBalance.into());
        }

        // TODO: we'd normally also need to update plant balance consumption/and neighbor waters but for MVP we can ignore it

        // either has NFT or has a low-balance/plant on it (last_claimer + farm ownership)
        if self.user_associated_plot_account.amount == 0 && self.plot.last_claimer != self.user.key()
        {
            return Err(ErrorCode::UserNotPlotOwner.into());
        }

        if self.user_associated_plot_currency_account.amount == 0
            || self.user_associated_plot_currency_account.amount < balance_to_add
        {
            return Err(ErrorCode::InsufficientPlotCurrency.into());
        }
        // CHARGE USER FOR PLOT

        let cpi_accounts = TransferChecked {
            mint: self.plot_currency_mint.to_account_info(),
            from: self.user_associated_plot_currency_account.to_account_info(),
            to: self.farm_associated_plot_currency_account.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        // If authority is a PDA, you can pass seeds in a signer context here

        msg!("Transferring plot currency to farm...");

        // TODO: hardcoding decimals, but will update later
        token::transfer_checked(
            CpiContext::new(
                cpi_program,
                cpi_accounts,
                // price should be scaled to decimals
            ),
            balance_to_add,
            6,
        )?;


        // IF FARM WAS THE OWNER and there is no plant on the plot, send NFT BACK to user

        if (self.farm_associated_plot_account.amount == 1 && self.plant.seed_mint != Pubkey::default() && self.plot.last_claimer == self.user.key()) {
            let cpi_accounts = TransferChecked {
                mint: self.plot_mint.to_account_info(),
                from: self.farm_associated_plot_account.to_account_info(),
                to: self.user_associated_plot_account.to_account_info(),
                authority: self.farm_auth.to_account_info(),
            };

            let cpi_program = self.token_program.to_account_info();

            // If authority is a PDA, you can pass seeds in a signer context here

            msg!("Transferring plot NFT to user...");

            token::transfer_checked(CpiContext::new_with_signer(
                cpi_program,
                cpi_accounts,
                &[&[
                    b"farm_auth",
                    self.farm.key().as_ref(),
                    &[self.farm_auth.bump],
                ]],
            ), 1, 0)?;

        }

        self.plot.balance += balance_to_add;

        Ok(())
    }
}
