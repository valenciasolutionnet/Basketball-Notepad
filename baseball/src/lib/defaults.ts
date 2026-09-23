import type { Drill, DrillCategory } from "./types";
import { uid } from "./id";

export const DRILL_CATEGORIES: { key: DrillCategory; label: string }[] = [
  { key: "hitting", label: "Hitting" },
  { key: "fielding", label: "Fielding" },
  { key: "throwing", label: "Throwing" },
  { key: "pitching", label: "Pitching" },
  { key: "catching", label: "Catching" },
  { key: "baserunning", label: "Baserunning" },
  { key: "situational", label: "Situational" },
  { key: "conditioning", label: "Conditioning" },
];

type Seed = Omit<Drill, "id">;

const SEED: Seed[] = [
  { name: "Tee Work", category: "hitting", duration: 10, description: "Hitters take swings off a tee, working inside, middle, and away tee placements.", coachingPoint: "Hands inside the ball; finish balanced and hold the follow-through." },
  { name: "Soft Toss", category: "hitting", duration: 10, description: "Coach or partner tosses from a 45° angle into a net.", coachingPoint: "Toss to the front hip. Eyes stay on the contact point after the ball leaves." },
  { name: "Front Toss / Short BP", category: "hitting", duration: 15, description: "Underhand toss from behind an L-screen at 15–20 feet.", coachingPoint: "Call a zone before each round — hunt one pitch location." },
  { name: "Bunting Stations", category: "hitting", duration: 8, description: "Sacrifice and drag bunts to targets placed down each line.", coachingPoint: "Top of the zone only; bat angle, not arms, directs the ball." },
  { name: "Ground Ball Fundamentals", category: "fielding", duration: 10, description: "Rolled grounders focusing on ready position, fielding triangle, and footwork to throw.", coachingPoint: "Glove out front, butt down, funnel to the belly button." },
  { name: "Short Hops", category: "fielding", duration: 6, description: "Partners throw short hops to each other from 15 feet.", coachingPoint: "Glove through the ball, not stabbing at it." },
  { name: "Fly Ball Communication", category: "fielding", duration: 10, description: "Fungo fly balls between two or three fielders who must call the ball.", coachingPoint: "Call it three times loud. Center fielder has priority." },
  { name: "Infield / Outfield Routine", category: "fielding", duration: 15, description: "Full pregame-style fungo round to every position with throws to bases.", coachingPoint: "Crisp throws to the chest; backups move on every ball." },
  { name: "Progressive Throwing", category: "throwing", duration: 10, description: "Wrist flicks → one-knee → standing → long toss, extending distance each step.", coachingPoint: "Four-seam grip, point the glove shoulder, finish over the front leg." },
  { name: "Quick Hands Relay", category: "throwing", duration: 6, description: "Lines of players race a ball down the line with catch-and-release throws.", coachingPoint: "Catch on the throwing-side shoulder, feet already turning." },
  { name: "Bullpen: Fastball Command", category: "pitching", duration: 12, description: "Controlled bullpen split between glove side and arm side targets.", coachingPoint: "Log every pitch in Pitch Count — bullpens count toward arm care." },
  { name: "Towel Drill", category: "pitching", duration: 6, description: "Dry mechanics with a towel to reinforce extension and finish.", coachingPoint: "Stride direction to the plate; towel snaps out front, not above the head." },
  { name: "Pitchers' Fielding Practice", category: "pitching", duration: 10, description: "Comebackers, covering first on grounders to the right side, and bunt coverage.", coachingPoint: "Every ball to the right side: pitcher breaks toward first." },
  { name: "Blocking Balls in the Dirt", category: "catching", duration: 8, description: "Coach throws balls in the dirt; catcher drops and smothers.", coachingPoint: "Chin down, glove between the knees, round the shoulders toward the plate." },
  { name: "Framing and Receiving", category: "catching", duration: 6, description: "Receive pitches at the edges and hold the glove still.", coachingPoint: "Catch the outside half of the ball; quiet glove." },
  { name: "Pop Time Transfers", category: "catching", duration: 6, description: "Catch-to-throw transfers to second with footwork reps.", coachingPoint: "Transfer in front of the chest, short feet, throw through the bag." },
  { name: "Home to First", category: "baserunning", duration: 6, description: "Sprint through first after contact from the batter's box.", coachingPoint: "Hit the front of the bag, run through, look right for the overthrow." },
  { name: "Rounding the Bases", category: "baserunning", duration: 6, description: "Banana-turn rounding first into second on a single to the outfield.", coachingPoint: "Belly-in before the bag, touch the inside corner." },
  { name: "Leads and Reads", category: "baserunning", duration: 8, description: "Primary and secondary leads with reads on pitcher and ball in dirt.", coachingPoint: "Walk-walk-hop on the pitch; freeze on line drives." },
  { name: "Bunt Defense", category: "situational", duration: 10, description: "Corners crash, middle infielders cover, pitcher and catcher communicate.", coachingPoint: "Catcher calls the base. Get the sure out." },
  { name: "Cutoffs and Relays", category: "situational", duration: 12, description: "Outfielders hit the cutoff; infielders align for throws home and to third.", coachingPoint: "Line up throw-side shoulder; cutoff yells 'cut' or lets it go." },
  { name: "First-and-Third Defense", category: "situational", duration: 10, description: "Defensive calls when a runner on first breaks with a runner on third.", coachingPoint: "Decide the call before the pitch. Look the runner back." },
  { name: "Live Scrimmage Innings", category: "situational", duration: 20, description: "Game-speed innings with coaching pauses to teach situations.", coachingPoint: "Freeze the play when a decision was wrong; ask the player first." },
  { name: "Base Sprints", category: "conditioning", duration: 6, description: "Timed sprints home-to-first, first-to-third, and home-to-home.", coachingPoint: "Track times weekly in the player notes." },
];

export function defaultDrills(): Drill[] {
  return SEED.map((d) => ({ ...d, id: uid() }));
}
