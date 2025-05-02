use anchor_lang::{accounts::program, prelude::*};
use anchor_spl::token_interface::Mint as MintInterface;
use anchor_spl::{
    associated_token::{spl_associated_token_account, AssociatedToken},
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        verify_sized_collection_item, CreateMasterEditionV3, CreateMetadataAccountsV3,
        MasterEditionAccount, Metadata, MetadataAccount, VerifySizedCollectionItem,
    },
    token::{
        self, mint_to, spl_token, Mint, MintTo, SetAuthority, Token, TokenAccount, TransferChecked,
    },
};
use mpl_token_metadata::accounts::Metadata as MplMetadata;
use mpl_token_metadata::types::{Collection, CollectionDetails, Creator};

use crate::state::{AccWithBump, Offer, SeedMintInfo};
use crate::{errors::ErrorCode, state::Farm};

#[derive(Accounts)]
#[instruction(
    price_amount_per_token: u64,
)]
pub struct RefillOffer<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub plot_currency_mint: Box<InterfaceAccount<'info, MintInterface>>,

    // FARM
    #[account(
        seeds = [b"farm", plot_currency_mint.key().as_ref()],
        bump,
    )]
    pub farm: Box<Account<'info, Farm>>,

    // RESULT
    #[account()]
    pub result_mint: Box<Account<'info, Mint>>,

    // RECIPE

    #[account(
        mut,
        seeds = [
            b"offer",
            &price_amount_per_token.to_le_bytes()[..],
            result_mint.key().as_ref(),
            user_treasury.key().as_ref(),
            farm.key().as_ref()
        ],
        bump,
    )]
    pub offer: Box<Account<'info, Offer>>,

    // TREASURY
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = user,
    )]
    pub user_treasury: Box<Account<'info, TokenAccount>>,

    // USER RESULT TOKEN ATA
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = result_mint,
        associated_token::authority = user,
    )]
    pub user_associated_result_token_account: Box<Account<'info, TokenAccount>>,

    // FARM RESULT TOKEN ATA
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = result_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_result_token_account: Box<Account<'info, TokenAccount>>,

    // AUTH
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

impl<'info> RefillOffer<'info> {
    pub fn refill_offer(
        &mut self,
        price_amount_per_token: u64,
        result_token_deposit: u64,
        program_id: &Pubkey,
    ) -> Result<()> {

        if self.offer.result_token == Pubkey::default() {
            return Err(ErrorCode::OfferDoesntExist.into());
        }

        // TRANSFER REesult token to farm (seed)

        msg!(
            "Transferring result token to farm... {}",
            result_token_deposit
        );

        let cpi_accounts = TransferChecked {
            mint: self.result_mint.to_account_info(),
            from: self.user_associated_result_token_account.to_account_info(),
            to: self.farm_associated_result_token_account.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        token::transfer_checked(
            CpiContext::new(cpi_program, cpi_accounts),
            result_token_deposit,
            self.result_mint.decimals,
        )?;

        self.offer.result_token_balance += result_token_deposit;

        msg!("Offer filled: {:?}", self.offer.key());

        Ok(())
    }
}
