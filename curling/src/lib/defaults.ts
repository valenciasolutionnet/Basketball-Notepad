import type { Drill, DrillCategory } from "./types";
import { uid } from "./id";

export const DRILL_CATEGORIES: { key: DrillCategory; label: string }[] = [
  { key: "delivery", label: "Delivery" },
  { key: "sweeping", label: "Sweeping" },
  { key: "draw", label: "Draw weight" },
  { key: "takeout", label: "Takeouts" },
  { key: "line", label: "Line calling" },
  { key: "strategy", label: "Strategy" },
];

type Seed = Omit<Drill, "id">;

const SEED: Seed[] = [
  { name: "Line-of-Delivery Slides", category: "delivery", duration: 10, description: "Slide out of the hack with a stone toward a broom held on the centre line at the far tee. A partner stands behind the hack to check that the stone, sliding foot, and head stay on the line.", coachingPoint: "Push straight at the broom — the hips follow the eyes, so keep them on the target." },
  { name: "Balance Slides (No Stone)", category: "delivery", duration: 8, description: "Slides with the stabilizer or broom only and the throwing arm held out in front, holding the slide position as long as possible.", coachingPoint: "Weight over the sliding foot, trailing leg flat behind; no pressure on the stabilizer." },
  { name: "Handle Turn Release", category: "delivery", duration: 8, description: "Short slides alternating in-turn and out-turn releases, the handle starting at 10 or 2 o'clock and finishing at 12.", coachingPoint: "Turn the handle gently through the release — aim for two to three rotations over the length of the sheet." },
  { name: "Hog-Line Release Check", category: "delivery", duration: 6, description: "Deliveries at draw weight with a partner watching the near hog line to confirm the stone is released cleanly before it.", coachingPoint: "Release early and let the stone go; chasing it to the line costs line and weight." },
  { name: "Flat-Foot Hack Setup", category: "delivery", duration: 6, description: "Set up in the hack, rise, and draw back without sliding. Check hips square to the broom and the stone in line with the sliding foot.", coachingPoint: "Same setup every time — a repeatable start makes a repeatable delivery." },
  { name: "Split-Time Sweeping", category: "sweeping", duration: 12, description: "Sweepers time each stone from the back line (or tee line) to the near hog line with a stopwatch and call its expected weight before the stone reaches the far house.", coachingPoint: "Compare every split against the team's draw split for this sheet — call weight early and often." },
  { name: "Brush-Head Pressure", category: "sweeping", duration: 8, description: "Sweepers work in pairs beside a moving stone, focusing on body weight over the head and fast, short strokes directly in front of the stone.", coachingPoint: "Pressure beats speed: stack the shoulders over the head of the brush." },
  { name: "Sweep Call Communication", category: "sweeping", duration: 10, description: "The skip calls line (\"hard\", \"off\", \"clean\") while the sweepers call weight numbers back, on every delivered stone.", coachingPoint: "Line belongs to the skip, weight belongs to the sweepers — both talk on every stone." },
  { name: "Draw to the Button", category: "draw", duration: 12, description: "Each player throws eight draws to the button. Score each stone by ring (button, 4 ft, 8 ft, 12 ft) and keep a running total.", coachingPoint: "Watch the split every time — build a feel for draw weight on today's ice." },
  { name: "Weight Zone Calls", category: "draw", duration: 12, description: "The skip calls a zone (guard, top 12, top 4, tee, back 4, back 12) and the thrower delivers to it. Rotate throwers every two stones.", coachingPoint: "The whole team uses the same zone words; a shared language makes sweeping calls quick." },
  { name: "Come-Around a Guard", category: "draw", duration: 12, description: "Place a centre guard in front of the house and draw around it to the four-foot, alternating in-turn and out-turn.", coachingPoint: "Pick the ice for the turn — too narrow and you hit the guard, too wide and you are in the open." },
  { name: "Freeze Drill", category: "draw", duration: 10, description: "Place a stone in the four-foot; players draw to freeze against it without moving it more than a few inches.", coachingPoint: "Weight is everything; sweepers bring it in, they never push it through." },
  { name: "Hit-and-Roll", category: "takeout", duration: 12, description: "Throw takeouts at a target stone and roll the shooter behind a guard or to a marked spot in the house.", coachingPoint: "Hit the target stone half — thin hits roll farther, full hits stop." },
  { name: "Peel Weight", category: "takeout", duration: 10, description: "Remove a guard with peel weight so both the guard and the shooter roll out of play.", coachingPoint: "Peels need full weight and a thick hit — no half measures." },
  { name: "Hit and Stay", category: "takeout", duration: 10, description: "Take out a stone on the button and keep the shooter in the house.", coachingPoint: "Nose hit with control weight; the shooter stops where the target was." },
  { name: "Takeout Weight Ladder", category: "takeout", duration: 10, description: "Throw the same takeout at control, normal, and peel weight in sequence while sweepers call the split for each.", coachingPoint: "Name the weight before you go into the hack." },
  { name: "Broom Target Drill", category: "line", duration: 10, description: "The skip holds the broom at different positions; the thrower delivers to it and the skip reports how far the stone was released off the broom.", coachingPoint: "Throwing off the broom is a miss no matter the result — hit the broom every time." },
  { name: "Ice Reading: Both Turns", category: "line", duration: 12, description: "Throw draws on both sides of the sheet with both turns and note how much each stone curls. Record reads in the Sheet Board.", coachingPoint: "Ice changes through an end and a game — read it early and read it again." },
  { name: "Line Calling with Sweepers", category: "line", duration: 10, description: "The skip calls only line (\"hard\", \"off\") while the sweepers hold weight. Stones finish at marked targets inside the house.", coachingPoint: "Call early — once a stone has curled, sweeping can't bring it back." },
  { name: "Tee-Line Guard Placement", category: "strategy", duration: 10, description: "Place corner guards with the hammer and centre guards without it, all in the Free Guard Zone between the hog line and the house.", coachingPoint: "With hammer, play to the sides; without it, clog the centre line." },
  { name: "Free Guard Zone Scenarios", category: "strategy", duration: 12, description: "Run the first five stones of an end under the five-rock rule: guards in the Free Guard Zone can't be removed by the opponents before the sixth stone.", coachingPoint: "Know which stones are protected before calling a hit." },
  { name: "Hammer Management Ends", category: "strategy", duration: 15, description: "Play situational ends: tied with hammer, one up without hammer, last end down one. Decide when to blank to keep the hammer.", coachingPoint: "With hammer, aim for two or blank; without it, force them to one or steal." },
];

export function defaultDrills(): Drill[] {
  return SEED.map((d) => ({ ...d, id: uid() }));
}
