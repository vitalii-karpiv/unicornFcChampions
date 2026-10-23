import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and reads cookies/DB, so classic dynamic rendering is simpler than Cache Components.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
