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
pub struct SeedMintInfo {
    // Seed growth result
    pub plant_mint: Pubkey,
    pub plant_mint_decimals: u8,
    pub plant_tokens_per_seed: u64,

    // Plant requirements
    pub growth_block_duration: u32,
    // 1 water per N blocks
    pub water_absorb_rate: u32,
    // same as above
    pub balance_absorb_rate: u64,

    // Treasury
    pub treasury: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
pub struct Plant {
    // Seed
    pub seed_mint: Pubkey,

    // Stats
    pub water: u32,
    pub water_required: u32,
    pub balance: u64,
    pub balance_required: u64,

    pub last_update_block: u64,

    // Ownership
    pub owner: Pubkey,

    // Treasury
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
