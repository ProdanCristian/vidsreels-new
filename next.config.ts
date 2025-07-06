import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow access from mobile devices on local network
  allowedDevOrigins: ['192.168.1.75'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '65159395407fee3da9935f6bcd84eb64.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-69dd0729934f48d7846c61d339d8b69e.r2.dev',
        port: '',
        pathname: '/**',
      }
    ],
  },


};

export default nextConfig;
