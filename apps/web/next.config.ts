import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,

  /**
   * Same-origin proxy to the API. The browser calls /api/auth/login on this
   * domain; Next forwards it to the API and passes the Set-Cookie back, so the
   * session cookie lands on the web domain instead of the API's. See the
   * comment on SERVER_URL in src/lib/api.ts for why that matters.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_SERVER_URL}/:path*`,
      },
    ];
  },
};

export default withVarlock(nextConfig);
