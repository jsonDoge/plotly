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

    // add balance
    // returns plot to farm
    // revokes plot

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

    pub fn harvest_plant(
        ctx: Context<HarvestPlant>,
        plot_x: u32,
        plot_y: u32,
        plot_currency: Pubkey
    ) -> Result<()> {
        ctx.accounts.harvest_plant(plot_x, plot_y, plot_currency, ctx.program_id)
    }

    pub fn revert_plant(
        ctx: Context<RevertPlant>,
        plot_x: u32,
        plot_y: u32,
    ) -> Result<()> {
        ctx.accounts.revertPlant(plot_x, plot_y, ctx.program_id)
    }


    // RECIPES
    pub fn create_recipe(
        ctx: Context<CreateRecipe>,
        plot_currency: Pubkey,
        ingredient_amounts: [u64; 2],
        result_token_deposit: u64,
    ) -> Result<()> {
        ctx.accounts.create_recipe(
            plot_currency,
            ingredient_amounts,
            result_token_deposit,
            ctx.bumps.recipe,
            ctx.program_id,
        )
    }

    pub fn follow_recipe(
        ctx: Context<FollowRecipe>,
        plot_currency: Pubkey,
        ingredient_amounts: [u64; 2],
        result_token_receive: u64,
    ) -> Result<()> {
        ctx.accounts.follow_recipe(
            plot_currency,
            ingredient_amounts,
            result_token_receive,
            ctx.bumps.recipe,
            ctx.program_id,
        )
    }

    pub fn refill_recipe(
        ctx: Context<RefillRecipe>,
        plot_currency: Pubkey,
        ingredient_amounts: [u64; 2],
        result_token_to_add: u64,
        treasuries: [Pubkey; 2],
    ) -> Result<()> {
        ctx.accounts.refill_recipe(
            plot_currency,
            ingredient_amounts,
            result_token_to_add,
            treasuries,
            ctx.bumps.recipe,
            ctx.program_id,
        )
    }


    // OFFER
    pub fn create_offer(
        ctx: Context<CreateOffer>,
        price_amount_per_token: u64,
        result_token_deposit: u64,
    ) -> Result<()> {
        ctx.accounts.create_offer(
            price_amount_per_token,
            result_token_deposit,
            ctx.bumps.offer,
            ctx.program_id,
        )
    }

    pub fn refill_offer(
        ctx: Context<RefillOffer>,
        price_amount_per_token: u64, // used in seeds
        result_token_deposit: u64,
    ) -> Result<()> {
        ctx.accounts.refill_offer(
            price_amount_per_token,
            result_token_deposit,
            ctx.program_id,
        )
    }

    pub fn accept_offer(
        ctx: Context<AcceptOffer>,
        price_amount_per_token: u64, // used in seeds
        result_token_to_receive: u64,
    ) -> Result<()> {
        ctx.accounts.accept_offer(
            price_amount_per_token,
            result_token_to_receive,
            ctx.program_id,
        )
    }

    pub fn cancel_offer(
        ctx: Context<CancelOffer>,
        price_amount_per_token: u64, // used in seeds
    ) -> Result<()> {
        ctx.accounts.cancel_offer()
    }


}
