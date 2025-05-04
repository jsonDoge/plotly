#![allow(warnings)]

// returns 
// - how much balance was absorbed by the plant
// - how much balance left in the plot
// - during how many blocks the plant was absorbing


// notice AT exact overage balance the lower rate applies

pub fn get_balance_collected(
    plant_balance: u64,
    plot_balance: u64,
    plant_absorb_rate: u64,
    balance_per_tend: u64, // at what balance step the plant can be tended
    times_tended: u8,
    max_tends: u8,
    balance_till_full: u64,
    blocks_passed: u64,
) -> (u64, u64, u64) {
    
    if plot_balance == 0 || blocks_passed == 0 || balance_till_full == 0 {
        return (0, plot_balance, 0);
    }

    if times_tended == max_tends {
        let max_balance_available = if balance_till_full < plot_balance { balance_till_full } else { plot_balance };

        // no need to check for overage
        let absorbed = if (plant_absorb_rate * blocks_passed) > max_balance_available { max_balance_available } else { plant_absorb_rate * blocks_passed };
        let absorbed_blocks = (absorbed + plant_absorb_rate - 1) / plant_absorb_rate; // rounding up

        return (absorbed, plot_balance - absorbed, absorbed_blocks);
    }


    // should round down
    // let times_should_be_tended = plant_balance / balance_per_tend;
    
    let is_in_overage = (times_tended + 1) as u64 * balance_per_tend <= plant_balance;
    
    if is_in_overage {
        return get_balance_collected_at_overage(
            plant_balance,
            plot_balance,
            plant_absorb_rate,
            balance_per_tend,
            blocks_passed,
            balance_till_full
        );
    }

    let balance_till_overage = (times_tended + 1) as u64 * balance_per_tend - plant_balance;

    let blocks_available_until_overage = ((balance_till_overage + plant_absorb_rate - 1) / plant_absorb_rate).max(1) as u64;

    if blocks_available_until_overage >= blocks_passed {
        let max_balance_available = if balance_till_full < plot_balance { balance_till_full } else { plot_balance };

        // still absorbing at normal rate
        let absorbed = if (plant_absorb_rate * blocks_passed) > max_balance_available { max_balance_available } else { plant_absorb_rate * blocks_passed };
        let absorbed_blocks = (absorbed + plant_absorb_rate - 1) / plant_absorb_rate; // rounding up

        return (absorbed, plot_balance - absorbed, absorbed_blocks);
    }
    
    // goes into overage

    let max_balance_available = if balance_till_full < plot_balance { balance_till_full } else { plot_balance };
    let absorbed = if (plant_absorb_rate * blocks_available_until_overage) > max_balance_available { max_balance_available } else { plant_absorb_rate * blocks_available_until_overage };

    // not enough plot balance to go into overage
    if absorbed >= plot_balance {
        let absorbed_blocks = (absorbed + plant_absorb_rate - 1) / plant_absorb_rate; // rounding up

        return (plot_balance, 0, absorbed_blocks);
    }

    let new_plot_balance = plot_balance - absorbed;
    let new_plant_balance = plant_balance + absorbed;
    let blocks_in_overage = blocks_passed - blocks_available_until_overage;
    let new_balance_till_full = balance_till_full - absorbed;
    let absorbed_blocks = blocks_available_until_overage; // rounding up

    let res = get_balance_collected_at_overage(
        new_plant_balance,
        new_plot_balance,
        plant_absorb_rate,
        balance_per_tend,
        blocks_in_overage,
        new_balance_till_full
    );

    return (absorbed + res.0, res.1, absorbed_blocks + res.2);
}

