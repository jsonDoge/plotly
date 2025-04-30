use anchor_lang::{accounts::program, prelude::*};
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

use crate::{constants::BASE_BALANCE_FREE_RENT, state::{AccWithBump, Plot}};
use crate::{errors::ErrorCode, state::Farm};

#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32, plot_currency: Pubkey)]
pub struct MintPlot<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"farm", plot_currency.as_ref()],
        bump,
    )]
    pub farm: Account<'info, Farm>,

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
        seeds = [b"plot_collection_mint", farm.key().as_ref()],
        bump,
    )]
    pub plot_collection_mint: Account<'info, Mint>,

    /// CHECK: Validate address by deriving pda
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), plot_mint.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Validate address by deriving pda NO editions for now
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), plot_collection_mint.key().as_ref(), b"edition"],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub master_edition: UncheckedAccount<'info>,

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
    pub plot_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        seeds = [b"plot", plot_mint.key().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<Plot>(),
    )]
    pub plot: Account<'info, Plot>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"farm_auth", farm.key().as_ref()],
        bump,
    )]
    pub farm_auth: Account<'info, AccWithBump>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> MintPlot<'info> {
    pub fn mint_plot(
        &mut self,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
        program_id: &Pubkey,
        plot_bump: u8,
    // returns plot mint address
    ) -> Result<(Pubkey)> {

        if self.plot_mint.supply != 0 {
            return Err(ErrorCode::PlotAlreadyMinted.into());
        }

        let nft_name = format!("Plot ({}, {})", plot_x, plot_y);
        let nft_symbol = format!("PLT-{}-{}", plot_x, plot_y);

        // Cross Program Invocation (CPI)
        // Invoking the create_metadata_account_v3 instruction on the token metadata program
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                self.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: self.metadata_account.to_account_info(),
                    mint: self.plot_mint.to_account_info(),
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
                name: nft_name,
                symbol: nft_symbol,
                uri: "".to_string(),
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: *program_id,
                    verified: false,
                    share: 100,
                }]),
                collection: Some(Collection {
                    verified: false,
                    key: self.plot_collection_mint.key(),
                }),
                uses: None,
            },
            false, // Is mutable
            false, // Update authority is signer
            None,
        )?;

        // Cross Program Invocation (CPI)
        // Invoking the mint_to instruction on the token program
        mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                MintTo {
                    mint: self.plot_mint.to_account_info(),
                    to: self.farm_associated_plot_account.to_account_info(),
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

        verify_sized_collection_item(
            CpiContext::new_with_signer(
                self.token_metadata_program.to_account_info(),
                VerifySizedCollectionItem {
                    metadata: self.metadata_account.to_account_info(),
                    collection_authority: self.farm_auth.to_account_info(),
                    payer: self.user.to_account_info(),
                    collection_mint: self.plot_collection_mint.to_account_info(),
                    collection_metadata: self.plot_collection_metadata_account.to_account_info(),
                    collection_master_edition: self.master_edition.to_account_info(),
                },
                &[&[
                    b"farm_auth",
                    self.farm.key().as_ref(),
                    &[self.farm_auth.bump][..],
                ]],
            ),
            None,
        )?;

        // Decide on initial water and balance
        self.plot.water = 1000000;
        self.plot.balance = 0;
        self.plot.water_regen = 90; // default regen rate
        self.plot.balance_free_rent = 0;

        // set drain rates
        self.plot.right_plant_drain_rate = 0;
        self.plot.left_plant_drain_rate = 0;
        self.plot.up_plant_drain_rate = 0;
        self.plot.down_plant_drain_rate = 0;
        self.plot.center_plant_drain_rate = 0;

        // set water collected
        self.plot.right_plant_water_collected = 0;
        self.plot.left_plant_water_collected = 0;
        self.plot.up_plant_water_collected = 0;
        self.plot.down_plant_water_collected = 0;
        self.plot.center_plant_water_collected = 0;
        
        // set last update block
        self.plot.last_update_block = Clock::get()?.slot as u64;

        // initial owner is plotly (can also be set to farm or program id)
        self.plot.last_claimer = self.farm_auth.key();
        self.plot.bump = plot_bump;

        // Confirm collection size
        // let data = &mut &**self.plot_collection_metadata_account.try_borrow_data()?; // borrow as &[u8]
        // let metadata = MetadataAccount::try_deserialize(data)?;

        // let size = metadata.collection_details.as_ref().unwrap();

        // msg!("Collection size: {:?}", size);

        // TODO: review authority revocation later
        // let cpi_accounts = SetAuthority {
        //     account_or_mint: self.plot_mint.to_account_info(),
        //     current_authority: self.plot_mint_authority.to_account_info(),

        // };

        // let cpi_program = self.token_program.to_account_info();

        // token::set_authority(
        //     CpiContext::new_with_signer(
        //         cpi_program,
        //         cpi_accounts,
        //         &[
        //             &[b"farm_plot_authority", &[self.plot_mint_authority.bump][..]],
        //         ],
        //     ),
        //     spl_token::instruction::AuthorityType::MintTokens,
        //     None, // Revoke by setting to None
        // )?;

        // msg!("Authority revoked.");

        msg!("Plot minted x:{} y:{}", plot_x, plot_y);

        Ok((self.plot_mint.key()))
    }
}
