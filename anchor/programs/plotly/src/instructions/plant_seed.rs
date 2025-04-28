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
// use anchor_lang::system_program::{create_account, CreateAccount};
// use anchor_spl::token::{initialize_mint, InitializeMint, Mint as SplMint, Token as SplToken};
// use anchor_spl::token_interface::Mint;
// use mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder;
// use mpl_token_metadata::types::DataV2;
// use mpl_token_metadata::ID as TOKEN_METADATA_PROGRAM_ID;

use crate::errors::ErrorCode;
use crate::state::{AccWithBump, Farm, Plant, Plot, SeedMintInfo};

#[derive(Accounts)]
#[instruction(plot_x: u32, plot_y: u32, plot_currency: Pubkey)]
pub struct PlantSeed<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // value same as plot_currency
    // pub plot_currency_mint: InterfaceAccount<'info, MintInterface>,
    pub seed_mint: InterfaceAccount<'info, MintInterface>,

    // SEED
    #[account(
        seeds = [b"seed_mint_info", seed_mint.key().as_ref()],
        bump,
    )]
    pub seed_mint_info: Account<'info, SeedMintInfo>,

    // FARM

    #[account(
        seeds = [b"farm", plot_currency.as_ref()],
        bump,
    )]
    pub farm: Account<'info, Farm>,

    // PLOT

    // Create new mint account, NFTs have 0 decimals
    #[account(
        seeds = [b"plot_mint", &plot_x.to_le_bytes()[..], &plot_y.to_le_bytes()[..], farm.key().as_ref()],
        bump,
    )]
    pub plot_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"plot", plot_mint.key().as_ref()],
        bump,
    )]
    pub plot: Account<'info, Plot>,

    #[account(
        seeds = [b"plot_mint_authority", farm.key().as_ref()],
        bump,
    )]
    pub plot_mint_authority: Account<'info, AccWithBump>,

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
    #[account()]
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
    #[account()]
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
    pub plant: Account<'info, Plant>,

    // FARM PLOT ATA
    #[account(
        mut,
        associated_token::mint = plot_mint,
        associated_token::authority = farm_associated_plot_authority,
    )]
    pub farm_associated_plot_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"farm_associated_plot_authority", farm.key().as_ref()],
        bump,
    )]
    pub farm_associated_plot_authority: Account<'info, AccWithBump>,
    // Create associated token account, if needed
    // This is the account that will hold the NFT

    // USER SEED ATA
    #[account(
        mut,
        associated_token::mint = seed_mint,
        associated_token::authority = user,
    )]
    pub user_associated_seed_account: Account<'info, TokenAccount>,

    // FARM SEED ATA
    #[account(
        mut,
        associated_token::mint = seed_mint,
        associated_token::authority = farm_ata_seed_authority,
    )]
    pub farm_associated_seed_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"farm_ata_seed_authority", farm.key().as_ref(), seed_mint.key().as_ref()],
        bump,
    )]
    pub farm_ata_seed_authority: Account<'info, AccWithBump>,

    // USER PLOT ATA
    #[account(
        mut,
        associated_token::mint = plot_mint,
        associated_token::authority = user,
    )]
    pub user_associated_plot_account: Account<'info, TokenAccount>,

    // // USER PLOT CURRENCY ATA
    // #[account(
    //     mut,
    //     associated_token::mint = plot_currency,
    //     associated_token::authority = user,
    // )]
    // pub user_associated_plot_currency_account: Account<'info, TokenAccount>,

    // FARM PLOT CURRENCY ATA
    // #[account(
    //     mut,
    //     associated_token::mint = plot_currency,
    //     associated_token::authority = farm_associated_plot_currency_authority,
    // )]
    // pub farm_associated_plot_currency_account: Account<'info, TokenAccount>,

    // #[account(
    //     seeds = [b"farm_ata_plot_currency_auth", farm.key().as_ref()],
    //     bump,
    // )]
    // pub farm_associated_plot_currency_authority: Account<'info, AccWithBump>,

    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

