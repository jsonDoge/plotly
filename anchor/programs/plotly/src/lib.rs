use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF");

#[program]
pub mod farm {
    use super::*;

    pub fn initialize_farm(ctx: Context<InitializeFarm>, plot_currency: Pubkey) -> Result<()> {
        ctx.accounts.initialize_farm(&plot_currency, ctx.bumps.plot_mint_authority, ctx.bumps.farm, ctx.bumps.farm_associated_plot_authority, ctx.program_id)
    }

    pub fn mint_plot(ctx: Context<MintPlot>, plot_x: u32, plot_y: u32, plot_currency: Pubkey) -> Result<()> {
        ctx.accounts.mint_plot(plot_x, plot_y, plot_currency, ctx.program_id)
    }

    pub fn acquire_plot(ctx: Context<AcquirePlot>, plot_x: u32, plot_y: u32, plot_currency: Pubkey) -> Result<()> {
        ctx.accounts.acquire_plot(plot_x, plot_y, plot_currency, ctx.program_id)
    }

    // pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
    //     msg!("GM!");
    //     Ok(())
    // }
}

