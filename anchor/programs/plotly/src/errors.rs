use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Plot already owned")]
    PlotAlreadyOwned,
    #[msg("Plot already minted")]
    PlotAlreadyMinted,
    #[msg("Growth block duration not divisible by water rate")]
    InvalidSeedWaterAmount,
    #[msg("Growth block duration not divisible by balance rate")]
    InvalidSeedBalanceAmount,
    #[msg("Insufficient plot currency to acquire plot")]
    InsufficientPlotCurrencyToAcquirePlot,
    #[msg("Invalid plot currency")]
    InvalidPlotCurrency,
}
