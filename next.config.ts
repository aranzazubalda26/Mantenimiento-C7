import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Probar desde el celular en la red local (http://192.168.x.x:3000) con `npm run dev`
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
