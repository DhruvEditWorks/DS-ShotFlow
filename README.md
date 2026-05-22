# DS ShotFlow

DS ShotFlow is a full-stack cinematic shot-list workspace inspired by StudioBinder Shot List, with the working feel of Notion, DaVinci Resolve, and Frame.io: dark production UI, draggable scene groups, inline editable shot tables, storyboard/grid/timeline/schedule views, AI shot suggestions, exports, Drive sync, Cloudinary frames, and autosave.

## Stack

- Next.js 15 App Router
- React 19
- TailwindCSS
- Framer Motion
- ShadCN UI-style components
- Zustand with persisted offline workspace state
- React DnD
- Node.js route handlers
- PostgreSQL + Prisma
- Supabase Auth with Google sign-in and cookie session refresh
- Cloudinary signed uploads
- Google Drive API sync
- PDF, CSV, Excel, JSON export

## Quick Start

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The UI works immediately with a local persisted demo project. Database-backed autosave, auth, Drive, Cloudinary, and AI routes become active once the relevant environment variables are configured.

## Environment

Required for full persistence:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ds_shotflow?schema=public"
```

Supabase Google Auth:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

In Supabase, enable Google as an auth provider and add this redirect URL:

```text
http://localhost:3000/auth/callback
```

Cloudinary:

```bash
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="ds-shotflow"
```

Google Drive:

```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/callback"
```

AI shotlist generation:

```bash
OPENAI_API_KEY="your-key"
OPENAI_MODEL="gpt-4o-mini"
```

Without `OPENAI_API_KEY`, the app uses a deterministic cinematography heuristic fallback so the Generate AI Shotlist button still works.

## Features

- Import `.fdx`, `.pdf`, `.fountain`, and `.txt` scripts through `/api/import`.
- Automatic scene heading detection and scene card creation.
- StudioBinder-like left sidebar with scenes, groups, search, filters, color labels, collapse/expand, rename, and drag/drop.
- Virtualized shot table with sticky headers, inline cells, keyboard-friendly editing, multi-select, copy/paste, duplicate, delete, and drag reorder.
- Default columns: image, scene, shot, description, subject, shot size, shot type, movement, duration.
- Optional columns: lens, FPS, audio, lighting, notes, props, VFX, camera height.
- Column settings panel for enable/disable/reorder.
- Shot size presets: CU, MCU, ECU, WCU, MS, CS, MCS, WS, EWS, FS, MFS, LS, ELS.
- Shot type presets for camera height, framing, and focus, plus reusable custom presets.
- Movement presets including static, pan, tilt, swish moves, tracking, dolly, crane, handheld, Steadicam, and orbit.
- Upload, drop, and paste shot images with immediate preview and Cloudinary upload when configured.
- Fullscreen image preview.
- Storyboard, grid, timeline, and shooting schedule modes.
- Director and cinematographer notes.
- Autosave, local offline cache, and version checkpoints.
- Export cinematic PDF, CSV, Excel, and JSON through `/api/export`.
- Save/load/sync Google Drive project JSON.

## Useful Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run db:studio
```

## Docker

```bash
docker compose up --build
```

The app runs on [http://localhost:3000](http://localhost:3000), and PostgreSQL runs on port `5432`.

## Project Structure

```text
src/app                 Next.js app routes and API handlers
src/components/shotflow Cinematic product UI
src/components/ui       ShadCN-compatible primitives
src/lib                 Prisma, auth, Drive, Cloudinary, exporters, parsers
src/stores              Zustand workspace store
src/types               Shared shotflow types
prisma/schema.prisma    PostgreSQL data model
```

## Notes

PDF import uses `pdf-parse`, so scanned PDFs need OCR before upload. Drive sync needs the Google OAuth `drive.file` scope; the Supabase Google sign-in request already includes it. Production deployments should use a managed PostgreSQL provider such as Supabase Postgres, Neon, Railway, or Vercel Postgres.
