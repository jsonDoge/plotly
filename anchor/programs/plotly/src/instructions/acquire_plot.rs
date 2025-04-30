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
// use anchor_lang::system_program::{create_account, CreateAccount};
// use anchor_spl::token::{initialize_mint, InitializeMint, Mint as SplMint, Token as SplToken};
// use anchor_spl::token_interface::Mint;
// use mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder;
// use mpl_token_metadata::types::DataV2;
// use mpl_token_metadata::ID as TOKEN_METADATA_PROGRAM_ID;

use crate::state::{AccWithBump, Plot};
use crate::{errors::ErrorCode, state::Farm};

#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32, plot_currency: Pubkey)]
pub struct AcquirePlot<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // value same as plot_currency
    pub plot_currency_mint: Box<InterfaceAccount<'info, MintInterface>>,

    #[account(
        seeds = [b"farm", plot_currency.as_ref()],
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
        associated_token::mint = plot_currency,
        associated_token::authority = user,
    )]
    pub user_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    // Farm plot currency TREASURY

    #[account(
        mut,
        associated_token::mint = plot_currency,
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

impl<'info> AcquirePlot<'info> {
    pub fn acquire_plot(
        &mut self,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
        program_id: &Pubkey,
    ) -> Result<()> {
        // TODO: add deposit balance
        // TODO: add verification that neighbor plots are minted!

        if self.farm_associated_plot_account.amount == 0 {
            // Plot already minted
            // if self.farm_associated_plot_account.amount == 1 {
            //     msg!("Plot already minted and Farm owns it");
            // } else {
            //     msg!("Plot already minted and Someone else owns it");
            // }
            return Err(ErrorCode::PlotAlreadyOwned.into());
        }

        // Farm 0.1% fee
        let total_plot_price = self.farm.plot_price + self.farm.plot_price / 1000;

        if self.user_associated_plot_currency_account.amount == 0 ||
            self.user_associated_plot_currency_account.amount < total_plot_price {
            return Err(ErrorCode::InsufficientPlotCurrencyToAcquirePlot.into());
        }

        if self.farm.plot_currency != self.plot_currency_mint.key() {
            return Err(ErrorCode::InvalidPlotCurrency.into());
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
        token::transfer_checked(CpiContext::new(
            cpi_program,
            cpi_accounts,
        // price should be scaled to decimals
        ), self.farm.plot_price, 6)?;


        // TRANSFER PLOT

        // Cross Program Invocation (CPI)
        // Invoking the mint_to instruction on the token program
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



        msg!("Plot minted x:{} y:{}", plot_x, plot_y);
        msg!("New claimer {}", self.user.key());

        self.plot.last_claimer = self.user.key();
        
        // FEE is 0.1%
        self.plot.balance = self.farm.plot_price;
        self.plot.balance_free_rent = self.farm.plot_price;

        Ok(())
    }
}
