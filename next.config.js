/** @type {import('next').NextConfig} */
module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  publicRuntimeConfig: {
    SOLANA_DEVNET_URL: process.env.SOLANA_DEVNET_URL,
    SOLANA_LOCALNET_URL: process.env.SOLANA_LOCALNET_URL,
    MOCK_CHAIN_MODE: process.env.MOCK_CHAIN_MODE === 'true',
  },
}
