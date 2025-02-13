/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "huey-site-images.s3.us-east-2.amazonaws.com",
        port: "",
        pathname: "/**",
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Suppress punycode warning
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ }
    ];
    return config;
  }
};

export default nextConfig;
