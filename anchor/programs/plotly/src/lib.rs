#![allow(warnings)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod constants;
pub mod helpers;

use instructions::*;

declare_id!("FQH8xLxebgWgTkxhyWDSfb4b68ZoW1newgSKMNXgQj4c");

#[program]
pub mod farm {
    use super::*;

    // returns farm address
    pub fn initialize_farm(
        ctx: Context<InitializeFarm>,
        plot_currency: Pubkey,
        plot_price: u64,
    ) -> Result<Pubkey> {
        ctx.accounts.initialize_farm(
            &plot_currency,
            plot_price,
            ctx.bumps.farm,
            ctx.bumps.farm_auth,
            ctx.program_id,
        )
    }

    // PLOTS

    // returns plot mint address
    pub fn mint_plot(
        ctx: Context<MintPlot>,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
    ) -> Result<Pubkey> {
        ctx.accounts.mint_plot(
            plot_x,
            plot_y,
            plot_currency,
            ctx.program_id,
            ctx.bumps.plot,
        )
    }

    pub fn acquire_plot(
        ctx: Context<AcquirePlot>,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
    ) -> Result<()> {
        ctx.accounts
            .acquire_plot(plot_x, plot_y, plot_currency, ctx.program_id)
    }

    // SEEDS

    pub fn mint_seeds(
        ctx: Context<MintSeeds>,
        plot_currency: Pubkey,
        seeds_to_mint: u64,
        plant_tokens_per_seed: u64,
        growth_block_duration: u32,
        neighbor_water_drain_rate: u32,
        balance_absorb_rate: u64,
        times_to_tend: u8,
        // treasury has to be an associated token account of plot_currency
        treasury: Pubkey,
    ) -> Result<()> {
        msg!("Treasury!:: {}", treasury);

        ctx.accounts.mint_seeds(
            plot_currency,
            seeds_to_mint,
            plant_tokens_per_seed,
            growth_block_duration,
            neighbor_water_drain_rate,
            balance_absorb_rate,
            times_to_tend,
            &treasury,
            ctx.bumps.seed_mint_info,
            &ctx.program_id,
        )
    }

    // PLANTS

    // seed is passed as an account
    pub fn plant_seed(
        ctx: Context<PlantSeed>,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
    ) -> Result<()> {
        ctx.accounts.plant_seed(plot_x, plot_y, plot_currency, ctx.program_id)
    }

    pub fn tend_plant(
        ctx: Context<TendPlant>,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey
    ) -> Result<()> {
        ctx.accounts.tend_plant(plot_x, plot_y, plot_currency, ctx.program_id)
    }


    // pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
    //     msg!("GM!");
    //     Ok(())
    // }
}
