import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_JWT_SECRET: "temporarysecret",
  },
};

export default nextConfig;
