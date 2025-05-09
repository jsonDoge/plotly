use anchor_lang::{accounts::program, prelude::*};
use anchor_spl::token_interface::Mint as MintInterface;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        verify_sized_collection_item, CreateMasterEditionV3, CreateMetadataAccountsV3,
        MasterEditionAccount, Metadata, MetadataAccount, VerifySizedCollectionItem,
    },
    token::{self, mint_to, spl_token, Mint, MintTo, SetAuthority, Token, TokenAccount},
};
use mpl_token_metadata::types::{Collection, CollectionDetails, Creator};

use crate::{errors::ErrorCode, state::AccWithBump, state::Farm};

#[derive(Accounts)]
#[instruction(plot_currency: Pubkey)]
pub struct InitializeFarm<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // value same as plot_currency
    pub plot_currency_mint: Box<InterfaceAccount<'info, MintInterface>>,

    // COLLECTION
    /// CHECK: Validate address by deriving pda NO editions for now
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), plot_collection_mint.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub plot_collection_metadata_account: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user,
        seeds = [b"farm", plot_currency.as_ref()],
        space = 8 + Farm::INIT_SPACE, // discriminant + plot_currency + plot_collection + plot_price + bump
        bump,
    )]
    pub farm: Box<Account<'info, Farm>>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = farm_auth,
        mint::freeze_authority =  farm_auth,
        seeds = [b"plot_collection_mint", farm.key().as_ref()],
        bump,
    )]
    pub plot_collection_mint: Box<Account<'info, Mint>>,

    /// CHECK: Validate address by deriving pda NO editions for now
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), plot_collection_mint.key().as_ref(), b"edition"],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub master_edition: UncheckedAccount<'info>,

    // for holding collection
    #[account(
        init,
        payer = user,
        associated_token::mint = plot_collection_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_collection_account: Box<Account<'info, TokenAccount>>,


    // Farm plot currency TREASURY

    #[account(
        init,
        payer = user,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = user,
        seeds = [b"farm_auth", farm.key().as_ref()],
        space = 8 + AccWithBump::INIT_SPACE,
        bump,
    )]
    pub farm_auth: Box<Account<'info, AccWithBump>>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> InitializeFarm<'info> {
    pub fn initialize_farm(
        &mut self,
        plot_currency: &Pubkey,
        plot_price: u64, // deploy script sets to 1_000_000
        farm_bump: u8,
        farm_auth: u8,
        program_id: &Pubkey,
    ) -> Result<Pubkey> {
        msg!("Initializing farm...");

        if self.farm.plot_currency != Pubkey::default() {
            return Ok(self.farm.key());
        }

        if plot_currency != &self.plot_currency_mint.key() {
            return Err(ErrorCode::InvalidPlotCurrency.into());
        }

        // Plot balance start decreasing (even without plant) if plot currency is below this value
        if plot_price % 2 != 0 {
            return Err(ErrorCode::InvalidPlotPrice.into());
        }

        self.farm_auth.bump = farm_auth;

        self.farm.plot_currency = *plot_currency;
        self.farm.plot_collection = self.plot_collection_mint.key();
        self.farm.plot_price = plot_price;
        self.farm.bump = farm_bump;

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                self.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: self.plot_collection_metadata_account.to_account_info(),
                    mint: self.plot_collection_mint.to_account_info(),
                    mint_authority: self.farm_auth.to_account_info(),
                    payer: self.user.to_account_info(),
                    update_authority: self.farm_auth.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
                &[&[
                    b"farm_auth",
                    self.farm.key().as_ref(),
                    &[self.farm_auth.bump][..],
                ]],
            ),
            DataV2 {
                name: format!("Plot field"),
                symbol: "PLT".to_string(),
                uri: "".to_string(),
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: *program_id,
                    verified: false,
                    share: 100,
                }]),
                collection: None,
                uses: None,
            },
            false, // Is mutable
            false, // Update authority is signer
            Some(CollectionDetails::V1 { size: 0 }),
        )?;

        mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                MintTo {
                    mint: self.plot_collection_mint.to_account_info(),
                    to: self
                        .farm_associated_plot_collection_account
                        .to_account_info(),
                    authority: self.farm_auth.to_account_info(),
                },
                &[&[
                    b"farm_auth",
                    self.farm.key().as_ref(),
                    &[self.farm_auth.bump][..],
                ]],
            ),
            1,
        )?;

        // msg!("Current supply: {:?}", self.plot_mint);

        create_master_edition_v3(
            CpiContext::new_with_signer(
                self.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: self.master_edition.to_account_info(),
                    mint: self.plot_collection_mint.to_account_info(),
                    update_authority: self.farm_auth.to_account_info(),
                    mint_authority: self.farm_auth.to_account_info(),
                    payer: self.user.to_account_info(),
                    metadata: self.plot_collection_metadata_account.to_account_info(),
                    token_program: self.token_program.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
                &[&[
                    b"farm_auth",
                    self.farm.key().as_ref(),
                    &[self.farm_auth.bump][..],
                ]],
            ),
            Some(0),
        )?;

        msg!("Farm initialized!");

        Ok((self.farm.key()))
    }
}
