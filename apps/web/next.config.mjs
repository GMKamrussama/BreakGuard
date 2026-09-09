/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@breakguard/core", "@breakguard/ast-scanner", "@swc/core"],
  reactStrictMode: true,
  transpilePackages: [
    "@breakguard/core-types",
    "@breakguard/lockfile-parser",
    "@breakguard/risk-engine"
  ],
  turbopack: {},
  webpack: (config) => {
    config.externals = [...(config.externals || []), "@swc/core"];
    return config;
  }
};

export default nextConfig;
