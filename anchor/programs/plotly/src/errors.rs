use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Plot already owned")]
    PlotAlreadyOwned,
    #[msg("Plot already minted")]
    PlotAlreadyMinted,
}
