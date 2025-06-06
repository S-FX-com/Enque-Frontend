import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_JWT_SECRET: 'temporarysecret',
    NEXT_PUBLIC_API_URL: 'https://enque-backend-production.up.railway.app',
  },
};

export default nextConfig;
