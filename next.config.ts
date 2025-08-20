import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'enque.s3.us-east-2.amazonaws.com',
        pathname: '/avatars/**',
      },
      // Agregar otros dominios si es necesario
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
