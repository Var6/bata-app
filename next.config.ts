import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Profile pictures and activity photos are posted through Server Actions.
      // Next's default limit is 1 MB, which is smaller than a single phone photo
      // and made every "Save profile" / "Upload" with an image fail with a 413.
      // lib/upload.ts still caps each image at 5 MB.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
