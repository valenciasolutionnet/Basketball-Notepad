# Basketball Notepad

A coach's practice planner: Plan a session, deliver it on the floor, track a
live game, and review afterwards — with trends over time.

## Run locally

```
npm install
npm run dev
```

The Live Game tab's cross-device sync calls `/api/game`, which only exists
when the app is served by Vercel (locally via `vercel dev`, or once
deployed). Under plain `npm run dev` you can still use the Live Game tab on
a single tablet — starting/joining a game will just report a sync error
until it's running behind that API route.

## Deploy to Vercel

1. Push this repo to GitHub and import it into Vercel (Framework Preset:
   Vite — auto-detected).
2. Create a free Redis database, e.g. at [upstash.com](https://upstash.com)
   (or via Vercel's Storage/Marketplace tab), and copy its **REST URL** and
   **REST token**.
3. In the Vercel project's Settings → Environment Variables, add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy. The Live Game tab now syncs score, stats, and coach messages
   between any devices that enter the same game code.

See `.env.example` for the local equivalent (used by `vercel dev`).
