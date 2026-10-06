import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Job photos upload through server actions: up to 5 files of 8MB each (see lib/photos.ts).
    // The 1MB default rejects even two phone photos, and the proxy (auth) layer buffers bodies at 10MB.
    serverActions: { bodySizeLimit: "45mb" },
    proxyClientMaxBodySize: "45mb",
  },
};

export default nextConfig;
