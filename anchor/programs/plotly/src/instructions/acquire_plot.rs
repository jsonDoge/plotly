use anchor_lang::{accounts::program, prelude::*};
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        verify_sized_collection_item, CreateMasterEditionV3, CreateMetadataAccountsV3,
        MasterEditionAccount, Metadata, MetadataAccount, VerifySizedCollectionItem
    },
    token::{self, mint_to, spl_token, Mint, MintTo, SetAuthority, Token, TokenAccount},
};
use mpl_token_metadata::{
    types::{Collection, CollectionDetails, Creator},
};
// use anchor_lang::system_program::{create_account, CreateAccount};
// use anchor_spl::token::{initialize_mint, InitializeMint, Mint as SplMint, Token as SplToken};
// use anchor_spl::token_interface::Mint;
// use mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder;
// use mpl_token_metadata::types::DataV2;
// use mpl_token_metadata::ID as TOKEN_METADATA_PROGRAM_ID;

use crate::errors::ErrorCode;

#[account]
#[derive(Default, InitSpace)]
pub struct AccWithBump {
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32)]
pub struct AcquirePlot<'info> {
    #[account(mut)]
    pub user: Signer<'info>,



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
        init_if_needed,
        payer = user,
        mint::decimals = 0,
        mint::authority = plot_mint_authority,
        mint::freeze_authority =  plot_mint_authority,
        seeds = [b"plot_collection_mint"],
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
        mint::authority = plot_mint_authority,
        mint::freeze_authority =  plot_mint_authority,
        seeds = [b"plot_mint", &plot_x.to_le_bytes()[..], &plot_y.to_le_bytes()[..]],
        bump,
    )]
    pub plot_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"farm_plot_authority"],
        bump,
        space = 8 + 8,
    )]
    pub plot_mint_authority: Account<'info, AccWithBump>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"farm_associated_plot_authority"],
        bump,
        space = 8 + 8,
    )]
    pub farm_associated_plot_authority: Account<'info, AccWithBump>,
    // Create associated token account, if needed
    // This is the account that will hold the NFT
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_mint,
        associated_token::authority = user,
    )]
    pub user_associated_plot_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_mint,
        associated_token::authority = farm_associated_plot_authority,
    )]
    pub farm_associated_plot_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_collection_mint,
        associated_token::authority = farm_associated_plot_authority,
    )]
    pub farm_associated_plot_collection_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> AcquirePlot<'info> {
    pub fn acquire_plot(
        &mut self,
        plot_x: u32,
        plot_y: u32,
        mint_authority_bump: u8,
        program_id: &Pubkey,
    ) -> Result<()> {
        // msg!("Creating Plot--------------");

        if self.plot_mint_authority.bump != mint_authority_bump {
            self.plot_mint_authority.bump = mint_authority_bump;
        }

        // Check if the plot_mint already has a master edition with a supply of one
        // let edition_seeds = [
        //     b"metadata",
        //     self.token_metadata_program.key().as_ref(),
        //     self.plot_mint.key().as_ref(),
        //     b"edition",
        // ];
        // let (edition_key, _) = Pubkey::find_program_address(&edition_seeds, program_id);

        // if self.edition_account.key() == edition_key {
        //     msg!("Master edition for the plot_mint already exists.");
        //     return Err(ErrorCode::MasterEditionAlreadyExists.into());
        // }

        if self.plot_mint.supply != 0 {
            // Plot already minted
            if self.farm_associated_plot_account.amount == 1 {
                msg!("Plot already minted and Farm owns it");
            } else {
                msg!("Plot already minted and Someone else owns it");
            }
            return Ok(());
        }

        let nft_name = format!("Plot ({}, {})", plot_x, plot_y);
        let nft_symbol = format!("PLT-{}-{}", plot_x, plot_y);


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
                &[&[b"farm_plot_authority", &[self.plot_mint_authority.bump][..]]],
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
            Some(CollectionDetails::V1 { size: 0 })
        )?;

        // Cross Program Invocation (CPI)
        // Invoking the create_metadata_account_v3 instruction on the token metadata program
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                self.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: self.metadata_account.to_account_info(),
                    mint: self.plot_mint.to_account_info(),
                    mint_authority: self.plot_mint_authority.to_account_info(),
                    payer: self.user.to_account_info(),
                    update_authority: self.plot_mint_authority.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
                &[&[b"farm_plot_authority", &[self.plot_mint_authority.bump][..]]],
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
            None
        )?;

        // Cross Program Invocation (CPI)
        // Invoking the mint_to instruction on the token program
        mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                MintTo {
                    mint: self.plot_mint.to_account_info(),
                    to: self.user_associated_plot_account.to_account_info(),
                    authority: self.plot_mint_authority.to_account_info(),
                },
                &[&[b"farm_plot_authority", &[self.plot_mint_authority.bump]]],
            ),
            1,
        )?;

        // let collection_mint_ata = [
        //     b"metadata",
        //     self.token_metadata_program.key().clone().as_ref(),
        //     self.plot_collection_mint.key().clone().as_ref(),
        // ];
        // let (edition_key, _) = Pubkey::find_program_address(&collection_mint_ata, program_id);

        mint_to(
            CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                MintTo {
                    mint: self.plot_collection_mint.to_account_info(),
                    to: self.farm_associated_plot_collection_account.to_account_info(),
                    authority: self.plot_mint_authority.to_account_info(),
                },
                &[&[b"farm_plot_authority", &[self.plot_mint_authority.bump]]],
            ),
            1,
        )?;

        // msg!("Current supply: {:?}", self.plot_mint);

        if (self.master_edition.data_len() == 0) {
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
                    &[&[b"farm_plot_authority", &[self.plot_mint_authority.bump][..]]],
                ),
                Some(0)
            )?;
        } else {
            // Already exists
        }


        verify_sized_collection_item(CpiContext::new_with_signer(
            self.token_metadata_program.to_account_info(),
            VerifySizedCollectionItem {
                metadata: self.metadata_account.to_account_info(),
                collection_authority: self.plot_mint_authority.to_account_info(),
                payer: self.user.to_account_info(),
                collection_mint: self.plot_collection_mint.to_account_info(),
                collection_metadata: self.plot_collection_metadata_account.to_account_info(),
                collection_master_edition: self.master_edition.to_account_info(),
            },
            &[&[b"farm_plot_authority", &[self.plot_mint_authority.bump][..]]],
            ),
        None
        )?;


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

        Ok(())
    }
}