// should only be called if the plant is in OVERAGE
fn get_balance_collected_at_overage(
    plant_balance: u64,
    plot_balance: u64,
    plant_absorb_rate: u64,
    balance_per_tend: u64, // at what balance step the plant can be tended
    blocks_in_overage: u64,
    balance_till_full: u64,
) -> (u64, u64, u64) {
    if balance_till_full == 0 {
        return (0, plot_balance, 0);
    }

    let overage = plant_balance % balance_per_tend;

    // if already consumed 25% of tend balance while being in overage the absorb rate is 0
    let overage_step = (balance_per_tend / 4) as u64; 

    let has_stopped_absorbing = overage >= overage_step;

    // See if absorbtion already stopped

    if has_stopped_absorbing {
        return (0, plot_balance, 0);
    }

    let overage_absorb_rate = plant_absorb_rate / 2;

    // rounding up
    let blocks_until_stop_absorbing = ((overage_step - overage) + overage_absorb_rate - 1) / overage_absorb_rate; 
    
    // let blocks_until_stop_absorbing = (blocks_until_stop_absorbing + 1) / 2;

    // total available
    let max_balance_available = if balance_till_full < plot_balance { balance_till_full } else { plot_balance };
    let absorbed_at_overage = if (overage_step - overage) > max_balance_available { max_balance_available } else { overage_step - overage };

    // See if reached the stop absorbing block

    if blocks_until_stop_absorbing <= blocks_in_overage {
        let absorbed_blocks = (absorbed_at_overage + overage_absorb_rate - 1) / overage_absorb_rate; // rounding up
        
        return (absorbed_at_overage, plot_balance - absorbed_at_overage, absorbed_blocks);
    }

    let absorbed_at_overage = if (overage_absorb_rate * blocks_in_overage) > max_balance_available { max_balance_available } else { overage_absorb_rate * blocks_in_overage };
    let absorbed_blocks = (absorbed_at_overage + overage_absorb_rate - 1) / overage_absorb_rate; // rounding up

    // Still absorbing but at overage rate

    return (absorbed_at_overage, plot_balance - absorbed_at_overage, absorbed_blocks);
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_regular_case() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plant_balance_required = 1008;
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
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            (20, 1000000 - 20, blocks_passed)
        );
    }

    #[test]
    fn test_reaches_end_of_tend() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plant_balance_required = 1008;
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
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            (68, 1000000 - 68, blocks_passed)
        );
    }

    #[test]
    fn test_reaches_overage_and_goes_two_blocks_in__gets_one() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plant_balance_required = 1008;
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
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (69, 1000000 - 69, blocks_passed)
        );
    }

    #[test]
    fn test_plot_balance_runs_out() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plant_balance_required = 1008;
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
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (5, 0, 3)
        );
    }


    #[test]
    fn test_plot_balance_runs_out_in_overage() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plant_balance_required = 1008;
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
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (70, 0, 36)
        );
    }



    #[test]
    fn test_plot_balance_already_zero() {
        // balance required 1008 (growth block duration 1000 and absorb rate 1)
        // 5 tends -> 1008 / 6 -> 168 (balance per tend)

        let plant_balance = 100;
        let plant_balance_required = 1008;
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
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            // overage is half the rate so shouldnt change
            (0, 0, 0)
        );
    }

    #[test]
    fn test_balance_non_consuming_plant() {
        let plant_balance = 0;
        let plant_balance_required = 0;
        let plot_balance = 1000000;
        let plant_absorb_rate = 0;
        let balance_per_tend = 0; 
        let times_tended = 0;
        let max_tends = 0;
        let blocks_passed = 10;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            (0, 1000000, 0)
        );
    }


    #[test]
    fn test_failing_example() {
        let plant_balance = 0;
        let plant_balance_required = 202;
        let plot_balance = 1000000;
        let plant_absorb_rate = 2;
        let balance_per_tend = 33; 
        let times_tended = 0;
        let max_tends = 5;
        let blocks_passed = 20;

        assert_eq!(
            get_balance_collected(
                plant_balance,
                plot_balance,
                plant_absorb_rate,
                balance_per_tend,
                times_tended,
                max_tends,
                plant_balance_required - plant_balance,
                blocks_passed
            ),
            (34 + 3, 999963, 20)
        );
    }
}