const MAX_WATER: u32 = 1000000;
const WATER_30_THRESHOLD: u32 = 300000u32; // regen drops to 70% AT THIS VALUE and below
const WATER_10_THRESHOLD: u32 = 100000u32; // regen drops to 50% AT THIS VALUE and below

impl<'info> PlantSeed<'info> {
    pub fn plant_seed(&mut self, plot_x: u32, plot_y: u32, plot_currency: Pubkey, program_id: &Pubkey) -> Result<()> {
        msg!("Planting seed...");
        // user not owner
        if self.farm_associated_plot_account.amount == 1
            || self.user_associated_plot_account.amount == 0
        {
            return Err(ErrorCode::UserNotPlotOwner.into());
        }

        // can't plant on balance "dry" plot
        if self.plot.balance == 0 {
            return Err(ErrorCode::PlotHasZeroBalance.into());
        }

        msg!("Validation passed...");

        // if self.farm.plot_currency != self.plot_currency_mint.key() {
        //     return Err(ErrorCode::InvalidPlotCurrency.into());
        // }

        // // CHARGE USER FOR PLOT

        // let cpi_accounts = TransferChecked {
        //     mint: self.plot_currency_mint.to_account_info(),
        //     from: self.user_associated_plot_currency_account.to_account_info(),
        //     to: self.farm_associated_plot_currency_account.to_account_info(),
        //     authority: self.user.to_account_info(),
        // };

        // let cpi_program = self.token_program.to_account_info();

        // // If authority is a PDA, you can pass seeds in a signer context here

        // msg!("Transferring plot currency to farm...");

        // // TODO: hardcoding decimals, but will update later
        // token::transfer_checked(CpiContext::new(
        //     cpi_program,
        //     cpi_accounts,
        // // price should be scaled to decimals
        // ), self.farm.plot_price, 6)?;

        // TRANSFER PLOT (to farm)

        msg!("constructin Cpi accoutns");

        // Cross Program Invocation (CPI)
        // Invoking the mint_to instruction on the token program
        let cpi_accounts = TransferChecked {
            mint: self.plot_mint.to_account_info(),
            from: self.user_associated_plot_account.to_account_info(),
            to: self.farm_associated_plot_account.to_account_info(),
            authority: self.user.to_account_info(),
        };

        msg!("constructin Cpi program");
        let cpi_program = self.token_program.to_account_info();

        // If authority is a PDA, you can pass seeds in a signer context here

        msg!("Transferring plot NFT to farm...");

        token::transfer_checked(CpiContext::new(cpi_program, cpi_accounts), 1, 0)?;

        msg!("constructin Cpi accoutns seed");

        // TRANSFER SEEDS (to farm)
        let cpi_accounts = TransferChecked {
            mint: self.seed_mint.to_account_info(),
            from: self.user_associated_seed_account.to_account_info(),
            to: self.farm_associated_seed_account.to_account_info(),
            authority: self.user.to_account_info(),
        };

        msg!("constructin Cpi program seed");

        let cpi_program = self.token_program.to_account_info();

        // If authority is a PDA, you can pass seeds in a signer context here

        msg!("Transferring Seed token to farm...");

        token::transfer_checked(CpiContext::new(cpi_program, cpi_accounts), 1, 0)?;

        // RESET PLANT to new one

        msg!("cetner water: {:?}", self.plot.water);

        self.plant.seed_mint = self.seed_mint.key();

        self.plant.water = 0;
        self.plant.water_required =
            self.seed_mint_info.growth_block_duration * self.seed_mint_info.water_absorb_rate;
        self.plant.balance = 0;
        self.plant.balance_required = (self.seed_mint_info.growth_block_duration as u64)
            * self.seed_mint_info.balance_absorb_rate;

        self.plant.treasury = self.seed_mint_info.treasury;

        let current_block = Clock::get()?.slot;
        let blocks_passed = current_block - self.plot.last_update_block;

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
            blocks_passed
        );

