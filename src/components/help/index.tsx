import React from 'react';

const Help = () => (
  <div className="flex flex-col bg-black bg-opacity-50 px-1 py-1 text-white mb-5">
    <div className="text-left">
      <div className="text-2xl">Welcome to T2 farm</div>
    </div>
    <div className="mt-5 text-lg">What is this?</div>

    <div className="mt-5">This is a web3 game where you can actually grow ERC20 tokens and later craft NFTs.</div>
    <div className="mt-5">
      There are 4 &quot;item&quot; contracts Seed (ERC20), Product (ERC20), Dish (ERC721), Plot (ERC721) and one main
      Farm (custom) contract.
    </div>

    <div className="mt-5 text-lg">How to farm?</div>

    <div className="mt-5">
      SEEDS: To start the user needs to own Seeds which he can obtain from the shop or from grown Products (explained
      later in PRODUCTS to SEEDS).
    </div>
    <div className="mt-5">
      <span>PLOT: Now the user can plant them in a Plot. Any Plot colored in </span>
      <b>green</b>
      <span> color is free (not owned) and is open for buying. </span>
      <span>Anyone can click that Plot and confirm purchase. </span>
      <span>After the purchase the plot will become </span>
      <b>brown</b>
      <span> meaning you own it. </span>
      <b>Blue</b>
      <span> means someone else owns it.</span>
    </div>
    <div className="mt-5">
      ACTIONS: For all action like (Buying, Planting, Harvesting) you need to own mumbai testnet currency, make sure you
      deposit some to the generated address on the displayed either on the left side (PC) or in the burger menu
      (Mobile). Clicking on the address copies it.
    </div>
    <div className="mt-5">
      PLANTING: After you&apos;ve aquired both Seeds and at least one Plot. Click on the Plot you own and select a Seed
      you want to plant. After a successful action a plant should appear on that Plot.
    </div>
    <div className="mt-5">
      GROWING: Each plant requires time (blocks) and water to grow. And also grows only during his seasons. From the
      user perspective you can only wait and check the duration left or how much water is still needed (click on the
      plant).
    </div>
    <div className="mt-5">
      WATER: Water is necessary for plants to be harvested. Currently Plots naturally regenerate water at a constant
      rate. Plants also absorb water at constant rate. Plants can absorb water from their own and direct neighboring
      Plots (Up, Right, Down and Left neighbors). If the plot is overfarmed or is surrounded by other plants the water
      may become scarce, which will result in overgrowing (look in the next section).
    </div>
    <div className="mt-5">
      OVERGROWING: If the plant is left alone for too long or is harvested during the wrong season it will overgrow with
      Weeds. You&apos;ll lose the ability to aquire your initially planted plant and after harvest only gain Weeds.
    </div>
    <div className="mt-5">
      HARVESTING: If plant water and duration requirements have been met feel free to harvest and receive a fixed yield
      of Products. Your Product ownership is shown in the Barn.
    </div>
    <div className="mt-5">
      CRAFTING DISHES: After you&apos;ve aquired a required quantity of products, you may craft Dishes in the kitchen.
      You can check the recipies below in the recipe section. After a successful crafting you&apos;ll lose products and
      gain a dish NFT.
    </div>
    <div className="mt-5">
      PRODUCTS to SEEDS: Instead of crafting Dishes you may also opt to convert Products back to Seeds. Current Product
      to Seed rate is 1-to-1. You can do so in the Barn.
    </div>

    <div className="mt-5 text-lg">What are Weeds?</div>
    <div className="mt-5">
      Weeds are a result Product of an unsuccessful harvest action. They do not have their own seed and if you want to
      aquire them overgrowing is the only way. (check How to farm? &gt; OVERGROWING section)
    </div>
    <div className="mt-5">Happy Farming!</div>
    <div className="mt-5">P.S.</div>
    <div className="mt-5">
      The contracts are still in early testnet stage and are not upgradable, so farm resets are still likely to happen.
    </div>
  </div>
);

export default Help;
