/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Staff-only console. Keep it lean; never trust the frontend for authz —
  // the API enforces least privilege (NFR-10, security-design.md).
};

export default nextConfig;
