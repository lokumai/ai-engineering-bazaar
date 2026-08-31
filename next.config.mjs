// The site is served from a sub-path on GitHub Pages. basePath rewrites routes;
// assetPrefix rewrites /_next/* URLs. Setting only one of them yields a site
// that navigates correctly but loads no CSS or JS.
const basePath = process.env.SITE_BASE_PATH ?? ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_SITE_BASE_PATH: basePath },
}

export default nextConfig
