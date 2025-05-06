use anchor_lang::{accounts::program, prelude::*};
use anchor_spl::metadata::Metadata;
use anchor_spl::token_interface::Mint as MintInterface;
use anchor_spl::{
    associated_token::{spl_associated_token_account, AssociatedToken},
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        verify_sized_collection_item, CreateMasterEditionV3, CreateMetadataAccountsV3,
        MasterEditionAccount, MetadataAccount, VerifySizedCollectionItem,
    },
    token::{
        self, mint_to, spl_token, Mint, MintTo, SetAuthority, Token, TokenAccount, TransferChecked,
    },
};
use mpl_token_metadata::types::{Collection, CollectionDetails, Creator};

use crate::state::{AccWithBump, Offer, SeedMintInfo};
use crate::{errors::ErrorCode, state::Farm};

#[event]
pub struct OfferCreated {
    pub offer_id: Pubkey,
    pub price_per_token: u64,
    pub result_token_id: Pubkey,
}

#[derive(Accounts)]
#[instruction(
    price_amount_per_token: u64,
)]
pub struct CreateOffer<'info> {
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
        init,
        seeds = [
            b"offer",
            &price_amount_per_token.to_le_bytes()[..],
            result_mint.key().as_ref(),
            user_treasury.key().as_ref(),
            farm.key().as_ref()
        ],
        space = 8 + std::mem::size_of::<Offer>(),
        payer = user,
        bump,
    )]
    pub offer: Box<Account<'info, Offer>>,

    #[account(
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            result_mint.key().as_ref()
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub offer_metadata: Box<Account<'info, MetadataAccount>>,

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

impl<'info> CreateOffer<'info> {
    pub fn create_offer(
        &mut self,
        // TODO: later can increase to more if time left
        price_amount_per_token: u64,
        result_token_deposit: u64,
        offer_bump: u8,
        program_id: &Pubkey,
    ) -> Result<()> {


        if self.user_treasury.key() == Pubkey::default() {
            return Err(ErrorCode::InvalidIngredientData.into());
        }
        if self.user_associated_result_token_account.key() == Pubkey::default() {
            return Err(ErrorCode::InvalidIngredientData.into());
        }

        if self.result_mint.key() == Pubkey::default() {
            return Err(ErrorCode::InvalidResultToken.into());
        }

        // already exists
        if self.offer.result_token != Pubkey::default() {
            return Err(ErrorCode::OfferAlreadyExists.into());
        }

        // VERIFY if seed mint and made by the farm program

        if self.offer_metadata.key() == Pubkey::default() || self.offer_metadata.mint != self.result_mint.key() {
            return Err(ErrorCode::InvalidResultToken.into());
        }

        let creators = self.offer_metadata.creators.as_ref().ok_or(ErrorCode::InvalidResultToken)?;
        // TODO: investigate how to get creatores[0].verified
        if creators.len() != 1 || creators[0].address != *program_id {
            return Err(ErrorCode::InvalidResultToken.into());
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

        self.offer.price_amount_per_token = price_amount_per_token;
        
        self.offer.result_token = self.result_mint.key();
        self.offer.result_token_balance = result_token_deposit;

        self.offer.treasury = self.user_treasury.key();
        self.offer.bump = offer_bump;

        msg!("Offer created: {:?}", self.offer.key());

        emit!(OfferCreated {
            offer_id: self.offer.key(),
            price_per_token: price_amount_per_token,
            result_token_id: self.result_mint.key(),
        });

        Ok(())
    }
}
