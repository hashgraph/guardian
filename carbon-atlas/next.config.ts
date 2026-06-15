import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __current_dir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: __current_dir,
  },

  // Permanent redirects for the original MECD-only URL structure.
  // The first version was deployed with paths like /dashboard, /issuances, etc.
  // These are now under /policy/mecd/... — redirect so press release links keep working.
  async redirects() {
    return [
      { source: "/dashboard",        destination: "/policy/mecd/dashboard",  permanent: true },
      { source: "/issuances",        destination: "/policy/mecd/issuances",  permanent: true },
      { source: "/issuances/:messageId", destination: "/policy/mecd/issuances/:messageId", permanent: true },
    ]
  },
};

export default nextConfig;
