use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

declare_id!("6z68wfurCMYkZG51s1Et9BJEd9nJGUusjHXNt4dGbNNF");

#[program]
pub mod farm {
    use super::*;

    pub fn acquire_plot(ctx: Context<AcquirePlot>, plot_x: u32, plot_y: u32) -> Result<()> {
        ctx.accounts.acquire_plot(plot_x, plot_y, ctx.bumps.plot_mint_authority, ctx.program_id)
    }

    // pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
    //     msg!("GM!");
    //     Ok(())
    // }
}

