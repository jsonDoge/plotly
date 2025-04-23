use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF");

#[program]
pub mod farm {
    use super::*;

    pub fn initialize_farm(ctx: Context<InitializeFarm>, plot_currency: Pubkey) -> Result<()> {
        ctx.accounts.initialize_farm(
            &plot_currency,
            ctx.bumps.plot_mint_authority,
            ctx.bumps.farm,
            ctx.bumps.farm_associated_plot_authority,
            ctx.program_id,
        )
    }

    // PLOTS

    pub fn mint_plot(
        ctx: Context<MintPlot>,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey,
    ) -> Result<()> {
        ctx.accounts
            .mint_plot(plot_x, plot_y, plot_currency, ctx.program_id)
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
        water_absorb_rate: u32,
        balance_absorb_rate: u64,
        treasury: Pubkey,
    ) -> Result<()> {
        msg!("Treasury!:: {}", treasury);

        ctx.accounts.mint_seeds(
            plot_currency,
            seeds_to_mint,
            plant_tokens_per_seed,
            growth_block_duration,
            water_absorb_rate,
            balance_absorb_rate,
            &treasury,
            ctx.bumps.seed_mint_info,
            ctx.bumps.farm_associated_plant_token_authority,
            ctx.bumps.seed_mint_authority,
            &ctx.program_id,
        )
    }

    // pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
    //     msg!("GM!");
    //     Ok(())
    // }
}
