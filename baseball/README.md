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

## Access gate (optional)

Coaches who buy through the Stripe payment link get in automatically. Anyone else registers and waits for your approval.

1. In Stripe, create a restricted key with **Checkout Sessions: Read**.
2. Edit both Baseball Notepad payment links (single and Club License). Under **After payment**, choose **Don't show confirmation page** and redirect to `https://baseball-notepad.vercel.app/?session_id={CHECKOUT_SESSION_ID}`.
3. Add these Vercel environment variables (Production): `VITE_ACCESS_GATE=on`, `VITE_STRIPE_PAYMENT_LINK` (the link shown on **Buy now**), `STRIPE_SECRET_KEY`, `STRIPE_PRODUCT_ID=prod_VJonrNbgjcJPts`, and `ACCESS_ADMIN_KEY` (a random string of 16+ characters). Upstash must be connected (step 2 above).
4. Redeploy. Open `https://baseball-notepad.vercel.app/?admin` and sign in with `ACCESS_ADMIN_KEY` to approve requests, create codes, or revoke codes.

Each buyer or approved coach gets a code like `ABCD-EFGH-JKMN`, which works on any device. The Buy card shows "Founding coach: X of 100 spots left", counting working access codes (paid, approved, or granted; revoked codes free their spot). Once it hits the cap it says "Founding spots are gone" and sales continue. To open more spots, set `FOUNDING_CAP` (e.g. `200`) and redeploy.

Demo deployments (any hostname containing `demo`) and builds without `VITE_ACCESS_GATE=on` stay open.

Data stays in the browser. Use the header's backup (download) and restore (upload) buttons to move it between devices.
