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
    ingredient_amounts: [u64; 2],
)]
pub struct MintRecipe<'info> {
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
            &ingredient_amounts[0].to_le_bytes()[..],
            ingredient_1_mint.key().as_ref(),
            &ingredient_amounts[1].to_le_bytes()[..],
            result_mint.key().as_ref(),
            user_associated_ingredient_0_token_account.key().as_ref(),
            user_associated_ingredient_1_token_account.key().as_ref(),
            farm.key().as_ref()
        ],
        space = 8 + std::mem::size_of::<Recipe>(),
        payer = user,
        bump,
    )]
    pub recipe: Box<Account<'info, Recipe>>,

    // USER INGREDIENT TOKEN ATA
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = ingredient_0_mint,
        associated_token::authority = user,
    )]
    pub user_associated_ingredient_0_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = ingredient_1_mint,
        associated_token::authority = user,
    )]
    pub user_associated_ingredient_1_token_account: Box<Account<'info, TokenAccount>>,

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

    // RECIPE TREASURY
    #[account(mut)]
    pub recipe_ingredient_0_treasury: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub recipe_ingredient_1_treasury: Box<Account<'info, TokenAccount>>,

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

impl<'info> MintRecipe<'info> {
    pub fn mint_recipe(
        &mut self,
        plot_currency: Pubkey,
        // TODO: later can increase to more if time left
        ingredient_amounts: [u64; 2],
        result_token_receive: u64,
        recipe_bump: u8,
        program_id: &Pubkey,
    ) -> Result<()> {
        if self.ingredient_0_mint.key() == Pubkey::default()
            || self.ingredient_1_mint.key() == Pubkey::default()
        {
            return Err(ErrorCode::InvalidIngredientData.into());
        }

        if ingredient_amounts[0] == 0 || ingredient_amounts[1] == 0 {
            return Err(ErrorCode::InvalidIngredientData.into());
        }

        if self.user_associated_ingredient_0_token_account.key() == Pubkey::default() {
            return Err(ErrorCode::InvalidIngredientData.into());
        }
        if self.user_associated_ingredient_1_token_account.key() == Pubkey::default() {
            return Err(ErrorCode::InvalidIngredientData.into());
        }

        if self.result_mint.key() == Pubkey::default() || result_token_receive == 0 {
            return Err(ErrorCode::InvalidRecipeResultData.into());
        }

        // doesnt exists
        if self.recipe.ingredient_0 == Pubkey::default()
            || self.recipe.ingredient_1 == Pubkey::default()
        {
            return Err(ErrorCode::RecipeDoesntExist.into());
        }

        // treasury doesnt match
        if self.recipe.ingredient_0_treasury != self.recipe_ingredient_0_treasury.key() {
            return Err(ErrorCode::InvalidRecipeTreasury.into());
        }

        if self.recipe.ingredient_1_treasury != self.recipe_ingredient_1_treasury.key() {
            return Err(ErrorCode::InvalidRecipeTreasury.into());
        }

        let ingredient_0_amount_required =
            self.recipe.ingredient_0_amount_per_1_result_token * result_token_receive;
        let ingredient_1_amount_required =
            self.recipe.ingredient_1_amount_per_1_result_token * result_token_receive;


        if self.recipe.result_token_balance < result_token_receive {
            return Err(ErrorCode::RecipeDoesntHaveEnoughTokens.into());
        }

        if self.user_associated_ingredient_0_token_account.amount < ingredient_0_amount_required {
            return Err(ErrorCode::InsufficientIngredientTokenBalance.into());
        }

        if self.user_associated_ingredient_1_token_account.amount < ingredient_1_amount_required {
            return Err(ErrorCode::InsufficientIngredientTokenBalance.into());
        }

        // TRANSFERING INGREDIENTS TO TREASURY

        // ingredient 0
        msg!(
            "Transferring ingredient token 0 to recipe treasury... {}",
            ingredient_0_amount_required
        );

        let cpi_accounts = TransferChecked {
            mint: self.result_mint.to_account_info(),
            from: self
                .user_associated_ingredient_0_token_account
                .to_account_info(),
            to: self.recipe_ingredient_0_treasury.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        token::transfer_checked(
            CpiContext::new(cpi_program, cpi_accounts),
            ingredient_0_amount_required,
            self.ingredient_0_mint.decimals,
        )?;

        msg!(
            "Transferring ingredient token 0 to recipe treasury... {}",
            ingredient_1_amount_required
        );

        let cpi_accounts = TransferChecked {
            mint: self.result_mint.to_account_info(),
            from: self
                .user_associated_ingredient_1_token_account
                .to_account_info(),
            to: self.recipe_ingredient_1_treasury.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        token::transfer_checked(
            CpiContext::new(cpi_program, cpi_accounts),
            ingredient_1_amount_required,
            self.ingredient_1_mint.decimals,
        )?;

        // TRANSFERING RESULT TOKEN TO USER

        msg!(
            "Transferring result token to user... {}",
            result_token_receive
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
                    &[self.farm_auth.bump][..],
                ]],
            ),
            result_token_receive,
            self.result_mint.decimals,
        )?;

        self.recipe.result_token_balance -= result_token_receive;

        msg!("Token crafted by recipe!");

        Ok(())
    }
}
