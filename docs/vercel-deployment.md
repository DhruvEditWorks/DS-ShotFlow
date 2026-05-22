# Vercel Deployment Guide

## 1. Provision Services

Create these services before deploying:

- PostgreSQL database: Supabase Postgres, Neon, Railway, or Vercel Postgres.
- Supabase project with Google provider enabled.
- Cloudinary cloud and unsigned/signed upload preset.
- Google Cloud OAuth app with Drive API enabled.

## 2. Configure Supabase Auth

In Supabase Auth providers, enable Google.

Add local and production redirect URLs:

```text
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

Use this Google OAuth scope set:

```text
email profile https://www.googleapis.com/auth/drive.file
```

## 3. Add Vercel Environment Variables

Add every value from `.env.example` to the Vercel project settings.

Use the production callback URL for:

```bash
GOOGLE_REDIRECT_URI="https://your-vercel-domain.vercel.app/auth/callback"
NEXT_PUBLIC_APP_URL="https://your-vercel-domain.vercel.app"
```

## 4. Prepare the Database

From your local machine or CI:

```bash
npm install
npm run db:generate
npm run db:migrate
```

For a first production deploy where migrations are not yet desired:

```bash
npm run db:push
```

Use Prisma migrations for long-term production history.

## 5. Deploy

```bash
vercel
vercel --prod
```

Vercel runs:

```bash
npm run build
```

The build script already calls `prisma generate`.

## 6. Validate

After deployment:

- Sign in with Google and refresh the page to confirm persistent cookie sessions.
- Import a `.fountain` or `.txt` script.
- Add and reorder shots.
- Upload a frame and confirm Cloudinary returns a hosted URL.
- Export PDF, CSV, Excel, and JSON.
- Save to Drive and confirm a `.ds-shotflow.json` file appears in the signed-in user's Drive.
- Disable network temporarily and confirm the local Zustand workspace continues to load.
