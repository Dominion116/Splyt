import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@wagmi/core": path.resolve(__dirname, "node_modules/@wagmi/core"),
      "@wagmi/connectors": path.resolve(__dirname, "node_modules/@wagmi/connectors"),
    },
  },
};

export default nextConfig;
