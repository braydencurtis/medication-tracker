# Penny's Meds

A shared medication tracker for Penny the cat's diabetes medication. Both phones sync in real time via Supabase.

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Copy your **Project URL** and **anon public** key from **Settings → API**

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Both phones need to use the same `.env` values — they share one Supabase project.

### 3. Install and run

```bash
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

### 4. First launch

Each phone asks for your name on first launch so doses show "Given by Brayden" vs "Given by [her name]". Stored locally on each device.

## Features

- **Today tab** — See all of Penny's medications for today. Tap "Give dose" to log it. Shows who gave it and when.
- **Medications tab** — Add, edit, or deactivate medications. Supports 1–4 doses per day with individual reminder times.
- **Real-time sync** — Both phones update instantly when a dose is logged.
- **Daily reminders** — Local push notifications at the times you set. Auto-cancelled when a dose is given.
- **Daily reset** — Doses are date-based, so every day starts fresh automatically.

## Sharing with your girlfriend

The easiest way is to share via [Expo Go](https://expo.dev/go):

1. Run `npx expo start` on your computer
2. She opens Expo Go and scans the QR code
3. For a permanent install without needing your computer, build with `eas build`

## Tech stack

- [Expo](https://expo.dev) + [Expo Router](https://expo.github.io/router)
- [Supabase](https://supabase.com) (real-time database)
- TypeScript
