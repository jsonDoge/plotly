use anchor_lang::prelude::*;

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
    #[msg("Invalid plot currency")]
    InvalidPlotCurrency,
    #[msg("Plot price not divisible by 2")]
    InvalidPlotPrice,
    #[msg("Invalid neighbor plot mint passed")]
    InvalidNeighborPlotMint,
    #[msg("Invalid neighbor plot passed")]
    InvalidNeighborPlot,
    #[msg("Invalid neighbor water drain rate passed")]
    InvalidNeighborWaterDrainRate,
    #[msg("Invalid treasury address")]
    InvalidTreasury,
    #[msg("INTERNAL: water calculation error")]
    WaterCalculationError,
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
    #[msg("Invalid balance absorb rate")]
    InvalidBalanceAbsorbRate,
    #[msg("Invalid growth duration")]
    InvalidGrowthDuration,
}
