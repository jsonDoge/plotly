use anchor_lang::prelude::*;

#[account]
#[derive(Default, InitSpace)]
pub struct Farm {
    pub plot_collection: Pubkey,
    pub plot_currency: Pubkey,

    // TODO: will be used for increasing plot price - currently static
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

    // is only used to calculate how much water/balance is needed
    pub growth_block_duration: u32, 

    // currently TOTAL plant water absorb rate is fixed at 100

    // balance absorb rate per block
    pub balance_absorb_rate: u64,

    pub neighbor_water_drain_rate: u32,

    pub times_to_tend: u8, // 0 - 10

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

    // balance

    pub balance_absorb_rate: u64,
    pub times_to_tend: u8, // 0 - 10
    pub times_tended: u8, // 0 - 10

    // water absorb
    // takes a 100 drain rate. 100 - (neighbor_drain_rate * 4) = center drain rate
    pub neighbor_water_drain_rate: u32, // 0 being fully central 25 being fully neighbor 

    pub last_update_block: u64,

    // No ownership, because the user CANNOT transfer plot
    // with plant growing

    // Treasury (copied from seed mint)
    pub treasury: Pubkey,
    pub treasury_received_balance: u64,
    pub bump: u8,
}


#[account]
#[derive(Default, InitSpace)]
pub struct Plot {
    // if water level below 30% water-regen drops to 70%
    // if water level below 10% water-regen drops to 50%
    pub water: u32, // 1000000
    pub water_regen: i32, // default 90

    //

    pub balance: u64,
    pub balance_free_rent: u64,
    
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
