/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Public, unauthenticated site. No PII is ever collected here (NFR-15) —
  // this is informational only; the coach itself lives in the app (ADR-0003).
};

export default nextConfig;
