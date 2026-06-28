# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with Turbopack at http://localhost:3000
npm run build     # Production build with Turbopack
npm run start     # Start production server
npm run lint      # Run ESLint
```

There are no automated tests in this project.

## Architecture

**Stack:** Next.js 15 (App Router) + Supabase + Tailwind CSS v4

**Key files:**
- `lib/supabaseClient.js` — single shared Supabase client, imported across all pages
- `.env.local` — holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (gitignored)
- `supabase/functions/send-event-notification/index.ts` — Deno edge function that sends email notifications via Gmail SMTP when an event is created

**App Router pages (`app/`):**

| Route | Purpose |
|---|---|
| `/` | Landing page with Login / Sign Up links |
| `/login` | Supabase auth login |
| `/signup` | Supabase auth signup |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset confirmation |
| `/account` | Profile setup/edit (required before accessing dashboard) |
| `/dashboard` | Main user view — lists events filtered by the user's role/unit/year/section |
| `/admin` | Admin-only — manage which users can create events |
| `/events/create` | Create a new event (requires `can_create_events` permission) |
| `/events/edit/[id]` | Edit an existing event (creator only) |

All pages are client components (`'use client'`). Auth is checked on mount via `supabase.auth.getUser()` with `router.push('/login')` as the fallback.

## Supabase Database

**Tables:**
- `profiles` — extends auth users. Key fields: `is_admin`, `can_create_events`, `user_role` (`student` | `faculty` | `staff` | `guest`), `unit`, `year`, `section`, `position`, `signature_url`, `photo_consent`, `social_media_consent`
- `events` — fields: `title`, `description`, `start_time`, `end_time`, `location`, `created_by`, `target_roles[]`, `target_units[]`, `target_year_levels[]`, `target_sections[]`

**RPC:** `now()` — returns server time; used to sync a client-side clock for accurate event status display.

## User Roles & Access

User role is auto-determined from email domain in `account/page.js`:
- `@student.dmmmsu.edu.ph` → `student`
- `@dmmmsu.edu.ph` → `faculty` or `staff` (set manually in profile)
- anything else → `guest`

Profile completeness is enforced on dashboard load — incomplete profiles are redirected to `/account`.

Event visibility on the dashboard is filtered client-side: events with no `target_roles` are public; otherwise the user's `user_role`, `unit`, `year`, and `section` must match.

## Edge Function

`supabase/functions/send-event-notification/` is a Deno function deployed to Supabase. It is invoked fire-and-forget from the create event page after a successful insert. It requires two Supabase secrets: `GMAIL_USER` and `GMAIL_APP_PASSWORD`. Only sends emails for targeted (non-public) events.

## Deployment

- Hosted on **Vercel** — auto-deploys on push to `main`
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be set in Vercel project settings

## Commit & Push Discipline

- Commit after every meaningful unit of work — finishing a component, fixing a bug, updating the schema, writing a utility function
- Push to GitHub after every commit — do not accumulate local commits without pushing
- Never end a working session without committing and pushing — all progress must be on GitHub before stopping
- If a task is too large to finish in one sitting, commit partial work with a `wip:` prefix on the commit message
- Before starting any new task, always run `git status` first — if there are uncommitted changes, commit and push them before moving on
