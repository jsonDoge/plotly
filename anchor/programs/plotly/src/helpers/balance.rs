#![allow(warnings)]

// returns 
// - how much balance was absorbed by the plant
// - how much balance left in the plot


// notice AT exact overage balance the lower rate applies

pub fn get_balance_collected(
    plant_balance: u64,
    plot_balance: u64,
    plant_absorb_rate: u64,
    balance_per_tend: u64, // at what balance step the plant can be tended
    times_tended: u8,
    max_tends: u8,
    blocks_passed: u64,
) -> (u64, u64) {
    
    if plot_balance == 0 || blocks_passed == 0 {
        return (0, plot_balance);
    }

    if times_tended == max_tends {
        // no need to check for overage
        let absorbed = if (plant_absorb_rate * blocks_passed) > plot_balance { plot_balance } else { plant_absorb_rate * blocks_passed };
        return (absorbed, plot_balance - absorbed);
    }


    // should round down
    // let times_should_be_tended = plant_balance / balance_per_tend;
    
    let is_in_overage = times_tended as u64 * balance_per_tend > plant_balance;
    
    if is_in_overage {
        return get_balance_collected_at_overage(
            plant_balance,
            plot_balance,
            plant_absorb_rate,
            balance_per_tend,
            blocks_passed,
        );
    }

    let blocks_available_until_overage = ((((times_tended + 1) as u64 * balance_per_tend) - plant_balance) / plant_absorb_rate).max(1) as u64;

    if blocks_available_until_overage >= blocks_passed {
        // still absorbing at normal rate
        let absorbed = if (plant_absorb_rate * blocks_passed) > plot_balance { plot_balance } else { plant_absorb_rate * blocks_passed };

        return (absorbed, plot_balance - absorbed);
    }
    
    // goes into overage

    let absorbed = if (plant_absorb_rate * blocks_available_until_overage) > plot_balance { plot_balance } else { plant_absorb_rate * blocks_available_until_overage };

    // not enough plot balance to go into overage
    if absorbed >= plot_balance {
        return (plot_balance, 0);
    }

    let new_plot_balance = plot_balance - absorbed;
    let new_plant_balance = plant_balance + absorbed;
    let blocks_in_overage = blocks_passed - blocks_available_until_overage;

    let res = get_balance_collected_at_overage(
        new_plant_balance,
        new_plot_balance,
        plant_absorb_rate,
        balance_per_tend,
        blocks_in_overage,
    );

    return (absorbed + res.0, res.1);
}

// should only be called if the plant is in OVERAGE
fn get_balance_collected_at_overage(
    plant_balance: u64,
    plot_balance: u64,
    plant_absorb_rate: u64,
    balance_per_tend: u64, // at what balance step the plant can be tended
    blocks_in_overage: u64,
) -> (u64, u64) {
    let overage = plant_balance % balance_per_tend;

    // if already consumed 25% of tend balance while being in overage the absorb rate is 0
    let overage_step = (balance_per_tend / 4) as u64; 

    let has_stopped_absorbing = overage >= overage_step;

    // See if absorbtion already stopped

    if has_stopped_absorbing {
        return (0, plot_balance);
    }

    let overage_absorb_rate = plant_absorb_rate / 2;

    // rounding up
    let blocks_until_stop_absorbing = ((overage_step - overage) + overage_absorb_rate - 1) / overage_absorb_rate; 
    
    // let blocks_until_stop_absorbing = (blocks_until_stop_absorbing + 1) / 2;

    // total available
    let absorbed_at_overage = if (overage_step - overage) > plot_balance { plot_balance } else { overage_step - overage };

    // See if reached the stop absorbing block

    if blocks_until_stop_absorbing <= blocks_in_overage {
        return (absorbed_at_overage, plot_balance - absorbed_at_overage);
    }

    let absorbed_at_overage = if (overage_absorb_rate * blocks_in_overage) > plot_balance { plot_balance } else { overage_absorb_rate * blocks_in_overage };

    // Still absorbing but at overage rate

    return (absorbed_at_overage, plot_balance - absorbed_at_overage);
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regular_case() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plot_balance = 1000000;
        let plant_absorb_rate = 2;
        let balance_per_tend = 168; // at what balance step the plant can be tended
        let times_tended = 0;
        let max_tends = 5;
        let blocks_passed = 10;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                blocks_passed
            ),
            (20, 1000000 - 20)
        );
    }

    #[test]
    fn test_reaches_end_of_tend() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plot_balance = 1000000;
        let plant_absorb_rate = 2;
        let balance_per_tend = 168; // at what balance step the plant can be tended
        let times_tended = 0;
        let max_tends = 5;
        let blocks_passed = 34;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                blocks_passed
            ),
            (68, 1000000 - 68)
        );
    }

    // #[test]
    // fn test_reaches_overage_and_goes_one_block_in_but_drain_rate_too_slow() {
    //     // balance required 1008 (growth block duration 1000 and absorb rate 1)
    //     // 5 tends -> 1008 / 6 -> 168 (balance per tend)

    //     let plant_balance = 100;
    //     let plot_balance = 1000000;
    //     let plant_absorb_rate = 2;
    //     let balance_per_tend = 168; // at what balance step the plant can be tended
    //     let times_tended = 0;
    //     let max_tends = 5;
    //     let blocks_passed = 35;

    //     assert_eq!(
    //         get_balance_collected(
    //             plant_balance,
    //             plot_balance,
    //             plant_absorb_rate,
    //             balance_per_tend,
    //             times_tended,
    //             max_tends,
    //             blocks_passed
    //         ),
    //         // overage is half the rate so shouldnt change
    //         (67, 1000000 - 67)
    //     );
    // }

    #[test]
    fn test_reaches_overage_and_goes_two_blocks_in__gets_one() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plot_balance = 1000000;
        let plant_absorb_rate = 2;
        let balance_per_tend = 168; // at what balance step the plant can be tended
        let times_tended = 0;
        let max_tends = 5;
        let blocks_passed = 35;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (69, 1000000 - 69)
        );
    }

    #[test]
    fn test_plot_balance_runs_out() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plot_balance = 5;
        let plant_absorb_rate = 2;
        let balance_per_tend = 168; // at what balance step the plant can be tended
        let times_tended = 0;
        let max_tends = 5;
        let blocks_passed = 10;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (5, 0)
        );
    }


    #[test]
    fn test_plot_balance_runs_out_in_overage() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plot_balance = 70;
        let plant_absorb_rate = 2;
        let balance_per_tend = 168; // at what balance step the plant can be tended
        let times_tended = 0;
        let max_tends = 5;
        let blocks_passed = 38;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (70, 0)
        );
    }



    #[test]
    fn test_plot_balance_already_zero() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plot_balance = 0;
        let plant_absorb_rate = 2;
        let balance_per_tend = 168; // at what balance step the plant can be tended
        let times_tended = 0;
        let max_tends = 5;
        let blocks_passed = 38;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (0, 0)
        );
    }
}