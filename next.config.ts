import type { NextConfig } from "next";

function resolveHostAtomOrigin() {
  const raw = process.env.HOSTATOM_ORIGIN_URL?.trim();
  if (!raw) return null;

  let origin: URL;
  try {
    origin = new URL(raw);
  } catch {
    throw new Error("HOSTATOM_ORIGIN_URL must be a valid absolute URL");
  }

  const isLocalDevelopment = process.env.NODE_ENV !== "production" && origin.hostname === "localhost";
  if ((origin.protocol !== "https:" && !isLocalDevelopment) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("HOSTATOM_ORIGIN_URL must be an HTTPS origin without credentials, path, query, or hash");
  }

  if (origin.hostname === "arena-badminton.vercel.app" || origin.hostname.endsWith(".vercel.app")) {
    throw new Error("HOSTATOM_ORIGIN_URL must point to the HostAtom origin, not a Vercel deployment URL");
  }

  return origin.toString().replace(/\/$/, "");
}

const hostAtomProxyEnabled = process.env.ARENA_ENABLE_HOSTATOM_PROXY === "true";
const hostAtomOrigin = hostAtomProxyEnabled ? resolveHostAtomOrigin() : null;

const nextConfig: NextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85, 100],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  async rewrites() {
    if (!hostAtomOrigin) return [];

    // Set HOSTATOM_ORIGIN_URL only in the Vercel front-door project. Keep it
    // empty on the HostAtom origin so the origin does not proxy back to Vercel.
    return {
      beforeFiles: [
        {
          source: "/:path*",
          destination: `${hostAtomOrigin}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
