use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace)]
pub struct Farm {
    pub plot_collection: Pubkey,
    pub plot_currency: Pubkey,
    pub bump: u8,
}


#[account]
#[derive(Default, InitSpace)]
pub struct PlotStats {
    pub water: u32,
    pub balance: u64,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
pub struct AccWithBump {
    pub bump: u8,
}
