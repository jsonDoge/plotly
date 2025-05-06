use anchor_lang::{accounts::program, prelude::*};
use anchor_spl::token_interface::Mint as MintInterface;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        verify_sized_collection_item, CreateMasterEditionV3, CreateMetadataAccountsV3,
        MasterEditionAccount, Metadata, MetadataAccount, VerifySizedCollectionItem,
    },
    token::{
        self, mint_to,
        spl_token::{self, instruction::transfer},
        Mint, MintTo, SetAuthority, Token, TokenAccount, Transfer, TransferChecked,
    },
};
use mpl_token_metadata::types::{Collection, CollectionDetails, Creator};

use crate::constants::BASE_BALANCE_FREE_RENT;
use crate::events::SeedHarvested;
use crate::farm;
use crate::helpers::{get_balance_collected, get_plot_water_collected};
use crate::state::{AccWithBump, Plant, Plot, SeedMintInfo};
use crate::{errors::ErrorCode, state::Farm};

// IF PLOT BALANCE IS < 10% OF FREE RENT
// revert plant to seed and send to last_claimer (if plant still exists)
// send left-over plot currency to revoker
// reset plot to default state - 0 balance, last_claimer = farm_auth
#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32)]
pub struct RevokePlot<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // value same as plot_currency
    pub plot_currency_mint: Box<InterfaceAccount<'info, MintInterface>>,
    pub seed_mint: Box<InterfaceAccount<'info, MintInterface>>,

    // Treasury - plot currecncy ATA
    #[account(mut)]
    pub plant_treasury: Box<Account<'info, TokenAccount>>,

    // SEED
    // #[account(
    //     seeds = [b"seed_mint_info", seed_mint.key().as_ref()],
    //     bump,
    // )]
    // pub seed_mint_info: Box<Account<'info, SeedMintInfo>>,

    // FARM
    #[account(
        seeds = [b"farm", plot_currency_mint.key().as_ref()],
        bump,
    )]
    pub farm: Box<Account<'info, Farm>>,

    // PLOT

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
    pub plot_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [b"plot", plot_mint.key().as_ref()],
        bump,
    )]
    pub plot: Box<Account<'info, Plot>>,

    // NEIGHBORING PLOTS

    // UP
    /// CHECK: mint existance
    #[account()]
    pub plot_mint_up: UncheckedAccount<'info>,

    // #[account(
    //     mut,
    //     seeds = [b"plot", plot_mint_up.key().as_ref()],
    //     bump,
    // )]
    /// CHECK: mint existance
    #[account(mut)]
    pub plot_up: UncheckedAccount<'info>,

    // RIGHT
    /// CHECK: mint existance
    #[account()]
    pub plot_mint_right: UncheckedAccount<'info>,

    // #[account(
    //     mut,
    //     seeds = [b"plot", plot_mint_right.key().as_ref()],
    //     bump,
    // )]
    /// CHECK: mint existance
    #[account(mut)]
    pub plot_right: UncheckedAccount<'info>,

    // DOWN
    /// CHECK: mint existance
    #[account()]
    pub plot_mint_down: UncheckedAccount<'info>,

    // #[account(
    //     mut,
    //     seeds = [b"plot", plot_mint_down.key().as_ref()],
    //     bump,
    // )]
    /// CHECK: mint existance
    #[account(mut)]
    pub plot_down: UncheckedAccount<'info>,

    // LEFT
    /// CHECK: mint existance
    #[account()]
    pub plot_mint_left: UncheckedAccount<'info>,

    // #[account(
    //     mut,
    //     seeds = [b"plot", plot_mint_left.key().as_ref()],
    //     bump,
    // )]
    /// CHECK: mint existance
    #[account(mut)]
    pub plot_left: UncheckedAccount<'info>,

    // PLANT
    #[account(
        mut,
        seeds = [b"plant", plot_mint.key().as_ref()],
        bump,
    )]
    pub plant: Box<Account<'info, Plant>>,

    // Create associated token account, if needed
    // This is the account that will hold the NFT
    // #[account(
    //     init_if_needed,
    //     payer = user,
    //     associated_token::mint = plot_mint,
    //     associated_token::authority = user,
    // )]
    // pub user_associated_plot_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = plot_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_account: Box<Account<'info, TokenAccount>>,

    // User plot currency account
    #[account(
        mut,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = user,
    )]
    pub user_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    // Farm plot currency TREASURY
    #[account(
        mut,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    // USER SEED ATA
    #[account(
            mut,
            associated_token::mint = seed_mint,
            associated_token::authority = plot.last_claimer,
        )]
    pub last_claimer_associated_seed_account: Box<Account<'info, TokenAccount>>,

    // FARM SEED ATA
    #[account(
            mut,
            associated_token::mint = seed_mint,
            associated_token::authority = farm_auth,
        )]
    pub farm_associated_seed_account: Box<Account<'info, TokenAccount>>,

    // PDA authority
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

