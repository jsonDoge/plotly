/** @type {import('next').NextConfig} */
module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  publicRuntimeConfig: {
    SOLANA_CLUSTER_URL: process.env.SOLANA_CLUSTER_URL,
    SOLANA_CLUSTER_NAME: process.env.SOLANA_CLUSTER_NAME,
    MOCK_CHAIN_MODE: process.env.MOCK_CHAIN_MODE === 'true',

    // SEASON_DURATION_BLOCKS: process.env.SEASON_DURATION_BLOCKS,
    PLOT_CURRENCY_MINT_ID: process.env.PLOT_CURRENCY_MINT_ID,
    FARM_AUTH_ID: process.env.FARM_AUTH_ID,
    FARM_ID: process.env.FARM_ID,

    // water threasholds
    PLOT_WATER_30_THRESHOLD: process.env.PLOT_WATER_30_THRESHOLD,
    PLOT_WATER_10_THRESHOLD: process.env.PLOT_WATER_10_THRESHOLD,
    PLOT_MAX_WATER: process.env.PLOT_MAX_WATER,

    // balances
    PLOT_FREE_RENT_LIMIT: process.env.PLOT_FREE_RENT_LIMIT,
  },
}
