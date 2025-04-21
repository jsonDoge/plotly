use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace)]
pub struct Field {
    pub plot_collection: Pubkey,
    pub bump: u8,
}