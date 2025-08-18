const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'enque.s3.us-east-2.amazonaws.com',
        pathname: '/avatars/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
