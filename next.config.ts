import type { NextConfig } from 'next';

/**
 * Baseline security headers.
 *
 * This app is entirely behind a login and shows personal data about children, so
 * these are worth having even though none of them is exotic.
 */
const securityHeaders = [
  // Do not let the app be framed - it holds an authenticated session, so framing it
  // would enable clickjacking against real actions (deleting a student, etc.).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },

  // Never let a browser second-guess a declared content type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Send the origin but not the path when leaving the site, so student ids and
  // other route parameters are not handed to third parties in the Referer header.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // This app needs none of these.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  // No need to advertise the framework version.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
