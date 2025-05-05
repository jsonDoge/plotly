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
pub struct CancelOffer<'info> {
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

impl<'info> CancelOffer<'info> {
    pub fn cancel_offer(&mut self) -> Result<()> {
        if self.offer.result_token == Pubkey::default() {
            return Err(ErrorCode::OfferDoesntExist.into());
        }

        if self.offer.result_token_balance == 0 {
            return Err(ErrorCode::OfferDoesntHaveEnoughTokens.into());
        }

        msg!(
            "Transferring remaining result token back to owner... {}",
            self.offer.result_token_balance
        );

        let cpi_accounts = TransferChecked {
            mint: self.result_mint.to_account_info(),
            from: self.farm_associated_result_token_account.to_account_info(),
            to: self.user_associated_result_token_account.to_account_info(),
            authority: self.farm_auth.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        token::transfer_checked(
            CpiContext::new_with_signer(
                cpi_program,
                cpi_accounts,
                &[&[
                    b"farm_auth",
                    self.farm.key().as_ref(),
                    &[self.farm_auth.bump],
                ]],
            ),
            self.offer.result_token_balance,
            self.result_mint.decimals,
        )?;

        msg!("Offer closed: {:?}", self.offer.key());

        Ok(())
    }
}
