import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __current_dir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: __current_dir,
  },
};

export default nextConfig;
