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

use crate::state::{AccWithBump, Recipe, SeedMintInfo};
use crate::{errors::ErrorCode, state::Farm};

#[derive(Accounts)]
#[instruction(
    plot_currency: Pubkey,
    ingredient_0_amount: u64,
    ingredient_1_amount: u64,
    __: u64,
    ingredient_0_treasury: Pubkey,
    ingredient_1_treasury: Pubkey,
)]
pub struct RefillRecipe<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // FARM
    #[account(
        seeds = [b"farm", plot_currency.as_ref()],
        bump,
    )]
    pub farm: Box<Account<'info, Farm>>,

    // INGREDIENTS
    #[account()]
    pub ingredient_0_mint: Box<Account<'info, Mint>>,

    #[account()]
    pub ingredient_1_mint: Box<Account<'info, Mint>>,

    #[account()]
    pub result_mint: Box<Account<'info, Mint>>,

    // RECIPE

    #[account(
        init,
        seeds = [
            b"recipe",
            ingredient_0_mint.key().as_ref(),
            &ingredient_0_amount.to_le_bytes()[..],
            ingredient_1_mint.key().as_ref(),
            &ingredient_1_amount.to_le_bytes()[..],
            result_mint.key().as_ref(),
            ingredient_0_treasury.as_ref(),
            ingredient_1_treasury.as_ref(),
            farm.key().as_ref()
        ],
        space = 8 + std::mem::size_of::<Recipe>(),
        payer = user,
        bump,
    )]
    pub recipe: Box<Account<'info, Recipe>>,

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

impl<'info> RefillRecipe<'info> {
    pub fn refill_recipe(
        &mut self,
        plot_currency: Pubkey,
        ingredient_0_amount: u64,
        ingredient_1_amount: u64,
        result_token_to_add: u64,
        ingredient_0_treasury: Pubkey,
        ingredient_1_treasury: Pubkey,
        recipe_bump: u8,
        program_id: &Pubkey,
    ) -> Result<()> {

        if result_token_to_add == 0 {
            return Err(ErrorCode::CantRefillByZeroTokens.into());
        }

        if self.ingredient_0_mint.key() == Pubkey::default() || self.ingredient_1_mint.key() == Pubkey::default() {
            return Err(ErrorCode::InvalidIngredientData.into());
        }

        if ingredient_0_amount == 0 || ingredient_1_amount == 0 {
            return Err(ErrorCode::InvalidIngredientData.into());
        }

        if ingredient_0_treasury == Pubkey::default() {
            return Err(ErrorCode::InvalidIngredientData.into());
        }
        if ingredient_1_treasury == Pubkey::default() {
            return Err(ErrorCode::InvalidIngredientData.into());
        }

        if self.result_mint.key() == Pubkey::default() {
            return Err(ErrorCode::InvalidRecipeResultData.into());
        }

        // already exists
        if self.recipe.ingredient_0 != Pubkey::default() || self.recipe.ingredient_1 != Pubkey::default() {
            return Err(ErrorCode::RecipeAlreadyExists.into());
        }

        msg!(
            "Refilling result token to farm... {}",
            result_token_to_add
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
            result_token_to_add,
            self.result_mint.decimals,
        )?;

        self.recipe.result_token_balance += result_token_to_add;

        msg!("Recipe refilled!");

        Ok(())
    }
}
