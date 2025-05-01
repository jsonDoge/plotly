use crate::{errors::ErrorCode, state::Plot};
use anchor_lang::{prelude::{msg, Account, Pubkey}, Key, Result};
use anchor_spl::token::Mint;

pub fn update_plot_water(
    plot_x: u32,
    plot_y: u32,
    plot_mint: Account<Mint>,
    plot: Account<Plot>,
    farm: &Pubkey,
    program_id: &Pubkey,
) -> Result<()> {
    // let (expected_mint, _bump) = Pubkey::find_program_address(
    //     &[
    //         b"plot_mint",
    //         &(plot_x + 1).to_le_bytes()[..],
    //         &plot_y.to_le_bytes()[..],
    //         farm.as_ref(),
    //     ],
    //     program_id,
    // );

    // msg!("Expected mint right: {:?}", expected_mint);
    // msg!("Mint right: {:?}", plot_mint.key());

    // if plot_mint.key() != expected_mint {
    //     return Err(ErrorCode::InvalidNeighborPlotMint.into());
    // }

    // let (expected_plot, _bump) =
    //     Pubkey::find_program_address(&[b"plot", plot_mint.key().as_ref()], program_id);

    // if plot.key() != expected_plot {
    //     return Err(ErrorCode::InvalidNeighborPlot.into());
    // }

    // let mut plot = Plot::try_deserialize(&mut &plot.data.borrow()[..])?;

    // let blocks_passed = current_block - plot.last_update_block;

    // let water_updated_res = get_plot_water_collected(
    //     plot.right_plant_drain_rate,
    //     plot.left_plant_drain_rate,
    //     plot.up_plant_drain_rate,
    //     plot.down_plant_drain_rate,
    //     plot.center_plant_drain_rate,
    //     plot.water,
    //     plot.water_regen,
    //     blocks_passed,
    // );
    // total_water_collected += plot.left_plant_water_collected + water_updated_res.1;

    // plot.water = water_updated_res.5;

    // plot.right_plant_water_collected += water_updated_res.0;
    // plot.left_plant_water_collected = 0;
    // plot.up_plant_water_collected += water_updated_res.2;
    // plot.down_plant_water_collected += water_updated_res.3;
    // plot.center_plant_water_collected += water_updated_res.4;

    // plot.left_plant_drain_rate = 0;

    // plot.last_update_block = current_block;
    // plot.try_serialize(&mut &mut plot.data.borrow_mut()[..])?;

    Ok(())
}
