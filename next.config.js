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

    SEASON_DURATION_BLOCKS: process.env.SEASON_DURATION_BLOCKS,
    PLOT_CURRENCY_MINT_ID: process.env.PLOT_CURRENCY_MINT_ID,
  },
}
