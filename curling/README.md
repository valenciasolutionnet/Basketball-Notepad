# Curling Notepad

A Valencia Solution coaching app for curling. It follows the same Plan → Deliver → Game → Review flow as Basketball Notepad and Baseball Notepad.

| Phase | Tabs |
| --- | --- |
| **Plan** | Targets · Roster (positions, throwing hand, delivery notes) · Attendance · Lineup (Lead/Second/Vice/Skip/Alternate, throwing order, who holds the broom, printable) · Logistics (ice time, sheet, equipment) |
| **Deliver** | Practice Plan (countdown timer per block) · Drill Library (22 curling drills across 6 categories) · Sheet Board (drag red/yellow stones, the skip's broom, shot paths) |
| **Game** | End-by-end scoring with hammer tracking (the scoring team gives up the hammer; a blank end keeps it), extra ends when tied, and a 0–4 rating for each of our eight stones per end with live shot percentages. Undo. |
| **Review** | Reflect (coach and team ratings, notes) · Season (W-L, per-player draw/hit/overall shot %) · Trends (charts) |

Shot percentage uses the standard scoring: each stone is rated 0–4, and a player's percentage is their rating points divided by 4 × shots (see `src/lib/stats.ts`).

## Stack

TypeScript, React 18, Zustand (persisted to `localStorage`), Tailwind CSS v4, Vite, and Vitest. Coaching data, including the live game, stays on the device. One Vercel function (`api/access.ts`) runs the optional access gate through Upstash Redis.

## Develop

```
cd curling
npm install
npm run dev        # app
npm test           # rules engine: hammer, extra ends, shot %, lineup
npm run build      # typecheck + production build
```

## Deploy (Vercel CLI)

The app deploys as two Vercel projects from this folder: `curling-notepad` (production) and `curling-notepad-demo` (demo).

```
cd Basketball-Notepad\curling
npx vercel link          # choose the curling-notepad project
npx vercel --prod
```

For the demo, link the same folder to `curling-notepad-demo` and deploy again:

```
npx vercel link --project curling-notepad-demo
npx vercel --prod
```

Vercel detects the Vite preset on its own. Any hostname that contains `demo` (such as `curling-notepad-demo.vercel.app`) opens with a sample team, lineup, practice plan, and three finished games the first time it loads, and shows a **Demo** badge in the header. Production starts empty.

Data stays in the browser. Use the header's backup (download) and restore (upload) buttons to move it between devices.

## Access gate (optional)

Coaches who buy through the Stripe payment link get in automatically. Anyone else registers and waits for your approval.

1. Connect an Upstash Redis database in the `curling-notepad` project's **Storage** tab, or add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` yourself.
2. In Stripe, create a restricted key with **Checkout Sessions: Read**. Both Curling Notepad payment links (single and Club License) already redirect to `https://curling-notepad.vercel.app/?session_id={CHECKOUT_SESSION_ID}`.
3. Add these Vercel environment variables (Production): `VITE_ACCESS_GATE=on`, `VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/dRmbIU9Ea8RI8ae4Ff1RC0c`, `STRIPE_SECRET_KEY`, `STRIPE_PRODUCT_ID=prod_VJooZbmpNnCDxk`, and `ACCESS_ADMIN_KEY` (a random string of 16+ characters).
4. Redeploy. Open `https://curling-notepad.vercel.app/?admin` and sign in with `ACCESS_ADMIN_KEY` to approve requests, create codes, or revoke codes.

The demo project never shows the gate.
