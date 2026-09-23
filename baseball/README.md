# Baseball Notepad

A Valencia Solution coaching app for baseball. It follows the same Plan → Deliver → Game → Review flow as Basketball Notepad.

| Phase | Tabs |
| --- | --- |
| **Plan** | Targets · Roster (numbers, positions, B/T, league age, notes) · Attendance · Lineup (batting order + inning-by-inning defense with fair auto-rotation, printable) · Pitch Count (arm-care availability, rest days) · Logistics |
| **Deliver** | Practice Plan (countdown timer per block) · Drill Library (24 baseball drills across 8 categories) · Diamond Board (drag fielders, runners, throw/run arrows) |
| **Game** | Pitch-by-pitch live scoring: count, outs, bases, line score, box score, our pitcher's count against the daily max, dugout messages, undo. Other coaches join with a 5-letter code. |
| **Review** | Reflect (coach and team ratings, notes) · Season (W-L, AVG/OBP/SLG/OPS, pitches) · Trends (charts) |

Pitch limits and rest days follow Little League Baseball regular-season rules (see `src/lib/pitching.ts`). The app tells coaches to check them against their own league's rulebook.

## Stack

TypeScript, React 18, Zustand (persisted to `localStorage`), Tailwind CSS v4, Vite, and Vitest. A single Vercel function (`api/game.ts`) syncs live games through Upstash Redis.

## Develop

```
cd baseball
npm install
npm run dev        # app (live sync falls back to this device only)
npm test           # rules engine: pitching, scoring, lineup rotation
npm run build      # typecheck + production build
```

## Deploy (Vercel)

1. Import the repo into Vercel and set **Root Directory** to `baseball`. Vercel detects the Vite preset on its own.
2. Add an Upstash Redis database. Either connect it from the Vercel project's **Storage** tab (this sets the `KV_REST_API_*` variables), or create it at upstash.com and add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as environment variables.
3. Deploy. If those variables are missing, Live Game still works on a single device.

Data stays in the browser. Use the header's backup (download) and restore (upload) buttons to move it between devices.
