import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      // Compatibility rewrites for sound files if WAV versions are present
      { source: '/sounds/success.mp3', destination: '/sounds/success.wav' },
      { source: '/sounds/error.mp3', destination: '/sounds/error.wav' },
    ];
  },
};

export default nextConfig;
