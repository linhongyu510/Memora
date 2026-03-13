/** @type {import('next').NextConfig} */
const backendOrigin = (process.env.MEMORA_BACKEND_ORIGIN || "http://127.0.0.1:8002").replace(/\/+$/, "");

const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
    ];
  },
};

export default nextConfig;
