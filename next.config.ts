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
      },
    ],
  },
  //Proxy to get other domains, it worked as a bug solving for the /v1/agents/ fetch problem
};

export default nextConfig;
