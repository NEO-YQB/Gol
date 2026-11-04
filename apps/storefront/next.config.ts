import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/vendor-app',
        destination: '/vendor-apps',
        permanent: true,
      },
      {
        source: '/seller-app',
        destination: '/vendor-apps',
        permanent: true,
      },
      {
        source: '/seller-apps',
        destination: '/vendor-apps',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/vendor-apps',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
      {
        source: '/vendor-app',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
