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
    SOLANA_DEVNET_URL: process.env.SOLANA_DEVNET_URL,
    SOLANA_LOCALNET_URL: process.env.SOLANA_LOCALNET_URL,
    MOCK_CHAIN_MODE: process.env.MOCK_CHAIN_MODE === 'true',
  },
}
