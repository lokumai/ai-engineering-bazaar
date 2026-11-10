// The site is served from the root of ai-bazaar.lokum.dev (D92), so the deploy
// sets no SITE_BASE_PATH; it stays configurable for a sub-path host. basePath rewrites routes;
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
