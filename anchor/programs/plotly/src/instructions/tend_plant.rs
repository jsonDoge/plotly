use anchor_lang::{accounts::program, prelude::*};
use anchor_spl::token_interface::{Mint as MintInterface, TokenAccount as TokenAccountInterface};
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
use crate::helpers::{get_balance_collected, get_plot_water_collected};
use crate::state::{AccWithBump, Plant, Plot};
use crate::{errors::ErrorCode, state::Farm};

#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32, plot_currency: Pubkey)]
pub struct TendPlant<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // value same as plot_currency
    pub plot_currency_mint: Box<InterfaceAccount<'info, MintInterface>>,

    #[account(
        seeds = [b"farm", plot_currency.as_ref()],
        bump,
    )]
    pub farm: Box<Account<'info, Farm>>,

    // PLOT

    // Create new mint account, NFTs have 0 decimals
    #[account(
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
        init_if_needed,
        payer = user,
        seeds = [b"plant", plot_mint.key().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<Plant>(),
    )]
    pub plant: Box<Account<'info, Plant>>,

    // Farm plot currency TREASURY
    #[account(
        mut,
        associated_token::mint = plot_currency_mint,
        associated_token::authority = farm_auth,
    )]
    pub farm_associated_plot_currency_account: Box<Account<'info, TokenAccount>>,

    // Treasury - plot currecncy ATA
    #[account(
        mut,
    )]
    pub plant_treasury: Box<Account<'info, TokenAccount>>,

    // farm auth
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

// updates plant/plot balances.
// updates plant water, plot and surrounding plots water.
// sends absorbed balance to treasury
impl<'info> TendPlant<'info> {
    pub fn tend_plant(
        &mut self,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
        program_id: &Pubkey,
    ) -> Result<()> {
        if self.plant.treasury != self.plant_treasury.key() {
            return Err(ErrorCode::InvalidTreasury.into());
        }

        if self.plot.last_claimer != self.user.key() {
            return Err(ErrorCode::UserNotPlotOwner.into());
        }

        msg!("times tended {}", self.plant.times_tended);
        msg!("times to tend {}", self.plant.times_to_tend);

        if self.plant.times_tended >= self.plant.times_to_tend {
            return Err(ErrorCode::PlantReachedMaxTend.into());
        }

        // tends devide the balance into +1 periods of balance |___T___T___| <- for 2 tends we have 3 periods
        let balance_per_tend = self.plant.balance_required / (self.plant.times_to_tend + 1) as u64;
        let current_block = Clock::get()?.slot;

        let blocks_passed = current_block - self.plot.last_update_block;

        if blocks_passed == 0 {
            return Err(ErrorCode::NoBlocksPassed.into());
        }

        msg!("balance_per_tend {} plot balance {} plant balance {}", balance_per_tend, self.plot.balance, self.plant.balance);

        let updated_balance = get_balance_collected(
            self.plant.balance,
            self.plot.balance,
            self.plant.balance_absorb_rate,
            balance_per_tend,
            self.plant.times_tended,
            self.plant.times_to_tend,
            self.plant.balance_required - self.plant.balance,
            blocks_passed,
        );

        self.plant.balance += updated_balance.0;
        self.plot.balance = updated_balance.1;

        let balance_blocks_absorbed = updated_balance.2;

        msg!("blocks absorbed {} blocks passed: {} balance_required {}", balance_blocks_absorbed, blocks_passed, self.plant.balance_required);
        if balance_blocks_absorbed < blocks_passed && self.plot.balance < BASE_BALANCE_FREE_RENT {
            let farm_rent_drain = blocks_passed - balance_blocks_absorbed; // currently draining at 1 lamport per block
            let drained_balance = if farm_rent_drain > self.plot.balance { self.plot.balance } else { farm_rent_drain };
            self.plot.balance -= drained_balance;
        }

        // 25% of the balance required for the next tend
        let tending_allowed_balance_buffer = balance_per_tend / 4;

        let next_tend_balance_at = (self.plant.times_tended + 1) as u64 * balance_per_tend;
        let next_tend_allowed_from = next_tend_balance_at - tending_allowed_balance_buffer;

        if self.plant.balance < next_tend_allowed_from {
            return Err(ErrorCode::TooEarlyToTend.into());
        }

        self.plant.times_tended += 1;

        // SENDING BALANCE TO TREASURY

        let balance_to_send = self.plant.balance - self.plant.treasury_received_balance;

        msg!("Sending balance to treasury: {}", balance_to_send);

        let cpi_accounts = TransferChecked {
            mint: self.plot_currency_mint.to_account_info(),
            from: self.farm_associated_plot_currency_account.to_account_info(),
            to: self.plant_treasury.to_account_info(),
            authority: self.farm_auth.to_account_info(),
        };

        let cpi_program = self.token_program.to_account_info();

        // If authority is a PDA, you can pass seeds in a signer context here

        msg!("Sending balance to treasury 2: {}", balance_to_send);

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
        msg!("Balance sent: {}");


        self.plant.treasury_received_balance = self.plant.balance;

        // UPDATE water to match plant update

        // UPDATE CENTER

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

        self.plot.last_update_block = current_block;

        // TODO: add limitation so that collected water wouldn't cross u32::MAX

        // Update water neighbors and water before updating regeneration

        // HANDLE NEIGHBORS

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
            total_water_collected += plot.down_plant_water_collected + water_updated_res.3;

            plot.water = water_updated_res.5;
            plot.right_plant_water_collected += water_updated_res.0;
            plot.left_plant_water_collected += water_updated_res.1;
            plot.up_plant_water_collected += water_updated_res.2;
            plot.down_plant_water_collected = 0;
            plot.center_plant_water_collected += water_updated_res.4;


            plot.last_update_block = current_block;
            plot.try_serialize(&mut &mut self.plot_up.data.borrow_mut()[..])?;
        }

        if plot_y < 999 {
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


            plot.last_update_block = current_block;
            let mut plot = Plot::try_deserialize(&mut &self.plot_left.data.borrow()[..])?;
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


            plot.last_update_block = current_block;
            plot.try_serialize(&mut &mut self.plot_right.data.borrow_mut()[..])?;
        }

        self.plant.water = self.plant.water + total_water_collected;
        self.plant.last_update_block = current_block;

        msg!("POST TEND: Plant water: {}", self.plant.water);
        msg!("POST TEND: Plant balance: {}", self.plant.balance);
        msg!("TENDING: current_block: {:?}", current_block);

        Ok(())
    }
}
