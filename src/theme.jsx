export const C = {
  bg: "#131F19",
  bg2: "#0E1712",
  panel: "#1C2B22",
  panel2: "#24382C",
  panel3: "#2C4234",
  chalk: "#EDEAE0",
  chalkDim: "#AAB8A6",
  chalkFaint: "rgba(237,234,224,0.45)",
  amber: "#E0872C",
  amberDim: "#B96C22",
  amberInk: "#241505",
  sage: "#79A07A",
  red: "#C4453A",
  line: "rgba(237,234,224,0.14)",
};

let idCounter = 1;
export const uid = () => idCounter++;

// Persisted state can contain ids created in a previous session. Bump the
// counter past the highest id we find so newly created items never collide
// with restored ones.
export function recoverIdCounter(persistedState) {
  const matches = JSON.stringify(persistedState || {}).matchAll(/"id":(\d+)/g);
  let max = 0;
  for (const m of matches) max = Math.max(max, Number(m[1]));
  if (max >= idCounter) idCounter = max + 1;
}

export function addItem(setItems, text) {
  if (!text.trim()) return;
  setItems((items) => [...items, { id: uid(), text: text.trim(), done: false }]);
}
export function toggleItem(setItems, id) {
  setItems((items) => items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
}
export function removeItem(setItems, id) {
  setItems((items) => items.filter((i) => i.id !== id));
}
export function createDiagram(name, category = "offense") {
  return { id: uid(), name, category, markers: [], lines: [] };
}

export const DRILL_CATEGORIES = [
  { key: "dribbling", label: "Dribbling", color: "sage" },
  { key: "shooting", label: "Shooting", color: "amber" },
  { key: "passing", label: "Passing", color: "sage" },
  { key: "rebounding", label: "Rebounding", color: "red" },
  { key: "offense", label: "Offense", color: "amber" },
  { key: "defense", label: "Defense", color: "red" },
  { key: "inbound", label: "Inbound / Tip-off", color: "sage" },
  { key: "press", label: "Press / Press Break", color: "red" },
  { key: "conditioning", label: "Conditioning", color: "dim" },
];

export function defaultDrills() {
  return [
    { id: uid(), name: "Stationary Ball Handling", category: "dribbling", duration: 5, description: "Pound dribbles, crossovers, and figure-8s between the legs while standing in place.", beginnerTip: "Slow the pace and watch the ball until control improves.", advancedTip: "Add a tennis-ball toss with the off hand, or close your eyes for a few reps." },
    { id: uid(), name: "Two-Ball Dribbling", category: "dribbling", duration: 6, description: "Dribble two balls at once to build control and rhythm in both hands.", beginnerTip: "Start with both balls bouncing together before alternating.", advancedTip: "Add movement — dribble both balls while jogging the length of the floor." },
    { id: uid(), name: "Form Shooting", category: "shooting", duration: 6, description: "Close-range one-hand shooting focused on elbow alignment and follow-through.", beginnerTip: "Start right under the rim with a one-hand push shot, no jump.", advancedTip: "Move to mid-range and add a shot-fake before the release." },
    { id: uid(), name: "Spot Shooting", category: "shooting", duration: 8, description: "Shoot from five spots around the arc, moving to the next spot after each make.", beginnerTip: "Shorten the distance and allow a dribble before shooting.", advancedTip: "Add a hand in the shooter's face, or require 2 makes before rotating." },
    { id: uid(), name: "Partner Passing", category: "passing", duration: 6, description: "Chest, bounce, and overhead passes back and forth with a partner.", beginnerTip: "Stand closer together and use two hands on every pass.", advancedTip: "Add movement, one-hand passes, or a defender in the passing lane." },
    { id: uid(), name: "Keep Away", category: "passing", duration: 6, description: "Two or three offensive players pass around a defender in the middle.", beginnerTip: "Widen the space and slow the pace so the passer has more time.", advancedTip: "Shrink the space and add a shot-clock style time limit per turn." },
    { id: uid(), name: "Box Out Drill", category: "rebounding", duration: 6, description: "Find a body on the shot, seal, and secure the rebound.", beginnerTip: "Start already in contact with a coach toss, no live shot.", advancedTip: "Make it live off a missed shot with two offensive rebounders crashing." },
    { id: uid(), name: "War Drill", category: "rebounding", duration: 5, description: "Two players battle for position on a ball tossed off the backboard.", beginnerTip: "Toss the ball softer and reward positioning over physicality.", advancedTip: "Add a third player, or require a score right after securing it." },
    { id: uid(), name: "3-Man Weave", category: "offense", duration: 8, description: "Continuous passing and cutting down the floor to build spacing and finishing.", beginnerTip: "Walk through the pattern first before adding speed.", advancedTip: "Add a trailing defender to finish through contact." },
    { id: uid(), name: "Give and Go", category: "offense", duration: 6, description: "Pass to a teammate, cut to the basket, and look for the return pass.", beginnerTip: "Coach feeds the first pass so players focus only on the cut.", advancedTip: "Add a defender who can jump the passing lane." },
    { id: uid(), name: "Pick and Roll", category: "offense", duration: 10, description: "Ball handler works off a screen; screener rolls to the rim.", beginnerTip: "Walk through screen angle and roll timing with no defense.", advancedTip: "Add a hard hedge or switch for the ball handler to read." },
    { id: uid(), name: "Fast Break Layups", category: "offense", duration: 7, description: "Outlet pass into a 2-on-1 or 3-on-2 break, finishing at speed.", beginnerTip: "Start with a 2-on-0 break, no defensive pressure.", advancedTip: "Make it 3-on-2 or 2-on-1 with a trailing defender." },
    { id: uid(), name: "Shell Drill", category: "defense", duration: 10, description: "Four defenders rotate on ball and help-side positioning as the ball is passed around the perimeter.", beginnerTip: "Slow the ball movement and call out rotations out loud.", advancedTip: "Speed up ball reversals and require full closeouts on every pass." },
    { id: uid(), name: "Closeout Drill", category: "defense", duration: 6, description: "Sprint out to a shooter under control and contest without fouling.", beginnerTip: "Start closer to the shooter with a shorter sprint.", advancedTip: "Add a live 1-on-1 right after the closeout." },
    { id: uid(), name: "Zig-Zag Defense", category: "defense", duration: 8, description: "One-on-one ball pressure the full length of the floor, staying in a defensive stance.", beginnerTip: "Slow the offensive player's pace and reset if beaten.", advancedTip: "Add a live finish at the rim after the zig-zag." },
    { id: uid(), name: "Baseline Inbound Play", category: "inbound", duration: 6, description: "A quick-hitting action off a made basket to beat the defense down the floor.", beginnerTip: "Walk through the cuts with no defenders.", advancedTip: "Add full defense and a 5-second inbound clock." },
    { id: uid(), name: "Jump Ball Setup", category: "inbound", duration: 4, description: "Tip placement and teammate positioning for the opening tip-off.", beginnerTip: "Have the jumper simply tip to a stationary target.", advancedTip: "Add a live scramble for possession right after the tip." },
    { id: uid(), name: "2-2-1 Full Court Press", category: "press", duration: 10, description: "Structured full-court pressure defense forcing the ball toward the sideline.", beginnerTip: "Walk through positioning with no live ball.", advancedTip: "Add a shot clock and live offense trying to break it." },
    { id: uid(), name: "4-Man Press Break", category: "press", duration: 8, description: "Spacing and outlet passing to beat full-court pressure.", beginnerTip: "Start with no defenders — just spacing and passing rhythm.", advancedTip: "Add a live 2-2-1 press trying to trap and steal." },
    { id: uid(), name: "Suicides", category: "conditioning", duration: 5, description: "Baseline-to-baseline sprint sets, touching each line.", beginnerTip: "Reduce reps or extend the rest between sets.", advancedTip: "Add a ball-handling requirement while sprinting." },
    { id: uid(), name: "Defensive Slide Conditioning", category: "conditioning", duration: 5, description: "Continuous lateral slides in a defensive stance for stamina and footwork.", beginnerTip: "Shorten the distance and allow standing rest breaks.", advancedTip: "Add direction changes on a whistle and extend the work time." },
  ];
}
export function defaultWarmups() {
  return [
    { id: uid(), name: "Arm Circles", category: "stretch", duration: 1, description: "Small to large circles forward and backward to loosen the shoulders." },
    { id: uid(), name: "Leg Swings", category: "stretch", duration: 2, description: "Front-to-back and side-to-side swings, holding a wall or teammate for balance." },
    { id: uid(), name: "Torso Twists", category: "stretch", duration: 1, description: "Rotate the trunk side to side to warm up the core and lower back." },
    { id: uid(), name: "Standing Hamstring Stretch", category: "stretch", duration: 2, description: "Reach toward the toes with a soft knee to loosen the hamstrings." },
    { id: uid(), name: "Ankle Rolls", category: "stretch", duration: 1, description: "Roll each ankle both directions to prep for quick cuts and stops." },
    { id: uid(), name: "High Knees", category: "exercise", duration: 2, description: "Jog in place driving the knees up to raise heart rate." },
    { id: uid(), name: "Butt Kicks", category: "exercise", duration: 2, description: "Jog kicking heels toward the glutes to activate the hamstrings." },
    { id: uid(), name: "Jumping Jacks", category: "exercise", duration: 2, description: "Full-body movement to get blood flowing before drills start." },
    { id: uid(), name: "Lateral Shuffles", category: "exercise", duration: 2, description: "Low, wide shuffles side to side to fire up defensive footwork." },
    { id: uid(), name: "Layup Line Jog", category: "exercise", duration: 3, description: "Easy jog through a layup line to finish warming up while touching the ball." },
  ];
}

export function categoryAccent(colorKey) {
  if (colorKey === "sage") return C.sage;
  if (colorKey === "amber") return C.amber;
  if (colorKey === "red") return C.red;
  return C.chalkDim;
}

export function BasketballIcon({ cx, cy, r }) {
  const x0 = cx - r, x1 = cx + r, y0 = cy - r, y1 = cy + r;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#E8791F" stroke="#7A3D0F" strokeWidth={r * 0.09} />
      <line x1={x0} y1={cy} x2={x1} y2={cy} stroke="#3A1F0A" strokeWidth={r * 0.09} />
      <line x1={cx} y1={y0} x2={cx} y2={y1} stroke="#3A1F0A" strokeWidth={r * 0.09} />
      <path d={`M ${cx} ${y0} Q ${cx + r * 0.65} ${cy - r * 0.5} ${cx + r * 0.65} ${cy} Q ${cx + r * 0.65} ${cy + r * 0.5} ${cx} ${y1}`} fill="none" stroke="#3A1F0A" strokeWidth={r * 0.08} />
      <path d={`M ${cx} ${y0} Q ${cx - r * 0.65} ${cy - r * 0.5} ${cx - r * 0.65} ${cy} Q ${cx - r * 0.65} ${cy + r * 0.5} ${cx} ${y1}`} fill="none" stroke="#3A1F0A" strokeWidth={r * 0.08} />
      <ellipse cx={cx - r * 0.35} cy={cy - r * 0.4} rx={r * 0.3} ry={r * 0.18} fill="#FFFFFF" opacity="0.22" />
    </g>
  );
}
