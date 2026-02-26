This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

**Production is cloud-only:** Vercel and this repo are the single source of truth. Builds, env vars, Stripe handlers, and all routes run entirely on Vercel. No local machine is required for deployment.

## Getting Started (optional local development)

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

Open the URL shown in the terminal (e.g. when running locally) to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel (production)

This project is **cloud-clean**: the repo is the single source of truth for code. Builds, env vars, Stripe handlers, and all routes run entirely on Vercel. No reliance on any local machine.

- **Code:** Push to GitHub; Vercel builds from the repo.
- **Landing images:** Any new landing images must live in `public/signatures` or `public/exemplars` and must be committed. Do not add images to other locations or leave them untracked.
- **Env:** Set in [Vercel Project Settings → Environment Variables](https://vercel.com/docs/projects/environment-variables). See `.env.example` for the list (OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.).
- **Secrets:** Do not commit `.env` or `.env.local`; they are gitignored. Use only Vercel (or your own env) for production.

The easiest way to deploy is the [Vercel Platform](https://vercel.com/new). See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