        // Update the water level
        self.plot.water = current_plot_water_res.5;
        self.plot.right_plant_water_collected += current_plot_water_res.0;
        self.plot.left_plant_water_collected += current_plot_water_res.1;
        self.plot.up_plant_water_collected += current_plot_water_res.2;
        self.plot.down_plant_water_collected += current_plot_water_res.3;
        // ceneter plant has just been planted
        self.plot.center_plant_water_collected = 0;

        self.plot.center_plant_drain_rate = 100 - (self.plant.neighbor_drain_ratio * 4);

        // TODO: add limitation so that collected water wouldn't cross u32::MAX

        // Update water neighbors and water before updating regeneration

        // HANDLE NEIGHBORS

        msg!("Handling neighbors...");
        if (plot_y > 0) {

            let (expected_mint_up, _bump) = Pubkey::find_program_address(
                &[
                    b"plot_mint", &plot_x.to_le_bytes()[..], &(plot_y - 1).to_le_bytes()[..], self.farm.key().as_ref()
                ],
                program_id,
            );

            msg!("Expected mint up: {:?}", expected_mint_up);
            msg!("Mint up: {:?}", self.plot_mint_up.key());

            if self.plot_mint_up.key() != expected_mint_up {
                return Err(ErrorCode::InvalidNeighborPlotMint.into());
            }

            let (expected_plot_up, _bump) = Pubkey::find_program_address(
                &[b"plot", self.plot_mint_up.key().as_ref()],
                program_id,
            );

            if self.plot_up.key() != expected_plot_up {
                return Err(ErrorCode::InvalidNeighborPlot.into());
            }

            msg!("Plot up data is empty: {:?}", self.plot_up.data_is_empty());
            msg!("Plot up data len: {:?}", self.plot_up.data_len());

            // let plot_data = Plot::try_from_slice(&self.plot_up.data.borrow())?;
            let data = self.plot_up.data.borrow();
            let plot = Plot::try_deserialize_unchecked(&mut &data[..])?;
            msg!("UP plot data: {:?}", plot.water);

        //     self.plot_up.water_regen = self.plot_up.water + self.plot.water_regen;
        }

        // HANDLE CENTER

        msg!("Plot minted x:{} y:{}", plot_x, plot_y);
        msg!("New claimer {}", self.user.key());

        self.plot.last_claimer = self.user.key();
        self.plot.water_regen = self.plot.water_regen - 5; // default regen rate

        // FEE is 0.1%
        self.plot.balance = (self.farm.plot_price as f64 * 0.999) as u64;

        Ok(())
    }
}


