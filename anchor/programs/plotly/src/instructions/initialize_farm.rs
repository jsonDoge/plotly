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
// use anchor_lang::system_program::{create_account, CreateAccount};
// use anchor_spl::token::{initialize_mint, InitializeMint, Mint as SplMint, Token as SplToken};
// use anchor_spl::token_interface::Mint;
// use mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder;
// use mpl_token_metadata::types::DataV2;
// use mpl_token_metadata::ID as TOKEN_METADATA_PROGRAM_ID;

use crate::{errors::ErrorCode, state::AccWithBump, state::Farm};

#[derive(Accounts)]
#[instruction(plot_currency: Pubkey)]
pub struct InitializeFarm<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // value same as plot_currency
    pub plot_currency_mint: InterfaceAccount<'info, MintInterface>,

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
        space = 8 + 32 + 32 + 32 + 8, // discriminant + plot_currency + plot_collection + plot_price + bump
        seeds = [b"farm", plot_currency.as_ref()],
        bump,
    )]
    pub farm: Account<'info, Farm>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = plot_mint_authority,
        mint::freeze_authority =  plot_mint_authority,
        seeds = [b"plot_collection_mint", farm.key().as_ref()],
        bump,
    )]
    pub plot_collection_mint: Account<'info, Mint>,

    /// CHECK: Validate address by deriving pda NO editions for now
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), plot_collection_mint.key().as_ref(), b"edition"],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub master_edition: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user,
        seeds = [b"plot_mint_authority", farm.key().as_ref()],
        bump,
        space = 8 + 8,
    )]
    pub plot_mint_authority: Account<'info, AccWithBump>,

    #[account(
        init,
        payer = user,
        seeds = [b"farm_associated_plot_authority", farm.key().as_ref()],
        bump,
        space = 8 + 8,
    )]
    pub farm_associated_plot_authority: Account<'info, AccWithBump>,

    // for holding collection
    #[account(
        init,
        payer = user,
        associated_token::mint = plot_collection_mint,
        associated_token::authority = farm_associated_plot_authority,
    )]
    pub farm_associated_plot_collection_account: Account<'info, TokenAccount>,


    // Farm plot currency TREASURY
    #[account(
        init,
        payer = user,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = farm_associated_plot_currency_authority,
    )]
    pub farm_associated_plot_currency_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        seeds = [b"farm_ata_plot_currency_auth", farm.key().as_ref()],
        bump,
        space = 8 + 8,
    )]
    pub farm_associated_plot_currency_authority: Account<'info, AccWithBump>,

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
        plot_price: u64,
        mint_authority_bump: u8,
        farm_bump: u8,
        farm_associated_plot_authority_bump: u8,
        farm_associated_plot_currency_authority_bump: u8,
        program_id: &Pubkey,
    ) -> Result<Pubkey> {
        msg!("Initializing farm...");

        if self.farm.plot_currency != Pubkey::default() {
            return Ok(self.farm.key());
        }

        if plot_currency != &self.plot_currency_mint.key() {
            return Err(ErrorCode::InvalidPlotCurrency.into());
        }

        self.plot_mint_authority.bump = mint_authority_bump;
        self.farm_associated_plot_authority.bump = farm_associated_plot_authority_bump;
        self.farm_associated_plot_currency_authority.bump = farm_associated_plot_currency_authority_bump;

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
                    mint_authority: self.plot_mint_authority.to_account_info(),
                    payer: self.user.to_account_info(),
                    update_authority: self.plot_mint_authority.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
                &[&[
                    b"plot_mint_authority",
                    self.farm.key().as_ref(),
                    &[self.plot_mint_authority.bump][..],
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
                    authority: self.plot_mint_authority.to_account_info(),
                },
                &[&[
                    b"plot_mint_authority",
                    self.farm.key().as_ref(),
                    &[self.plot_mint_authority.bump][..],
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
                    update_authority: self.plot_mint_authority.to_account_info(),
                    mint_authority: self.plot_mint_authority.to_account_info(),
                    payer: self.user.to_account_info(),
                    metadata: self.plot_collection_metadata_account.to_account_info(),
                    token_program: self.token_program.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
                &[&[
                    b"plot_mint_authority",
                    self.farm.key().as_ref(),
                    &[self.plot_mint_authority.bump][..],
                ]],
            ),
            Some(0),
        )?;

        msg!("Farm initialized!");

        Ok((self.farm.key()))
    }
}
