use anchor_lang::{event, prelude::Pubkey, prelude::*};

#[event]
pub struct SeedHarvested {
    pub seed_id: Pubkey,
}


#[event]
pub struct SeedMinted {
    pub seed_id: Pubkey,
    pub seed_name: String,
}

#[event]
pub struct SeedPlanted {
    pub seed_id: Pubkey,
}