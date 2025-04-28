use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace)]
pub struct Farm {
    pub plot_collection: Pubkey,
    pub plot_currency: Pubkey,
    pub plot_price: u64,
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
    pub water_absorb_rate: u32, // currently planned always 100
    // same as above
    pub balance_absorb_rate: u64,

    pub neighbor_drain_ratio: u32,

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

    // takes a 100 drain ratio. 100 - (neighbor_drain_ratio * 4) = center drain ratio
    pub neighbor_drain_ratio: u32, // 0 being fully central 20 being fully neighbor 

    // No ownership, because the user can transfer plot
    // with plant growing

    // Treasury (copied from seed mint)
    pub treasury: Pubkey,
    pub bump: u8,
}


#[account]
#[derive(Default, InitSpace)]
pub struct Plot {
    // if water level below 30% water-regen drops to 70%
    // if water level below 10% water-regen drops to 50%
    pub water: u32, // 1000000
    pub balance: u64,
    pub water_regen: i32, // default 90
    
    // plot ownership
    pub last_claimer: Pubkey,

    // update timestamp
    pub last_update_block: u64,

    pub right_plant_drain_rate: u32,
    pub left_plant_drain_rate: u32,
    pub up_plant_drain_rate: u32,
    pub down_plant_drain_rate: u32,
    pub center_plant_drain_rate: u32,

    pub right_plant_water_collected: u32,
    pub left_plant_water_collected: u32,
    pub up_plant_water_collected: u32,
    pub down_plant_water_collected: u32,
    pub center_plant_water_collected: u32,

    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
pub struct AccWithBump {
    pub bump: u8,
}