impl<'info> RevokePlot<'info> {
    pub fn revoke_plot(&mut self, plot_x: u32, plot_y: u32, program_id: &Pubkey) -> Result<()> {
        // either has the NFT or has a low-balance on it (last_claimer + farm ownership + NO PLANT)

        if self.farm_associated_plot_account.amount != 1 {
            return Err(ErrorCode::FarmDoesntOwnPlotMint.into());
        }

        // there is still a plant on it
        if self.plant.seed_mint != Pubkey::default() {
            // revert to seed and give it back to the last owner
            // TODO: copy paste revert plant code

            let current_block = Clock::get()?.slot;
            let blocks_passed = current_block - self.plot.last_update_block;

            // Update BALANCE

            let balance_per_tend =
                self.plant.balance_required / (self.plant.times_to_tend + 1) as u64;
            let new_balance_stats = get_balance_collected(
                self.plant.balance,
                self.plot.balance,
                self.plant.balance_absorb_rate,
                balance_per_tend,
                self.plant.times_tended,
                self.plant.times_to_tend,
                self.plant.balance_required - self.plant.balance,
                blocks_passed,
            );

            self.plant.balance += new_balance_stats.0;
            self.plot.balance = new_balance_stats.1;

            let balance_blocks_absorbed = new_balance_stats.2;

            if balance_blocks_absorbed < blocks_passed && self.plot.balance < BASE_BALANCE_FREE_RENT
            {
                let farm_rent_drain = blocks_passed - balance_blocks_absorbed; // currently draining at 1 lamport per block
                let drained_balance = if farm_rent_drain > self.plot.balance {
                    self.plot.balance
                } else {
                    farm_rent_drain
                };
                self.plot.balance -= drained_balance;
            }

            // UPDATE CENTER PLOT

            msg!("Calculating water for center...");

            let current_plot_water_res = get_plot_water_collected(
                self.plot.right_plant_drain_rate,
                self.plot.left_plant_drain_rate,
                self.plot.up_plant_drain_rate,
                self.plot.down_plant_drain_rate,
                self.plot.center_plant_drain_rate,
                self.plot.water,
                self.plot.water_regen,
                blocks_passed,
            );

            let mut total_water_collected =
                self.plot.center_plant_water_collected + current_plot_water_res.4;

            // Update the water level
            self.plot.water = current_plot_water_res.5;
            self.plot.right_plant_water_collected += current_plot_water_res.0;
            self.plot.left_plant_water_collected += current_plot_water_res.1;
            self.plot.up_plant_water_collected += current_plot_water_res.2;
            self.plot.down_plant_water_collected += current_plot_water_res.3;
            // ceneter plant has just been planted

            self.plot.center_plant_water_collected = 0;
            self.plot.center_plant_drain_rate = 0;

            self.plot.last_update_block = current_block;

            // UPDATEING SURROUNDING PLOTS

            msg!("Handling neighbors...");
            if (plot_y > 0) {
                let (expected_mint, _bump) = Pubkey::find_program_address(
                    &[
                        b"plot_mint",
                        &plot_x.to_le_bytes()[..],
                        &(plot_y - 1).to_le_bytes()[..],
                        self.farm.key().as_ref(),
                    ],
                    program_id,
                );

                msg!("Expected mint up: {:?}", expected_mint);
                msg!("Mint up: {:?}", self.plot_mint_up.key());

                if self.plot_mint_up.key() != expected_mint {
                    return Err(ErrorCode::InvalidNeighborPlotMint.into());
                }

                let (expected_plot, _bump) = Pubkey::find_program_address(
                    &[b"plot", self.plot_mint_up.key().as_ref()],
                    program_id,
                );

                if self.plot_up.key() != expected_plot {
                    return Err(ErrorCode::InvalidNeighborPlot.into());
                }

                let mut plot = Plot::try_deserialize(&mut &self.plot_up.data.borrow()[..])?;

                let blocks_passed: u64 = current_block - plot.last_update_block;

                let water_updated_res = get_plot_water_collected(
                    plot.right_plant_drain_rate,
                    plot.left_plant_drain_rate,
                    plot.up_plant_drain_rate,
                    plot.down_plant_drain_rate,
                    plot.center_plant_drain_rate,
                    plot.water,
                    plot.water_regen,
                    blocks_passed,
                );
                total_water_collected += plot.down_plant_water_collected + water_updated_res.3;

                plot.water = water_updated_res.5;
                plot.right_plant_water_collected += water_updated_res.0;
                plot.left_plant_water_collected += water_updated_res.1;
                plot.up_plant_water_collected += water_updated_res.2;
                plot.down_plant_water_collected = 0;
                plot.center_plant_water_collected += water_updated_res.4;

                plot.down_plant_drain_rate = 0;

                plot.last_update_block = current_block;

                plot.try_serialize(&mut &mut self.plot_up.data.borrow_mut()[..])?;
            }

            if (plot_y < 999) {
                let (expected_mint, _bump) = Pubkey::find_program_address(
                    &[
                        b"plot_mint",
                        &plot_x.to_le_bytes()[..],
                        &(plot_y + 1).to_le_bytes()[..],
                        self.farm.key().as_ref(),
                    ],
                    program_id,
                );

                msg!("Expected mint down: {:?}", expected_mint);
                msg!("Mint down: {:?}", self.plot_mint_down.key());

                if self.plot_mint_down.key() != expected_mint {
                    return Err(ErrorCode::InvalidNeighborPlotMint.into());
                }

                let (expected_plot, _bump) = Pubkey::find_program_address(
                    &[b"plot", self.plot_mint_down.key().as_ref()],
                    program_id,
                );

                if self.plot_down.key() != expected_plot {
                    return Err(ErrorCode::InvalidNeighborPlot.into());
                }

                let mut plot = Plot::try_deserialize(&mut &self.plot_down.data.borrow()[..])?;

                let blocks_passed = current_block - plot.last_update_block;

                let water_updated_res = get_plot_water_collected(
                    plot.right_plant_drain_rate,
                    plot.left_plant_drain_rate,
                    plot.up_plant_drain_rate,
                    plot.down_plant_drain_rate,
                    plot.center_plant_drain_rate,
                    plot.water,
                    plot.water_regen,
                    blocks_passed,
                );
                total_water_collected += plot.up_plant_water_collected + water_updated_res.2;

                plot.water = water_updated_res.5;

                plot.right_plant_water_collected += water_updated_res.0;
                plot.left_plant_water_collected += water_updated_res.1;
                plot.up_plant_water_collected = 0;
                plot.down_plant_water_collected += water_updated_res.3;
                plot.center_plant_water_collected += water_updated_res.4;

                plot.up_plant_drain_rate = 0;

                plot.last_update_block = current_block;

                plot.try_serialize(&mut &mut self.plot_down.data.borrow_mut()[..])?;
            }

            if plot_x > 0 {
                let (expected_mint, _bump) = Pubkey::find_program_address(
                    &[
                        b"plot_mint",
                        &(plot_x - 1).to_le_bytes()[..],
                        &(plot_y).to_le_bytes()[..],
                        self.farm.key().as_ref(),
                    ],
                    program_id,
                );

                msg!("Expected mint left: {:?}", expected_mint);
                msg!("Mint left: {:?}", self.plot_mint_left.key());

                if self.plot_mint_left.key() != expected_mint {
                    return Err(ErrorCode::InvalidNeighborPlotMint.into());
                }

                let (expected_plot, _bump) = Pubkey::find_program_address(
                    &[b"plot", self.plot_mint_left.key().as_ref()],
                    program_id,
                );

                if self.plot_left.key() != expected_plot {
                    return Err(ErrorCode::InvalidNeighborPlot.into());
                }

                let mut plot = Plot::try_deserialize(&mut &self.plot_left.data.borrow()[..])?;

                let blocks_passed = current_block - plot.last_update_block;

                let water_updated_res = get_plot_water_collected(
                    plot.right_plant_drain_rate,
                    plot.left_plant_drain_rate,
                    plot.up_plant_drain_rate,
                    plot.down_plant_drain_rate,
                    plot.center_plant_drain_rate,
                    plot.water,
                    plot.water_regen,
                    blocks_passed,
                );
                total_water_collected += plot.right_plant_water_collected + water_updated_res.0;

                plot.water = water_updated_res.5;

                plot.right_plant_water_collected = 0;
                plot.left_plant_water_collected += water_updated_res.1;
                plot.up_plant_water_collected += water_updated_res.2;
                plot.down_plant_water_collected += water_updated_res.3;
                plot.center_plant_water_collected += water_updated_res.4;

                plot.right_plant_drain_rate = 0;

                plot.last_update_block = current_block;

                plot.try_serialize(&mut &mut self.plot_left.data.borrow_mut()[..])?;
            }

            if plot_x < 999 {
                let (expected_mint, _bump) = Pubkey::find_program_address(
                    &[
                        b"plot_mint",
                        &(plot_x + 1).to_le_bytes()[..],
                        &plot_y.to_le_bytes()[..],
                        self.farm.key().as_ref(),
                    ],
                    program_id,
                );

                msg!("Expected mint right: {:?}", expected_mint);
                msg!("Mint right: {:?}", self.plot_mint_right.key());

                if self.plot_mint_right.key() != expected_mint {
                    return Err(ErrorCode::InvalidNeighborPlotMint.into());
                }

                let (expected_plot, _bump) = Pubkey::find_program_address(
                    &[b"plot", self.plot_mint_right.key().as_ref()],
                    program_id,
                );

                if self.plot_right.key() != expected_plot {
                    return Err(ErrorCode::InvalidNeighborPlot.into());
                }

                let mut plot = Plot::try_deserialize(&mut &self.plot_right.data.borrow()[..])?;

                let blocks_passed = current_block - plot.last_update_block;

                let water_updated_res = get_plot_water_collected(
                    plot.right_plant_drain_rate,
                    plot.left_plant_drain_rate,
                    plot.up_plant_drain_rate,
                    plot.down_plant_drain_rate,
                    plot.center_plant_drain_rate,
                    plot.water,
                    plot.water_regen,
                    blocks_passed,
                );
                total_water_collected += plot.left_plant_water_collected + water_updated_res.1;

                plot.water = water_updated_res.5;

                plot.right_plant_water_collected += water_updated_res.0;
                plot.left_plant_water_collected = 0;
                plot.up_plant_water_collected += water_updated_res.2;
                plot.down_plant_water_collected += water_updated_res.3;
                plot.center_plant_water_collected += water_updated_res.4;

                plot.left_plant_drain_rate = 0;

                plot.last_update_block = current_block;
                plot.try_serialize(&mut &mut self.plot_right.data.borrow_mut()[..])?;
            }

            //  REVERT PLANT TO SEED and send back to user

            msg!("Transferring reverted plant SEED tokens to the ORIGINAL user...");

            let cpi_accounts = TransferChecked {
                mint: self.seed_mint.to_account_info(),
                from: self.farm_associated_seed_account.to_account_info(),
                to: self.last_claimer_associated_seed_account.to_account_info(),
                authority: self.farm_auth.to_account_info(),
            };

            let cpi_program = self.token_program.to_account_info();

            // If authority is a PDA, you can pass seeds in a signer context here

            token::transfer_checked(
                CpiContext::new_with_signer(
                    cpi_program,
                    cpi_accounts,
                    &[&[
                        b"farm_auth",
                        self.farm.key().as_ref(),
                        &[self.farm_auth.bump][..],
                    ]],
                    // price should be scaled to decimals
                ),
                1,
                0,
            )?;

            // SENDING what plant absorbed of Plant BALANCE TO plant TREASURY

            msg!("Transferring whatever plant absorbed to treasury...");

            let balance_to_send = self.plant.balance - self.plant.treasury_received_balance;

            let cpi_accounts = TransferChecked {
                mint: self.plot_currency_mint.to_account_info(),
                from: self.farm_associated_plot_currency_account.to_account_info(),
                to: self.plant_treasury.to_account_info(),
                authority: self.farm_auth.to_account_info(),
            };

            let cpi_program = self.token_program.to_account_info();

            // If authority is a PDA, you can pass seeds in a signer context here

            // TODO: store plot currency decimals in the farm
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
                balance_to_send,
                6,
            )?;

            // RESET PLANT to zero values

            self.plant.seed_mint = Pubkey::default();
            self.plant.water = 0;
            self.plant.water_required = 0;
            self.plant.balance = 0;
            self.plant.balance_required = 0;
            self.plant.times_tended = 0;
            self.plant.times_to_tend = 0;
            self.plant.neighbor_water_drain_rate = 0;
            self.plant.last_update_block = 0;
            self.plant.treasury = Pubkey::default();
            self.plant.treasury_received_balance = 0;
            // bump doesn't change because plants <> plot one to one

            emit!(SeedHarvested {
                seed_id: self.seed_mint.key(),
            });
        } else {
            // if no plant check if rent was free
            if self.plot.balance < BASE_BALANCE_FREE_RENT {
                let current_block = Clock::get()?.slot;
                let blocks_passed = current_block - self.plot.last_update_block;

                let farm_rent_drain = blocks_passed;
                let drained_balance = if farm_rent_drain > self.plot.balance {
                    self.plot.balance
                } else {
                    farm_rent_drain
                };
                self.plot.balance -= drained_balance;
            }
        }

        // if plot balance is less than 10% of free rent, then it's up for grabs
        if self.plot.balance > self.plot.balance_free_rent / 10 {
            return Err(ErrorCode::PlotStillHasBalance.into());
        }

        // Transfer left-over balance to revoker

        if (self.plot.balance > 0) {
            msg!("Sending balance to revoker: {}", self.plot.balance);

            let cpi_accounts = TransferChecked {
                mint: self.plot_currency_mint.to_account_info(),
                from: self.farm_associated_plot_currency_account.to_account_info(),
                to: self.user_associated_plot_currency_account.to_account_info(),
                authority: self.farm_auth.to_account_info(),
            };

            let cpi_program = self.token_program.to_account_info();

            // If authority is a PDA, you can pass seeds in a signer context here

            // TODO: store plot currency decimals in the farm
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
                self.plot.balance,
                6,
            )?;
        }

        // RESET PLOT

        self.plot.balance = 0;
        self.plot.last_claimer = self.farm_auth.key();

        // last update block is updated after center water update

        Ok(())
    }
}
