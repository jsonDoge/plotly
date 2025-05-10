import React from 'react'

const Help = () => (
  <div className="flex flex-col bg-black bg-opacity-50 px-1 py-1 text-white mb-5">
    <div className="text-left">
      <div className="text-2xl">Welcome to Plotly</div>
    </div>
    <div className="mt-5 text-lg">What is this?</div>

    <div className="mt-5">This is a web3 game where you can actually grow SPL tokens.</div>
    <div className="mt-5">
      There are 2 core items Seed (SPL tokens with 0 decimals), Plot (NFT) one main Farm (custom) program.
    </div>

    <div className="mt-5 text-lg">How to farm?</div>

    <div className="mt-5">
      CURRENCY: In the future there may be more than one farm. And each farm can have it&apos;s own decided currency.
      During active development there is only one farm and it uses devnet USDC as it&apos;s currency.
    </div>

    <div className="mt-5">
      SEEDS: To start the farmer needs to own Seeds. Those can be obtained from exchanges and verified with this game.
      Or here in the offers you can look at news board for latest offer ids.
    </div>
    <div className="mt-5">
      <span>PLOT: Now the user can plant them in a Plot. Any Plot colored in </span>
      <b>no color/transparent</b>
      <span> color is free (not owned) and is open for buying. </span>
      <span>Anyone can click that Plot and confirm purchase. </span>
      <span>After the purchase the plot will become </span>
      <b>brown</b>
      <span> meaning you own it. </span>
      <b>blue</b>
      <span> means someone else owns it.</span>
    </div>
    <div className="mt-5">
      ACTIONS: For all action like (Buying plots, Depositing balance) you&apos;ll need to own farm currency (USDC).
    </div>
    <div className="mt-5">
      PLANTING: After you&apos;ve acquired both Seeds and at least one Plot. Click on the Plot you own and select a Seed
      you want to plant. After a successful action a plant should appear on that Plot after a few updates.
    </div>
    <div className="mt-5">
      GROWING: Each plant requires time (blocks), water (plot property) and nutrition (stable tokens) to grow.
    </div>
    <div className="mt-5">
      TENDING: Some plants may require tending. If it happens you&apos;ll see weeds around your plant or when you click
      on the plant, the information displays when and if tending is needed. Tending doesn&apos;t cost anything other
      than gas. If you don&apos;t tend the plant will eventually stop absorbing plot balance. (Good and bad depending on
      your intention)
    </div>
    <div className="mt-5">
      WATER: Water is necessary for plants to grow. Currently Plots naturally regenerate water depending on how much
      water is left. Above 30% = 100% regen, above 10% = 70% regen, below 10% = 50% regen (100% speed = 90 water units
      per slot). Plants also absorb water at constant rate. Plants can absorb water from their own and direct
      neighboring Plots (Up, Right, Down and Left neighbors). If the plot is overfarmed or is surrounded by other plants
      the water may become scarce, which will result in slowed regeneration and therefor plants may slow growth if water
      level reaches 0.
    </div>
    <div className="mt-5">
      HARVESTING: If plant water, nutrition and duration requirements have been met the farmer can harvest and receive a
      yield.
    </div>
    <div className="mt-5">
      RECIPES: Anybody can craft recipes of 2 SPL tokens -&gt; 1 SPL token. Recipes are NON-RETURNABLE. Once you craft a
      recipe it will deduct resulting tokens for fullfilment.
    </div>
    <div className="mt-5">OFFERS: Are helpers to distribute seeds, using a fixed price. Offers can be cancelled.</div>
    <div className="mt-5">Happy Farming!</div>
    <div className="mt-5">P.S.</div>
    <div className="mt-5">The program is still in early devnet stage, so farm resets are still likely to happen.</div>
  </div>
)

export default Help
