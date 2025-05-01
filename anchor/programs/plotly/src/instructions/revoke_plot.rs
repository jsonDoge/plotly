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

use crate::farm;
use crate::state::{AccWithBump, Plant, Plot};
use crate::{errors::ErrorCode, state::Farm};

// IF PLOT BALANCE IS < 10% OF FREE RENT
// revert plant to seed and send to last_claimer (if plant still exists)
// send left-over plot currency to revoker
// reset plot to default state - 0 balance, last_claimer = farm_auth
#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32, plot_currency: Pubkey)]
pub struct RevokePlot<'info> {
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

    // PLANT
    #[account(
        seeds = [b"plant", plot_mint.key().as_ref()],
        bump,
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

impl<'info> RevokePlot<'info> {
    pub fn revoke_plot(
        &mut self,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
        program_id: &Pubkey,
    ) -> Result<()> {

        // if plot balance is less than 10% of free rent, then it's up for grabs
        if self.plot.balance > self.plot.balance_free_rent / 10 {
            return Err(ErrorCode::PlotStillHasBalance.into());
        }

        // either has the NFT or has a low-balance on it (last_claimer + farm ownership + NO PLANT)

        if self.farm_associated_plot_account.amount != 1 {
            return Err(ErrorCode::FarmDoesntOwnPlotMint.into());
        }


        // there is still a plant on it
        if self.plant.seed_mint != Pubkey::default() {
            // revert to seed and give it back to the last owner
            // TODO: copy paste revert plant code
        }
    
        // Transfer left-over balance to revoker

        if (self.plot.balance > 0) {
            msg!("Sending balance to revoker: {}", self.plot.balance);

            let cpi_accounts = TransferChecked {
                mint: self.plot_currency_mint.to_account_info(),
                from: self.farm_associated_plot_currency_account.to_account_info(),
                to: self.user_associated_plot_currency_account.to_account_info(),
                authority: self.farm_auth.to_account_info(),
            };

            let cpi_program = self.token_program.to_account_info();

            // If authority is a PDA, you can pass seeds in a signer context here

            // TODO: store plot currency decimals in the farm
            token::transfer_checked(
                CpiContext::new_with_signer(
                    cpi_program,
                    cpi_accounts,
                    &[&[
                        b"farm_auth",
                        self.farm.key().as_ref(),
                        &[self.farm_auth.bump][..],
                    ]],
                ),
                self.plot.balance,
                6,
            )?;
        }

        // RESET PLOT

        self.plot.balance = 0;
        self.plot.last_claimer = self.farm_auth.key();

        Ok(())
    }
}
