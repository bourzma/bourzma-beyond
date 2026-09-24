import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // resvg renders the Beyond Card with a native binary, which cannot be bundled.
  // Nodemailer is kept external too, as it relies on Node's net/tls at runtime.
  serverExternalPackages: ["@resvg/resvg-js", "nodemailer"],
  // Read from disk at runtime: card fonts and Canva background, and the logo
  // embedded in the Beyond Card email.
  outputFileTracingIncludes: {
    "/api/typeform": [
      "./src/lib/card/fonts/**/*",
      "./src/lib/card/assets/**/*",
      "./public/brand/bourzma-logo.png",
    ],
    "/api/email/test": ["./public/brand/bourzma-logo.png"],
  },
};

export default nextConfig;
