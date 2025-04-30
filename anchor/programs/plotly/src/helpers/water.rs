use anchor_lang::prelude::msg;

use crate::constants::{MAX_PLOT_WATER, WATER_10_THRESHOLD, WATER_30_THRESHOLD};

// returns water collected for each plant in order
// right, left, up, down, center
// and the new water level
pub fn get_plot_water_collected(
    right_drain_rate: u32,
    left_drain_rate: u32,
    up_drain_rate: u32,
    down_drain_rate: u32,
    center_drain_rate: u32,
    plot_water: u32,
    base_water_regen: i32,
    blocks_passed: u64,
) -> (u32, u32, u32, u32, u32, u32) {
    println!("Water function started... block {} plot_water {}", blocks_passed, plot_water);

    if blocks_passed == 0 {
        return (0, 0, 0, 0, 0, plot_water);
    }

    // WATER LEVEL [100%; 30%) -> regeneration is at 100%

    if plot_water > WATER_30_THRESHOLD {
        let water_regen = base_water_regen
            - right_drain_rate as i32
            - left_drain_rate as i32
            - up_drain_rate as i32
            - down_drain_rate as i32
            - center_drain_rate as i32;

        // if water is not droping and leve is above 30% threashold
        if (water_regen >= 0) {
            println!("thres >30, positive regen");
            return (
                right_drain_rate * blocks_passed as u32,
                left_drain_rate * blocks_passed as u32,
                up_drain_rate * blocks_passed as u32,
                down_drain_rate * blocks_passed as u32,
                center_drain_rate * blocks_passed as u32,
                if plot_water as u64 + (water_regen as u64 * blocks_passed as u64)
                    > MAX_PLOT_WATER as u64
                {
                    MAX_PLOT_WATER
                } else {
                    plot_water + (water_regen as u32 * blocks_passed as u32)
                },
            );
        }

        println!("thres >30, negative regen");

        let negative_water_regen_abs = water_regen.abs() as u32;

        let blocks_above_30_threashold =
            ((plot_water - WATER_30_THRESHOLD + negative_water_regen_abs - 1) / negative_water_regen_abs) as u32;

        println!("blocks_above_30_threashold: {}", blocks_above_30_threashold);
        // water is dropping but still always above 30%
        if blocks_above_30_threashold > blocks_passed as u32 {
            return (
                right_drain_rate * blocks_passed as u32,
                left_drain_rate * blocks_passed as u32,
                up_drain_rate * blocks_passed as u32,
                down_drain_rate * blocks_passed as u32,
                center_drain_rate * blocks_passed as u32,
                if (negative_water_regen_abs as u64 * blocks_passed as u64) > plot_water as u64 {
                    0
                } else {
                    plot_water - (negative_water_regen_abs * blocks_passed as u32)
                },
            );
        }

        // water drops below 30%
        let new_water_level = plot_water - (blocks_above_30_threashold * negative_water_regen_abs);

        // fn handles all calculation below 30% water level
        let res = get_plot_water_collected(
            right_drain_rate,
            left_drain_rate,
            up_drain_rate,
            down_drain_rate,
            center_drain_rate,
            new_water_level,
            base_water_regen,
            blocks_passed - blocks_above_30_threashold as u64,
        );

        return (
            right_drain_rate * blocks_above_30_threashold + res.0,
            left_drain_rate * blocks_above_30_threashold + res.1,
            up_drain_rate * blocks_above_30_threashold + res.2,
            down_drain_rate * blocks_above_30_threashold + res.3,
            center_drain_rate * blocks_above_30_threashold + res.4,
            res.5,
        );
    }

    // WATER LEVEL [30%; 10%) -> regeneration is at 70%

    if plot_water <= WATER_30_THRESHOLD && plot_water > WATER_10_THRESHOLD {
        // water is now at 70% regen capacity
        let water_regen = (base_water_regen * 70 / 100)
            - right_drain_rate as i32
            - left_drain_rate as i32
            - up_drain_rate as i32
            - down_drain_rate as i32
            - center_drain_rate as i32;

        // water is at an equilibrium
        if (water_regen == 0) {
            println!("thres <30 >10, 0 regen");

            return (
                right_drain_rate * blocks_passed as u32,
                left_drain_rate * blocks_passed as u32,
                up_drain_rate * blocks_passed as u32,
                down_drain_rate * blocks_passed as u32,
                center_drain_rate * blocks_passed as u32,
                plot_water,
            );
        }

        if (water_regen > 0) {
            println!("thres <30 >10, positive regen");

            let blocks_until_30_threashold =
                // +1 because full regen is at > WATER_30_THRESHOLD 
                (((WATER_30_THRESHOLD + 1) - plot_water) / water_regen as u32).max(1) as u32;

            // water is rising doesn't reach > WATER_30_THRESHOLD
            if (blocks_until_30_threashold > blocks_passed as u32) {
                return (
                    right_drain_rate * blocks_passed as u32,
                    left_drain_rate * blocks_passed as u32,
                    up_drain_rate * blocks_passed as u32,
                    down_drain_rate * blocks_passed as u32,
                    center_drain_rate * blocks_passed as u32,
                    if plot_water as u64 + (water_regen as u64 * blocks_passed as u64)
                        > MAX_PLOT_WATER as u64
                    {
                        MAX_PLOT_WATER
                    } else {
                        plot_water + (water_regen as u32 * blocks_passed as u32)
                    },
                );
            }

            // water is rising and reaches > WATER_30_THRESHOLD
            let new_water_level = plot_water + (blocks_until_30_threashold * water_regen as u32);
            println!("blocks_until_30_threashold: {}", blocks_until_30_threashold);

            // will handle the rest of the blocks
            let res = get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                new_water_level,
                base_water_regen,
                blocks_passed - blocks_until_30_threashold as u64,
            );
            return (
                right_drain_rate * blocks_until_30_threashold + res.0,
                left_drain_rate * blocks_until_30_threashold + res.1,
                up_drain_rate * blocks_until_30_threashold + res.2,
                down_drain_rate * blocks_until_30_threashold + res.3,
                center_drain_rate * blocks_until_30_threashold + res.4,
                res.5,
            );
        }

        println!("thres <30 >10, negative regen");
        // if (water_regen < 0) {
        let blocks_until_10_threashold =
            (plot_water - WATER_10_THRESHOLD + water_regen.abs() as u32 - 1) / water_regen.abs() as u32;

        // water is dropping but still always above 30%
        if blocks_until_10_threashold > blocks_passed as u32 {
            return (
                right_drain_rate * blocks_passed as u32,
                left_drain_rate * blocks_passed as u32,
                up_drain_rate * blocks_passed as u32,
                down_drain_rate * blocks_passed as u32,
                center_drain_rate * blocks_passed as u32,
                if (water_regen.abs() as u64 * blocks_passed as u64) > plot_water as u64 {
                    // THIS SHOULD NEVER HAPPEN
                    msg!("Water SKIPPED 10% THRESHOLD!!!");
                    0
                } else {
                    plot_water - (water_regen.abs() as u32 * blocks_passed as u32)
                },
            );
        }

        // water drops to 10% or below
        let new_water_level =
            plot_water - (blocks_until_10_threashold * water_regen.abs() as u32);

        // fn handles all calculation below 10% water level
        let res = get_plot_water_collected(
            right_drain_rate,
            left_drain_rate,
            up_drain_rate,
            down_drain_rate,
            center_drain_rate,
            new_water_level,
            base_water_regen,
            blocks_passed - blocks_until_10_threashold as u64,
        );

        return (
            right_drain_rate * blocks_until_10_threashold + res.0,
            left_drain_rate * blocks_until_10_threashold + res.1,
            up_drain_rate * blocks_until_10_threashold + res.2,
            down_drain_rate * blocks_until_10_threashold + res.3,
            center_drain_rate * blocks_until_10_threashold + res.4,
            res.5,
        );
        // }
    }

    // WATER LEVEL [10%; 0%] -> regeneration is at 50%
    println!("plot_water: {}", plot_water);

    if plot_water <= WATER_10_THRESHOLD {
        // water is now at 50% regen capacity
        let new_base_water_regen = base_water_regen * 50 / 100;

        let water_regen = new_base_water_regen
            - right_drain_rate as i32
            - left_drain_rate as i32
            - up_drain_rate as i32
            - down_drain_rate as i32
            - center_drain_rate as i32;

        // water generation is at an equilibrium
        if (water_regen == 0) {
            println!("thres <10, 0 regen");

            return (
                right_drain_rate * blocks_passed as u32,
                left_drain_rate * blocks_passed as u32,
                up_drain_rate * blocks_passed as u32,
                down_drain_rate * blocks_passed as u32,
                center_drain_rate * blocks_passed as u32,
                plot_water,
            );
        }

        if water_regen > 0 {
            println!("thres <10, positive regen");

            let blocks_until_10_threashold =
                // +1 because full regen is at > WATER_30_THRESHOLD 
                (((WATER_10_THRESHOLD + 1) - plot_water) / water_regen as u32).max(1) as u32;

            // water is rising doesn't reach > WATER_10_THRESHOLD
            if (blocks_until_10_threashold > blocks_passed as u32) {
                return (
                    right_drain_rate * blocks_passed as u32,
                    left_drain_rate * blocks_passed as u32,
                    up_drain_rate * blocks_passed as u32,
                    down_drain_rate * blocks_passed as u32,
                    center_drain_rate * blocks_passed as u32,
                    if plot_water as u64 + (water_regen as u64 * blocks_passed as u64)
                        > MAX_PLOT_WATER as u64
                    {
                        // THIS SHOULD NEVER HAPPEN
                        msg!("Water SKIPPED to 30% THRESHOLD!!!");
                        MAX_PLOT_WATER
                    } else {
                        plot_water + (water_regen as u32 * blocks_passed as u32)
                    },
                );
            }

            // water is rising and reaches > WATER_10_THRESHOLD
            let new_water_level = plot_water + (blocks_until_10_threashold * water_regen as u32);

            // will handle the rest of the blocks
            let res = get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                new_water_level,
                base_water_regen,
                blocks_passed - blocks_until_10_threashold as u64,
            );

            return (
                right_drain_rate * blocks_until_10_threashold + res.0,
                left_drain_rate * blocks_until_10_threashold + res.1,
                up_drain_rate * blocks_until_10_threashold + res.2,
                down_drain_rate * blocks_until_10_threashold + res.3,
                center_drain_rate * blocks_until_10_threashold + res.4,
                res.5,
            );
        }

        // if water_regen < 0 {
        println!("thres <10, negative regen");
        let full_blocks_left = (plot_water) / water_regen.abs() as u32;

        if full_blocks_left >= blocks_passed as u32 {
            return (
                right_drain_rate * blocks_passed as u32,
                left_drain_rate * blocks_passed as u32,
                up_drain_rate * blocks_passed as u32,
                down_drain_rate * blocks_passed as u32,
                center_drain_rate * blocks_passed as u32,
                plot_water - (blocks_passed as u32 * water_regen.abs() as u32),
            );
        }

        let water_generated_after_full_blocks =
            plot_water - (full_blocks_left * water_regen.abs() as u32) + ((blocks_passed as u32 - full_blocks_left) * new_base_water_regen as u32);

        let total_absorption_rate =
            (right_drain_rate + left_drain_rate + up_drain_rate + down_drain_rate + center_drain_rate) as u32;

        let blocks_worth_of_water_absorbed =
            (water_generated_after_full_blocks as u32 / total_absorption_rate) ;


        let left_plot_water = water_generated_after_full_blocks - (blocks_worth_of_water_absorbed * total_absorption_rate);

        return (
            right_drain_rate * (full_blocks_left + blocks_worth_of_water_absorbed),
            left_drain_rate * (full_blocks_left + blocks_worth_of_water_absorbed),
            up_drain_rate * (full_blocks_left + blocks_worth_of_water_absorbed),
            down_drain_rate * (full_blocks_left + blocks_worth_of_water_absorbed),
            center_drain_rate * (full_blocks_left + blocks_worth_of_water_absorbed),
            plot_water - (full_blocks_left * water_regen.abs() as u32) + left_plot_water,
        );
        // }
    }

    // err!(ErrorCode::WaterCalculationError.into())

    msg!("WATER CALCULATION ERROR!!!");
    return (0, 0, 0, 0, 0, plot_water); // TODO: this should never happen
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_blocks_passed() {
        let right_drain_rate = 10;
        let left_drain_rate = 10;
        let up_drain_rate = 10;
        let down_drain_rate = 10;
        let center_drain_rate = 10;
        let plot_water = 100;
        let base_water_regen = 90;
        let blocks_passed = 0;

        assert_eq!(
            get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                plot_water,
                base_water_regen,
                blocks_passed,
            ),
            (0, 0, 0, 0, 0, plot_water)
        );
    }

    #[test]
    fn test_no_neighbor_drain_drains_exactly_everything_regen_at_50() {
        let right_drain_rate = 0;
        let left_drain_rate = 0;
        let up_drain_rate = 0;
        let down_drain_rate = 0;
        let center_drain_rate = 55;
        let plot_water = 100;
        let base_water_regen = 90; // 45
        let blocks_passed = 10;

        assert_eq!(
            get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                plot_water,
                base_water_regen,
                blocks_passed,
            ),
            (0, 0, 0, 0, 550, 0)
        );
    }


    #[test]
    fn test_no_neighbor_drain_drains_more_than_plot_has() {
        let right_drain_rate = 0;
        let left_drain_rate = 0;
        let up_drain_rate = 0;
        let down_drain_rate = 0;
        let center_drain_rate = 55;
        let plot_water = 0;
        let base_water_regen = 90; // 45
        let blocks_passed = 10;

        assert_eq!(
            get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                plot_water,
                base_water_regen,
                blocks_passed,
            ),
            (0, 0, 0, 0, 440, 10) // can drain only in full cycles
        );
    }

    #[test]
    fn test_only_neighbors_drain_drains_more_than_plot_has() {
        let right_drain_rate = 15;
        let left_drain_rate = 15;
        let up_drain_rate = 15;
        let down_drain_rate = 15;
        let center_drain_rate = 0;
        let plot_water = 0;
        let base_water_regen = 90; // 45
        let blocks_passed = 10;

        assert_eq!(
            get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                plot_water,
                base_water_regen,
                blocks_passed,
            ),
            (105, 105, 105, 105, 0, 30) // can drain only in full cycles
        );
    }


    #[test]
    fn test_all_drain_through_all_the_levels_to_0() {
        let right_drain_rate = 25;
        let left_drain_rate = 25;
        let up_drain_rate = 25;
        let down_drain_rate = 25;
        let center_drain_rate = 100;
        let plot_water = 400000;
        let base_water_regen = 90;
        let blocks_passed = 10001;

        assert_eq!(
            get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                plot_water,
                base_water_regen,
                blocks_passed,
            ),
            (114650, 114650, 114650, 114650, 458600, 135) // looks correct
        );
    }


    #[test]
    fn test_rises_from_0_to_above_10_percent_plot_water() {
        let right_drain_rate = 1;
        let left_drain_rate = 1;
        let up_drain_rate = 1;
        let down_drain_rate = 1;
        let center_drain_rate = 4;
        let plot_water = 0;
        let base_water_regen = 90; // 45 / 63 / 90
        let blocks_passed = 2704;

        assert_eq!(
            get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                plot_water,
                base_water_regen,
                blocks_passed,
            ),
            (2704, 2704, 2704, 2704, 10816, 100066)
        );
    }

    #[test]
    fn test_rises_from_0_to_above_30_percent_plot_water() {
        let right_drain_rate = 1;
        let left_drain_rate = 1;
        let up_drain_rate = 1;
        let down_drain_rate = 1;
        let center_drain_rate = 4;
        let plot_water = 0;
        let base_water_regen = 90; // 45 / 63 / 90
        let blocks_passed = 6341;

        assert_eq!(
            get_plot_water_collected(
                right_drain_rate,
                left_drain_rate,
                up_drain_rate,
                down_drain_rate,
                center_drain_rate,
                plot_water,
                base_water_regen,
                blocks_passed,
            ),
            (6341, 6341, 6341, 6341, 6341 * 4, 300046 + 90 - 8)
        );
    }
}
