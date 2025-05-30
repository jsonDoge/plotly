use anchor_lang::prelude::*;

use crate::{program::Farm, state::Recipe};

#[error_code]
pub enum ErrorCode {
    #[msg("Plot already owned")]
    PlotAlreadyOwned,
    #[msg("User is not plot owner")]
    UserNotPlotOwner,
    #[msg("Invalid harvest plot")]
    InvalidHarvestPlot,
    #[msg("Plot already minted")]
    PlotAlreadyMinted,
    #[msg("Plot has zero balance")]
    PlotHasZeroBalance,
    #[msg("Growth block duration not divisible by water rate")]
    InvalidSeedWaterAmount,
    #[msg("Growth block duration not divisible by balance rate")]
    InvalidSeedBalanceAmount,
    #[msg("Insufficient plot currency to acquire plot")]
    InsufficientPlotCurrencyToAcquirePlot,
    #[msg("Insufficient plot currency")]
    InsufficientPlotCurrency,
    #[msg("Invalid plot currency")]
    InvalidPlotCurrency,
    #[msg("Plot price not divisible by 2")]
    InvalidPlotPrice,

    // 
    #[msg("Invalid neighbor plot mint passed")]
    InvalidNeighborPlotMint,
    #[msg("Invalid neighbor plot passed")]
    InvalidNeighborPlot,
    #[msg("Invalid neighbor water drain rate passed")]
    InvalidNeighborWaterDrainRate,
    #[msg("Invalid treasury address")]

    // PLANT
    InvalidTreasury,
    #[msg("Plant doesn't have enough water")]
    PlantNotEnoughWater,
    #[msg("Plant doesn't have enough balance")]
    PlantNotEnoughBalance,
    #[msg("Plant already reached max tend")]
    PlantReachedMaxTend,
    #[msg("No blocks passed")]
    NoBlocksPassed,
    #[msg("Too early to tend")]
    TooEarlyToTend,

    // SEED
    #[msg("Invalid max tends")]
    InvalidMaxTends,
    #[msg("Invalid balance absorb rate")]
    InvalidBalanceAbsorbRate,
    #[msg("Invalid growth duration")]
    InvalidGrowthDuration,
    #[msg("Zero balance")]
    ZeroBalance,
    #[msg("Tending not allowed if absorb rate is 0")]
    TendingNotAllowedIfAbsorbRateIsZero,
    #[msg("Seed info has no plant token")]
    SeedInfoHasNoPlantToken,



    #[msg("Plot still has balance")]
    PlotStillHasBalance,
    #[msg("Invalid ingredient data")]
    InvalidIngredientData,
    #[msg("Invalid recipe result data")]
    InvalidRecipeResultData,
    #[msg("Recipe already exists, use deposit")]
    RecipeAlreadyExists,
    #[msg("Recipe doesnt exist")]
    RecipeDoesntExist,
    #[msg("Insufficient ingredient token balance")]
    InsufficientIngredientTokenBalance,
    #[msg("Invalid recipe treasury")]
    InvalidRecipeTreasury,
    #[msg("Recipe doesnt have enough tokens")]
    RecipeDoesntHaveEnoughTokens,
    #[msg("Cant refill by 0 tokens")]
    CantRefillByZeroTokens,
    #[msg("Neighbor plot not minted")]
    NeighborPlotNotMinted,
    
    // OFFERS
    #[msg("Result token is not a seed or minted by the farm program")]
    InvalidResultToken,
    #[msg("Non-existing offer")]
    OfferDoesntExist,
    #[msg("Offer doesnt have enough tokens")]
    OfferDoesntHaveEnoughTokens,
    #[msg("Invalid ATA account")]
    InvalidATAAccount,
    #[msg("Insufficient balance to complete offer")]
    InsufficientBalanceToCompleteOffer,
    #[msg("Offer already exists")]
    OfferAlreadyExists,


    // INTERNAL ERRORS (Unexpected)
    #[msg("INTERNAL: water calculation error")]
    WaterCalculationError,
    #[msg("INTERNAL: farm doesn't own the plot mint")]
    FarmDoesntOwnPlotMint,
}
