This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project Overview

The Mavi Agent app provides product discovery, tiered recommendations, and PDP browsing. It integrates Supabase for product data, Gemini for semantic search and curation, and a mixed image pipeline to ensure reliable thumbnails and PDP galleries.

## What We Added

- Tiered curation output (good/better/best) with structured response schema and UI toggle.
- Product detail page (PDP) gallery carousel with thumbnails.
- Local image serving route for Men/Women photos as a fallback.
- Robust URL normalization and lookup for product images using enriched JSON.
- Remote image fallback from the Mavi CDN to ensure images render on cards and PDP.
- Safer PDP route params handling to avoid invalid UUID fetches.

## Image Sourcing

The app prefers remote Mavi images to ensure reliable rendering. It uses one of these sources in order:

1. `image_url` from Supabase.
2. Derived CDN URL from `product_url` (`https://sky-static.mavi.com/mnresize/820/1162/<sku>_image_1.jpg`).
3. Local image fallback via `/product-images/[gender]/[index]`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

Optional overrides:

- `GEMINI_MODEL`
- `GEMINI_INTENT_MODEL`
- `GEMINI_EMBED_MODEL`
- `OPENWEATHER_API_KEY`
- `USE_LOCAL_MODEL`
- `LOCAL_LLM_URL`

Server-only (scripts):

- `SUPABASE_SERVICE_ROLE_KEY`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Recommended settings:

- Root Directory: `mavi-agent`
- Build Command: `npm run build`
- Output Directory: default
- Environment Variables: add the same keys from `.env.example`

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