// returns water collected for each plant in order
// right, left, up, down, center
// and the new water level
pub fn get_plot_water_collected(
    right_drain_rate: u32,
    left_drain_rate: u32,
    up_drain_rate: u32,
    down_drain_rate: u32,
    center_drain_rate: u32,
    water: u32,
    base_water_regen: i32,
    block_passed: u64,
) -> (u32, u32, u32, u32, u32, u32) {
    // WATER LEVEL [100%; 30%) 
    
    if water > WATER_30_THRESHOLD {
        let water_regen = base_water_regen
            - right_drain_rate as i32
            - left_drain_rate as i32
            - up_drain_rate as i32
            - down_drain_rate as i32
            - center_drain_rate as i32;

        // if water is not droping and leve is above 30% threashold
        if (water_regen >= 0) {
            return (
                right_drain_rate * block_passed as u32,
                left_drain_rate * block_passed as u32,
                up_drain_rate * block_passed as u32,
                down_drain_rate * block_passed as u32,
                center_drain_rate * block_passed as u32,
                if water as u64 + (water_regen as u64 * block_passed as u64) > MAX_WATER as u64 {
                    MAX_WATER
                } else {
                    water + (water_regen as u32 * block_passed as u32)
                },
            );
        }

        let negative_water_regen_abs = water_regen.abs() as u32;

        let blocks_above_30_threashold = ((water - WATER_30_THRESHOLD) / negative_water_regen_abs).max(1) as u32;

        // water is dropping but still always above 30%
        if blocks_above_30_threashold > block_passed as u32 {
            return (
                right_drain_rate * block_passed as u32,
                left_drain_rate * block_passed as u32,
                up_drain_rate * block_passed as u32,
                down_drain_rate * block_passed as u32,
                center_drain_rate * block_passed as u32,
                if (negative_water_regen_abs as u64 * block_passed as u64) > water as u64 {
                    0
                } else {
                    water - (negative_water_regen_abs * block_passed as u32)
                },
            );
        }

        // water drops below 30%
        let new_water_level = water - (blocks_above_30_threashold * negative_water_regen_abs);

        // fn handles all calculation below 30% water level
        return get_plot_water_collected(
            right_drain_rate,
            left_drain_rate,
            up_drain_rate,
            down_drain_rate,
            center_drain_rate,
            new_water_level,
            base_water_regen,
            block_passed - blocks_above_30_threashold as u64,
        );
    }


    // WATER LEVEL [30%; 10%) 


    if water <= WATER_30_THRESHOLD && water > WATER_10_THRESHOLD {

        // water is now at 70% regen capacity
        let water_regen = (base_water_regen * 70 / 100)
            - right_drain_rate as i32
            - left_drain_rate as i32
            - up_drain_rate as i32
            - down_drain_rate as i32
            - center_drain_rate as i32;

        // water is at an equilibrium
        if (water_regen == 0) {
            return (
                right_drain_rate * block_passed as u32,
                left_drain_rate * block_passed as u32,
                up_drain_rate * block_passed as u32,
                down_drain_rate * block_passed as u32,
                center_drain_rate * block_passed as u32,
                water,
            );
        }

        if (water_regen > 0) {
            let blocks_until_30_theashold =
                // +1 because full regen is at > WATER_30_THRESHOLD 
                (((WATER_30_THRESHOLD + 1) - water) / water_regen as u32).max(1) as u32;

            // water is rising doesn't reach > WATER_30_THRESHOLD
            if (blocks_until_30_theashold > block_passed as u32) {
                return (
                    right_drain_rate * block_passed as u32,
                    left_drain_rate * block_passed as u32,
                    up_drain_rate * block_passed as u32,
                    down_drain_rate * block_passed as u32,
                    center_drain_rate * block_passed as u32,
                    if water as u64 + (water_regen as u64 * block_passed as u64) > MAX_WATER as u64 {
                        MAX_WATER
                    } else {
                        water + (water_regen as u32 * block_passed as u32)
                    },
                );
            }

            // water is rising and reaches > WATER_30_THRESHOLD
            let new_water_level = water + (blocks_until_30_theashold * water_regen as u32);

            // will handle the rest of the blocks
            return get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                new_water_level,
                base_water_regen,
                block_passed - blocks_until_30_theashold as u64,
            );
        }

        if (water_regen < 0) {
            let blocks_until_10_threashold =
                ((water - WATER_10_THRESHOLD) / water_regen.abs() as u32).max(1) as u32;

            // water is dropping but still always above 30%
            if blocks_until_10_threashold > block_passed as u32 {
                return (
                    right_drain_rate * block_passed as u32,
                    left_drain_rate * block_passed as u32,
                    up_drain_rate * block_passed as u32,
                    down_drain_rate * block_passed as u32,
                    center_drain_rate * block_passed as u32,
                    if (water_regen.abs() as u64 * block_passed as u64) > water as u64 { // THIS SHOULD NEVER HAPPEN
                        msg!("Water SKIPPED 10% THRESHOLD!!!");
                        0
                    } else {
                        water - (water_regen.abs() as u32 * block_passed as u32)
                    },
                );
            }

            // water drops to 10% or below
            let new_water_level = water - (blocks_until_10_threashold * water_regen.abs() as u32);

            // fn handles all calculation below 10% water level
            return get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                new_water_level,
                base_water_regen,
                block_passed - blocks_until_10_threashold as u64,
            );
        }
    }

    // WATER LEVEL [10%; 0%] 

    if water <= WATER_10_THRESHOLD {

        // water is now at 50% regen capacity
        let water_regen = (base_water_regen * 50 / 100)
            - right_drain_rate as i32
            - left_drain_rate as i32
            - up_drain_rate as i32
            - down_drain_rate as i32
            - center_drain_rate as i32;

        // water generation is at an equilibrium
        if (water_regen == 0) {
            return (
                right_drain_rate * block_passed as u32,
                left_drain_rate * block_passed as u32,
                up_drain_rate * block_passed as u32,
                down_drain_rate * block_passed as u32,
                center_drain_rate * block_passed as u32,
                water,
            );
        }

        if water_regen > 0 {
            let blocks_until_10_threashold =
                // +1 because full regen is at > WATER_30_THRESHOLD 
                (((WATER_10_THRESHOLD + 1) - water) / water_regen as u32).max(1) as u32;

            // water is rising doesn't reach > WATER_10_THRESHOLD
            if (blocks_until_10_threashold > block_passed as u32) {
                return (
                    right_drain_rate * block_passed as u32,
                    left_drain_rate * block_passed as u32,
                    up_drain_rate * block_passed as u32,
                    down_drain_rate * block_passed as u32,
                    center_drain_rate * block_passed as u32,
                    if water as u64 + (water_regen as u64 * block_passed as u64) > MAX_WATER as u64 { // THIS SHOULD NEVER HAPPEN
                        msg!("Water SKIPPED to 30% THRESHOLD!!!");
                        MAX_WATER
                    } else {
                        water + (water_regen as u32 * block_passed as u32)
                    },
                );
            }

            // water is rising and reaches > WATER_10_THRESHOLD
            let new_water_level = water + (blocks_until_10_threashold * water_regen as u32);

            // will handle the rest of the blocks
            return get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                new_water_level,
                base_water_regen,
                block_passed - blocks_until_10_threashold as u64,
            );
        }

        // water is below 10% and dropping
        // if (water_regen < 0) {
        //     // water only collects if ALL rates are satisfied (water is divisible by a sum of all rates)

        //     // no rounding up because if there are no more "full" blocks
        //     // the water has to be accumulated until the rate condition is satisfied
            
        //     let blocks_until_0_threashold =
        //         ((water) / water_regen.abs() as u32) as u32;

        //     if (blocks_until_0_threashold == 0) {
        //         // not enough water to collect
        //         return (
        //             0,
        //             0,
        //             0,
        //             0,
        //             0,
        //             water + (base_water_regen as u32 * 50 / 100), // water accumulates until collection possible
        //         );
        //     }

        //     return (
        //         right_drain_rate * blocks_until_0_threashold as u32,
        //         left_drain_rate * blocks_until_0_threashold as u32,
        //         up_drain_rate * blocks_until_0_threashold as u32,
        //         down_drain_rate * blocks_until_0_threashold as u32,
        //         center_drain_rate * blocks_until_0_threashold as u32,
        //         water - (water_regen.abs() as u32 * blocks_until_0_threashold as u32)
        //     );
        // }
    }


    // let plot_water_collected = (
    //     plot.right_plant_water_collected,
    //     plot.left_plant_water_collected,
    //     plot.up_plant_water_collected,
    //     plot.down_plant_water_collected,
    //     plot.center_plant_water_collected,
    // );

    // err!(ErrorCode::WaterCalculationError.into())

    msg!("WATER CALCULATION ERROR!!!");
    return (0, 0, 0, 0, 0, water); // TODO: this should never happen
}