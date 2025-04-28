use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Plot already owned")]
    PlotAlreadyOwned,
    #[msg("User is not plot owner")]
    UserNotPlotOwner,
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
    #[msg("INTERNAL: water calculation error")]
    WaterCalculationError,
}
