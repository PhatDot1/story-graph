/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@tomo-inc/tomo-evm-kit', '@tomo-wallet/uikit-lite', '@tomo-inc/shared-type'],
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      unoptimized: true,
    },
    webpack: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
      return config
    },
  }
  
  export default nextConfig
  