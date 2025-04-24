import React from 'react'

const Help = () => (
  <div className="flex flex-col bg-black bg-opacity-50 px-1 py-1 text-white mb-5">
    <div className="text-left">
      <div className="text-2xl">Welcome to Plotly</div>
    </div>
    <div className="mt-5 text-lg">What is this?</div>

    <div className="mt-5">This is a web3 game where you can actually grow SPL tokens.</div>
    <div className="mt-5">There are 2 core items Seed (NFT), Plot (NFT) one main Farm (custom) program.</div>

    <div className="mt-5 text-lg">How to farm?</div>

    <div className="mt-5">
      SEEDS: To start the farmer needs to own Seeds. Those can be obtained from exchanges and verified with this game.
    </div>
    <div className="mt-5">
      <span>PLOT: Now the user can plant them in a Plot. Any Plot colored in </span>
      <b>green</b>
      <span> color is free (not owned) and is open for buying. </span>
      <span>Anyone can click that Plot and confirm purchase. </span>
      <span>After the purchase the plot will become </span>
      <b>brown</b>
      <span> meaning you own it. </span>
      <b>blue</b>
      <span> means someone else owns it.</span>
    </div>
    <div className="mt-5">
      ACTIONS: For all action like (Buying, Planting, Harvesting) you need to own stable token (USDC) solana currency.
    </div>
    <div className="mt-5">
      PLANTING: After you&apos;ve acquired both Seeds and at least one Plot. Click on the Plot you own and select a Seed
      you want to plant. After a successful action a plant should appear on that Plot.
    </div>
    <div className="mt-5">
      GROWING: Each plant requires time (blocks), water (plot property) and nutrition (stable tokens) to grow. And also
      grows only during his seasons. From the user perspective you can only wait and check the duration left or how much
      water is still needed (click on the plant).
    </div>
    <div className="mt-5">
      WATER: Water is necessary for plants to be harvested. Currently Plots naturally regenerate water at a constant
      rate. Plants also absorb water at constant rate. Plants can absorb water from their own and direct neighboring
      Plots (Up, Right, Down and Left neighbors). If the plot is overfarmed or is surrounded by other plants the water
      may become scarce, which will result in overgrowing (look in the next section).
    </div>
    <div className="mt-5">
      HARVESTING: If plant water, nutrition and duration requirements have been met the farmer can harvest and receive a
      yield. Your Product ownership is shown in the Barn.
    </div>
    <div className="mt-5">CRAFTING: Some tokens can be crafted into new tokens or seeds using recipes.</div>

    <div className="mt-5 text-lg">What are Weeds?</div>
    <div className="mt-5">
      Weeds are a result Product of an unsuccessful harvest action. They do not have their own seed and if you want to
      acquire them overgrowing is the only way. (check How to farm? &gt; OVERGROWING section)
    </div>
    <div className="mt-5">Happy Farming!</div>
    <div className="mt-5">P.S.</div>
    <div className="mt-5">
      The contracts are still in early testnet stage and are not upgradable, so farm resets are still likely to happen.
    </div>
  </div>
)

export default Help
