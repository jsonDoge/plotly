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
// use anchor_lang::system_program::{create_account, CreateAccount};
// use anchor_spl::token::{initialize_mint, InitializeMint, Mint as SplMint, Token as SplToken};
// use anchor_spl::token_interface::Mint;
// use mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder;
// use mpl_token_metadata::types::DataV2;
// use mpl_token_metadata::ID as TOKEN_METADATA_PROGRAM_ID;

use crate::events::SeedMinted;
use crate::state::{AccWithBump, SeedMintInfo};
use crate::{errors::ErrorCode, state::Farm};

#[derive(Accounts)]
#[instruction(
    plot_currency: Pubkey,
    seeds_to_mint: u64,
    plant_tokens_per_seed: u64,
    __: u32,
    ___: u32,
    ____: u64,
    _____: u8,
    treasury: Pubkey
)]
pub struct MintSeeds<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub plant_mint: Box<InterfaceAccount<'info, MintInterface>>,
    // value same as plot_currency
    pub plot_currency_mint: Box<InterfaceAccount<'info, MintInterface>>,

    #[account(
        seeds = [b"farm", plot_currency.as_ref()],
        bump,
    )]
    pub farm: Box<Account<'info, Farm>>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"seed_mint_info", seed_mint.key().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<SeedMintInfo>(),
    )]
    pub seed_mint_info: Box<Account<'info, SeedMintInfo>>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), seed_mint.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub seed_metadata_account: UncheckedAccount<'info>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), plant_mint.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub plant_metadata_account: UncheckedAccount<'info>,

    // FARM SEED MINT

    #[account(
        init_if_needed,
        payer = user,
        mint::decimals = 0,
        mint::authority = farm_auth,
        mint::freeze_authority =  farm_auth,
        seeds = [
            b"seed_mint", 
            farm.key().as_ref(),
            plant_mint.key().as_ref(), 
            plant_tokens_per_seed.to_le_bytes().as_ref(),
            treasury.as_ref(),
        ],
        bump,
    )]
    pub seed_mint: Box<Account<'info, Mint>>,

    // USER SEED ATA

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = seed_mint,
        associated_token::authority = user,
    )]
    pub user_associated_seed_account: Box<Account<'info, TokenAccount>>,

    // FARM SEED ATA
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = seed_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_seed_account: Box<Account<'info, TokenAccount>>,

    // USER PLANT MINT ATA

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = user,
    )]
    pub user_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    // USER PLANT MINT ATA

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plant_mint,
        associated_token::authority = user,
    )]
    pub user_associated_plant_token_account: Box<Account<'info, TokenAccount>>,

    // FARM PLANT MINT ATA

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plant_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plant_token_account: Box<Account<'info, TokenAccount>>,


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

impl<'info> MintSeeds<'info> {
    pub fn mint_seeds(
        &mut self,
        plot_currency: Pubkey,
        seeds_to_mint: u64,
        plant_tokens_per_seed: u64,
        growth_block_duration: u32,
        neighbor_water_drain_rate: u32,
        balance_absorb_rate: u64,
        times_to_tend: u8,
        // user treasury NOT farm treasury
        treasury: &Pubkey,
        seed_mint_info_bump: u8,
        program_id: &Pubkey,
    ) -> Result<()> {

        if balance_absorb_rate % 2 != 0 {
            return Err(ErrorCode::InvalidBalanceAbsorbRate.into());
        }

        if growth_block_duration <= 100 {
            return Err(ErrorCode::InvalidGrowthDuration.into());
        }

        if balance_absorb_rate == 0 && times_to_tend > 0 {
            return Err(ErrorCode::TendingNotAllowedIfAbsorbRateIsZero.into());
        }

        if times_to_tend > 5 {
            return Err(ErrorCode::InvalidMaxTends.into());
        }

        if treasury != &self.user_associated_plot_currency_account.key() {
            msg!("Treasury: {} User: {}", treasury, self.user_associated_plot_currency_account.key());
            return Err(ErrorCode::InvalidTreasury.into());
        }

        if (neighbor_water_drain_rate > 25) || (neighbor_water_drain_rate < 0) {
            return Err(ErrorCode::InvalidNeighborWaterDrainRate.into());
        }

        // let is_balance_divisible = growth_block_duration as u64 % balance_absorb_rate  == 0;
        // if !is_balance_divisible {
        //     return Err(ErrorCode::InvalidSeedBalanceAmount.into());
        // }

        let plant_tokens_to_store = seeds_to_mint * plant_tokens_per_seed;

        msg!("Transferring plant tokens to farm... {}", plant_tokens_to_store);

        let cpi_accounts = TransferChecked {
            mint: self.plant_mint.to_account_info(),
            from: self.user_associated_plant_token_account.to_account_info(),
            to: self.farm_associated_plant_token_account.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        token::transfer_checked(
            CpiContext::new(cpi_program, cpi_accounts),
            plant_tokens_to_store,
            self.plant_mint.decimals,
        )?;

        if self.seed_mint_info.plant_mint == Pubkey::default() {
            // set mint info
            self.seed_mint_info.plant_mint = self.plant_mint.key();
            self.seed_mint_info.plant_mint_decimals = self.plant_mint.decimals;
            self.seed_mint_info.plant_tokens_per_seed = plant_tokens_per_seed;
            self.seed_mint_info.growth_block_duration = growth_block_duration;
            self.seed_mint_info.neighbor_water_drain_rate = neighbor_water_drain_rate;
            self.seed_mint_info.balance_absorb_rate = balance_absorb_rate;
            self.seed_mint_info.treasury = *treasury;
            self.seed_mint_info.times_to_tend = times_to_tend;

            self.seed_mint_info.bump = seed_mint_info_bump;

            let metadata_account_info = &self.plant_metadata_account;
            let metadata_data = &mut &**metadata_account_info.try_borrow_data()?;
            let metadata = MplMetadata::deserialize(metadata_data)?;

            let seed_name = format!("Seed ({})", metadata.name.trim_matches('\u{0}'));
            let seed_symbol = format!("SEED-{}", metadata.symbol.trim_matches('\u{0}'));


            msg!("Generating seed {} {}", seed_name, seed_symbol);

            // Cross Program Invocation (CPI)
            // Invoking the create_metadata_account_v3 instruction on the token metadata program
            create_metadata_accounts_v3(
                CpiContext::new_with_signer(
                    self.token_metadata_program.to_account_info(),
                    CreateMetadataAccountsV3 {
                        metadata: self.seed_metadata_account.to_account_info(),
                        mint: self.seed_mint.to_account_info(),
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
                    name: seed_name,
                    symbol: seed_symbol,
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
                None,
            )?;
        }

        mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                MintTo {
                    mint: self.seed_mint.to_account_info(),
                    to: self.user_associated_seed_account.to_account_info(),
                    authority: self.farm_auth.to_account_info(),
                },
                &[&[
                    b"farm_auth",
                    self.farm.key().as_ref(),
                    &[self.farm_auth.bump][..],
                ]],
            ),
            seeds_to_mint,
        )?;

        // TODO: This is ugly, refactor later
        let metadata_data = &mut &**self.seed_metadata_account.try_borrow_data()?;
        let metadata = MplMetadata::deserialize(metadata_data)?;

        emit!(SeedMinted {
            seed_id: self.seed_mint.key(),
            seed_name: metadata.name,
        });

        msg!("Seeds minted!");

        Ok(())
    }
}
