import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // resvg renders the Beyond Card with a native binary, which cannot be bundled.
  // Nodemailer is kept external too, as it relies on Node's net/tls at runtime.
  serverExternalPackages: ["@resvg/resvg-js", "nodemailer"],
  // The card generator reads its fonts and Canva background from disk at runtime.
  outputFileTracingIncludes: {
    "/api/typeform": ["./src/lib/card/fonts/**/*", "./src/lib/card/assets/**/*"],
  },
};

export default nextConfig;
