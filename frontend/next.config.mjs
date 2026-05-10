import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function buildRemotePatterns(value) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((hostname) => ({
      protocol: "https",
      hostname
    }));
}

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const apiProxyTarget = stripTrailingSlash(process.env.API_PROXY_TARGET ?? "http://localhost:4000");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(currentDir, ".."),
  images: {
    remotePatterns: buildRemotePatterns(process.env.NEXT_PUBLIC_IMAGE_HOSTS)
  },
  async rewrites() {
    if (!/^https?:\/\//i.test(apiProxyTarget)) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
