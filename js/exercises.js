/* ============================================================================
 * EXERCISE LIBRARY
 * Built on evidence-based hypertrophy principles popularized by Jeff Nippard
 * and the TNF ("Total Body – Neglect Free") philosophy: train every muscle
 * group through a full range of motion, prioritize the stretched position,
 * keep 1–3 reps in reserve (RIR) on most sets, and drive progressive overload.
 *
 * muscle keys used throughout the app:
 *   chest, back, lats, traps, sideDelts, rearDelts, frontDelts,
 *   biceps, triceps, forearms, quads, hamstrings, glutes, calves, abs
 * ==========================================================================*/

const MUSCLES = {
  chest:      { label: "Chest",         color: "#ff6b35" },
  back:       { label: "Back (Lats/Mid)", color: "#4dabf7" },
  sideDelts:  { label: "Side Delts",    color: "#9775fa" },
  rearDelts:  { label: "Rear Delts",    color: "#845ef7" },
  frontDelts: { label: "Front Delts",   color: "#b197fc" },
  biceps:     { label: "Biceps",        color: "#f783ac" },
  triceps:    { label: "Triceps",       color: "#ff8787" },
  quads:      { label: "Quads",         color: "#51cf66" },
  hamstrings: { label: "Hamstrings",    color: "#94d82d" },
  glutes:     { label: "Glutes",        color: "#fcc419" },
  calves:     { label: "Calves",        color: "#ffd43b" },
  abs:        { label: "Abs / Core",    color: "#22b8cf" },
};

// Weekly set targets per muscle (sets/week). Nippard's rule of thumb:
// ~10–20 hard sets per muscle per week, frequency ≥ 2x/week.
const VOLUME_TARGETS = {
  chest:      { min: 12, max: 18, freq: 2 },
  back:       { min: 14, max: 20, freq: 2 },
  sideDelts:  { min: 12, max: 20, freq: 2 },
  rearDelts:  { min: 8,  max: 16, freq: 2 },
  frontDelts: { min: 6,  max: 12, freq: 2 }, // gets lots of indirect work from pressing
  biceps:     { min: 10, max: 18, freq: 2 },
  triceps:    { min: 10, max: 18, freq: 2 },
  quads:      { min: 12, max: 18, freq: 2 },
  hamstrings: { min: 10, max: 16, freq: 2 },
  glutes:     { min: 8,  max: 16, freq: 2 },
  calves:     { min: 10, max: 18, freq: 2 },
  abs:        { min: 8,  max: 16, freq: 2 },
};

/* Each exercise:
 *  id, name, primary[], secondary[], equipment, type (compound|isolation),
 *  pattern, sets[default], repRange[min,max], rir,
 *  description, cues[], nippard (a science note)
 */
const EXERCISES = [
  /* ---------------------------- CHEST ---------------------------------- */
  {
    id: "barbell-bench",
    name: "Barbell Bench Press",
    primary: ["chest"], secondary: ["triceps", "frontDelts"],
    equipment: "Barbell", type: "compound", pattern: "horizontal-push",
    sets: 4, repRange: [5, 8], rir: 2,
    description: "The foundational horizontal press for raw upper-body pushing strength and mid/lower chest mass.",
    cues: [
      "Retract and depress the shoulder blades — 'put them in your back pockets' and keep them pinned the whole set.",
      "Slight arch, feet driven into the floor, bar touches just below the nipple line.",
      "Tuck elbows to ~45–75°, don't flare to 90°.",
      "Lower under control (~2s), pause lightly on the chest, drive up explosively."
    ],
    nippard: "A staple for strength, but the flat bench limits the deep chest stretch. Pair it with a fly or deep-stretch press for full hypertrophy."
  },
  {
    id: "incline-db-press",
    name: "Incline Dumbbell Press",
    primary: ["chest"], secondary: ["frontDelts", "triceps"],
    equipment: "Dumbbells", type: "compound", pattern: "incline-push",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Bench set to 30°. Biases the upper (clavicular) chest — the region most lifters under-develop.",
    cues: [
      "Keep the bench at ~30°; steeper turns it into a shoulder press.",
      "Let the dumbbells travel deep for a big stretch at the bottom.",
      "Press up and slightly inward without clanking the bells together.",
      "Don't lock out hard — keep tension on the chest."
    ],
    nippard: "Nippard consistently programs incline pressing because upper-chest fibers respond to a dedicated incline angle that flat work misses."
  },
  {
    id: "machine-chest-press",
    name: "Machine / Smith Chest Press",
    primary: ["chest"], secondary: ["triceps", "frontDelts"],
    equipment: "Machine", type: "compound", pattern: "horizontal-push",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Stable pressing pattern that lets you push close to failure safely — ideal as a hypertrophy finisher.",
    cues: [
      "Set the seat so handles line up with mid-chest.",
      "Full stretch at the back, strong squeeze at lockout.",
      "Great place to take the last set to true failure or beyond with a drop set."
    ],
    nippard: "Machines reduce the stability demand so you can chase failure with less fatigue and risk — exactly where machines beat free weights for growth."
  },
  {
    id: "cable-fly",
    name: "Cable Fly (High-to-Low)",
    primary: ["chest"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "fly",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Isolation that loads the chest hardest in the lengthened (stretched) position — a key driver of hypertrophy.",
    cues: [
      "Soft bend in the elbows, hold it constant — this is a fly, not a press.",
      "Let the arms travel back for a deep stretch, then hug toward the midline.",
      "Squeeze and hold the peak contraction for a beat."
    ],
    nippard: "Stretch-focused isolation. Research on 'lengthened partials' suggests training the stretched position is especially stimulating — cable flys nail this."
  },
  {
    id: "weighted-dip",
    name: "Chest Dip",
    primary: ["chest"], secondary: ["triceps", "frontDelts"],
    equipment: "Bodyweight", type: "compound", pattern: "vertical-push",
    sets: 3, repRange: [6, 12], rir: 2,
    description: "Lean forward and the dip becomes a brutal lower-chest builder with a huge stretch.",
    cues: [
      "Lean the torso forward ~30° to bias chest over triceps.",
      "Descend until you feel a deep stretch (shoulders to ~elbow height).",
      "Add weight via a belt once bodyweight reps exceed 12."
    ],
    nippard: "An underrated lower-chest movement. Forward lean + deep ROM = excellent stretch-mediated stimulus."
  },

  /* ---------------------------- BACK ----------------------------------- */
  {
    id: "weighted-pullup",
    name: "Pull-Up / Weighted Pull-Up",
    primary: ["back", "lats"], secondary: ["biceps", "rearDelts"],
    equipment: "Bodyweight", type: "compound", pattern: "vertical-pull",
    sets: 4, repRange: [5, 10], rir: 2,
    description: "The king of vertical pulling for lat width and overall back thickness.",
    cues: [
      "Start from a dead hang, depress the shoulder blades first ('break the bar down').",
      "Drive elbows down and back, pull the chest toward the bar.",
      "Control the negative all the way to a full hang.",
      "Add load with a belt once you pass ~10 clean reps."
    ],
    nippard: "Best stimulus-to-fatigue for lat width. If you can't do 5+, use an assisted machine or lat pulldown to build the pattern."
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    primary: ["lats", "back"], secondary: ["biceps"],
    equipment: "Cable", type: "compound", pattern: "vertical-pull",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Scalable vertical pull that lets you isolate the lats with a controllable load.",
    cues: [
      "Slight lean back (~10–20°), chest up.",
      "Initiate by pulling the shoulder blades down, then bring the bar to the upper chest.",
      "Get a full overhead stretch each rep — don't cut the top short."
    ],
    nippard: "Excellent for grooving the lat contraction. A wider grip slightly biases width; a closer/neutral grip lets you load heavier."
  },
  {
    id: "barbell-row",
    name: "Barbell Row",
    primary: ["back"], secondary: ["lats", "rearDelts", "biceps"],
    equipment: "Barbell", type: "compound", pattern: "horizontal-pull",
    sets: 4, repRange: [6, 10], rir: 2,
    description: "Heavy horizontal pull for mid-back thickness — traps, rhomboids, and lats together.",
    cues: [
      "Hinge to ~30–45° torso angle, neutral spine, brace hard.",
      "Pull to the lower ribcage / belly button, lead with the elbows.",
      "Control the eccentric; don't heave with the lower back."
    ],
    nippard: "Free-weight rows build dense mid-back. If lower-back fatigue limits you, swap for a chest-supported variation."
  },
  {
    id: "chest-supported-row",
    name: "Chest-Supported / Machine Row",
    primary: ["back"], secondary: ["lats", "rearDelts", "biceps"],
    equipment: "Machine", type: "compound", pattern: "horizontal-pull",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Removes the lower back from the equation so you can overload the mid-back directly.",
    cues: [
      "Chest pinned to the pad the entire set.",
      "Drive elbows back, squeeze the shoulder blades together at the end.",
      "Full stretch forward each rep, let the scapulae protract."
    ],
    nippard: "Nippard's go-to row for pure back hypertrophy — no fatigue leak to the spinal erectors, so you can push close to failure."
  },
  {
    id: "seated-cable-row",
    name: "Seated Cable Row (Neutral)",
    primary: ["back"], secondary: ["lats", "biceps"],
    equipment: "Cable", type: "compound", pattern: "horizontal-pull",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Constant-tension horizontal pull with a smooth stretch and contraction.",
    cues: [
      "Tall chest, minimal torso swing.",
      "Let the weight pull your arms forward for a full stretch, then row to the navel.",
      "Pause and squeeze the back at the contracted position."
    ],
    nippard: "Cables keep tension through the whole ROM, making the stretched portion of the row more effective."
  },
  {
    id: "straight-arm-pulldown",
    name: "Straight-Arm Pulldown",
    primary: ["lats"], secondary: ["back"],
    equipment: "Cable", type: "isolation", pattern: "lat-isolation",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Isolates the lats by removing the biceps — pure shoulder extension.",
    cues: [
      "Fixed slight elbow bend, hinge slightly at the hips.",
      "Pull the bar from overhead down to the thighs using only the lats.",
      "Feel the stretch up top and a hard squeeze at the bottom."
    ],
    nippard: "A great lat-isolation accessory when you want lat growth without more biceps or grip fatigue."
  },

  /* --------------------------- SHOULDERS ------------------------------- */
  {
    id: "overhead-press",
    name: "Overhead Press (Barbell)",
    primary: ["frontDelts"], secondary: ["sideDelts", "triceps"],
    equipment: "Barbell", type: "compound", pattern: "vertical-push",
    sets: 4, repRange: [5, 8], rir: 2,
    description: "The primary vertical press for boulder shoulders and pressing strength.",
    cues: [
      "Brace the core and glutes, ribs down (don't over-arch the lower back).",
      "Bar path is a slight 'J' — move the head back, then press up and slightly over.",
      "Lock out with the bar stacked over the mid-foot."
    ],
    nippard: "Front delts get plenty of work from bench too — one heavy vertical press per week is usually enough before prioritizing side delts."
  },
  {
    id: "db-shoulder-press",
    name: "Seated Dumbbell Shoulder Press",
    primary: ["frontDelts"], secondary: ["sideDelts", "triceps"],
    equipment: "Dumbbells", type: "compound", pattern: "vertical-push",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Dumbbells allow a deeper stretch and natural arc than a barbell.",
    cues: [
      "Bench upright (~80–90°), start with bells at ear height.",
      "Press up and slightly inward, don't clank at the top.",
      "Lower under control until the upper arm is just past parallel."
    ],
    nippard: "Good hypertrophy option with friendlier shoulder mechanics than a barbell for many lifters."
  },
  {
    id: "db-lateral-raise",
    name: "Dumbbell Lateral Raise",
    primary: ["sideDelts"], secondary: [],
    equipment: "Dumbbells", type: "isolation", pattern: "lateral-raise",
    sets: 4, repRange: [12, 20], rir: 1,
    description: "The single most important movement for 3D 'capped' shoulders.",
    cues: [
      "Lead with the elbows, pour-the-pitcher slight internal rotation.",
      "Raise to about shoulder height — no higher.",
      "Control the negative; resist the urge to swing.",
      "Lighter weight + strict form beats heavy cheat reps here."
    ],
    nippard: "Side delts are chronically under-trained. Nippard recommends high frequency and high volume here — they recover fast and crave it."
  },
  {
    id: "cable-lateral-raise",
    name: "Cable Lateral Raise",
    primary: ["sideDelts"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "lateral-raise",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Cable keeps tension on the side delt at the bottom where dumbbells go light.",
    cues: [
      "Stand side-on, cable set at the lowest pin.",
      "Run the cable behind the back or across the body for constant tension.",
      "Smooth, strict raises to shoulder height."
    ],
    nippard: "Constant tension makes cables arguably the best lateral-raise variation for the stretched portion of the movement."
  },
  {
    id: "reverse-pec-deck",
    name: "Reverse Pec-Deck / Cable Rear Fly",
    primary: ["rearDelts"], secondary: ["back"],
    equipment: "Machine", type: "isolation", pattern: "rear-fly",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Targets the rear delts, crucial for shoulder health and a complete 3D look.",
    cues: [
      "Lead with the pinkies, slight elbow bend held constant.",
      "Open the arms wide, squeeze the rear delts at the back.",
      "Don't let the mid-back take over — keep the movement at the shoulders."
    ],
    nippard: "Rear delts are best trained with high reps and a focus on the contraction. Most rowing leaves them under-stimulated, so isolate them directly."
  },
  {
    id: "face-pull",
    name: "Face Pull",
    primary: ["rearDelts"], secondary: ["traps", "back"],
    equipment: "Cable", type: "isolation", pattern: "rear-fly",
    sets: 3, repRange: [15, 20], rir: 1,
    description: "Rear-delt and external-rotator work that bulletproofs the shoulders.",
    cues: [
      "Rope at face height, pull toward the forehead.",
      "Externally rotate at the end — knuckles point behind you ('double biceps' finish).",
      "High reps, smooth tempo, prioritize the squeeze."
    ],
    nippard: "Excellent for posture and shoulder health alongside all the pressing volume."
  },

  /* ----------------------------- ARMS ---------------------------------- */
  {
    id: "ez-bar-curl",
    name: "EZ-Bar / Barbell Curl",
    primary: ["biceps"], secondary: ["forearms"],
    equipment: "Barbell", type: "isolation", pattern: "curl",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "The bread-and-butter biceps mass builder you can progressively overload easily.",
    cues: [
      "Elbows pinned to the sides, no swinging.",
      "Curl up, squeeze, then lower under control to a full stretch.",
      "EZ bar is easier on the wrists than a straight bar."
    ],
    nippard: "Pick the bar your wrists tolerate. The straight/EZ curl lets you load heavy and track progression cleanly."
  },
  {
    id: "incline-db-curl",
    name: "Incline Dumbbell Curl",
    primary: ["biceps"], secondary: ["forearms"],
    equipment: "Dumbbells", type: "isolation", pattern: "curl",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Arms hang behind the body, placing the biceps long head in a deep stretch.",
    cues: [
      "Bench at ~45–60°, let the arms hang straight down.",
      "Curl without letting the elbows drift forward.",
      "Emphasize the stretched bottom position."
    ],
    nippard: "Trains the biceps in the lengthened position — a strong stimulus the long head responds to especially well."
  },
  {
    id: "hammer-curl",
    name: "Hammer Curl",
    primary: ["biceps"], secondary: ["forearms"],
    equipment: "Dumbbells", type: "isolation", pattern: "curl",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Neutral grip hits the brachialis and brachioradialis to build arm thickness.",
    cues: [
      "Neutral (palms-facing) grip throughout.",
      "Keep elbows fixed, curl straight up.",
      "Can be done across the body for more brachialis."
    ],
    nippard: "The brachialis sits under the biceps — growing it pushes the biceps peak up and thickens the forearm."
  },
  {
    id: "cable-pushdown",
    name: "Triceps Cable Pushdown",
    primary: ["triceps"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "extension",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Reliable triceps isolation with constant tension and an easy strength progression.",
    cues: [
      "Elbows pinned to the sides, torso upright.",
      "Extend fully and squeeze, control the way up.",
      "Rope lets you spread the hands at the bottom for more lateral head."
    ],
    nippard: "A great pump/finisher movement that biases the lateral head — pairs well with an overhead extension for full triceps development."
  },
  {
    id: "overhead-extension",
    name: "Overhead Cable / DB Triceps Extension",
    primary: ["triceps"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "extension",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Overhead position stretches the triceps long head — the biggest of the three heads.",
    cues: [
      "Arms overhead, elbows pointed forward and kept close.",
      "Lower behind the head for a deep stretch, then extend fully.",
      "Keep the elbows from flaring out."
    ],
    nippard: "The long head only gets a full stretch when the shoulder is flexed (arms overhead). Skipping overhead work leaves triceps growth on the table."
  },
  {
    id: "close-grip-bench",
    name: "Close-Grip Bench Press",
    primary: ["triceps"], secondary: ["chest", "frontDelts"],
    equipment: "Barbell", type: "compound", pattern: "horizontal-push",
    sets: 3, repRange: [6, 10], rir: 2,
    description: "A compound that lets you overload the triceps with heavy weight.",
    cues: [
      "Grip ~shoulder-width, tuck the elbows.",
      "Bar touches lower on the chest/sternum.",
      "Drive up by extending the elbows, not flaring."
    ],
    nippard: "Adds a heavy, loadable component to triceps training that isolations can't match for overall mass."
  },

  /* ----------------------------- LEGS ---------------------------------- */
  {
    id: "barbell-squat",
    name: "Barbell Back Squat",
    primary: ["quads"], secondary: ["glutes", "hamstrings"],
    equipment: "Barbell", type: "compound", pattern: "squat",
    sets: 4, repRange: [5, 8], rir: 2,
    description: "The foundational lower-body builder for quads, glutes, and total-body strength.",
    cues: [
      "Brace hard, break at the hips and knees together.",
      "Descend to at least parallel (thighs below knee level if mobility allows).",
      "Knees track over the toes, drive the floor away on the way up.",
      "Stay tight through the midline the whole rep."
    ],
    nippard: "A high-bar squat with a deep ROM is a tremendous quad builder. Control depth and consistency to track overload."
  },
  {
    id: "hack-squat",
    name: "Hack Squat / Pendulum Squat",
    primary: ["quads"], secondary: ["glutes"],
    equipment: "Machine", type: "compound", pattern: "squat",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Machine squat that lets you bias the quads and chase failure safely with deep ROM.",
    cues: [
      "Feet lower/narrower on the platform to emphasize the quads.",
      "Go deep — full knee flexion drives quad growth.",
      "Control the descent, drive through the whole foot."
    ],
    nippard: "Lets you train quads close to failure without the systemic fatigue and balance demands of a barbell squat — a hypertrophy favorite."
  },
  {
    id: "leg-press",
    name: "Leg Press",
    primary: ["quads"], secondary: ["glutes", "hamstrings"],
    equipment: "Machine", type: "compound", pattern: "squat",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "High-loadable quad and glute builder with a low skill and stability demand.",
    cues: [
      "Feet shoulder-width; lower placement = more quad, higher = more glute/ham.",
      "Bring the knees toward the chest for a full stretch — don't let the lower back round.",
      "Don't lock the knees hard at the top."
    ],
    nippard: "Great for adding quad volume with minimal fatigue. Easy to overload and push near failure safely."
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift (RDL)",
    primary: ["hamstrings"], secondary: ["glutes", "back"],
    equipment: "Barbell", type: "compound", pattern: "hinge",
    sets: 4, repRange: [6, 10], rir: 2,
    description: "The premier hip-hinge for hamstring and glute mass through a big stretch.",
    cues: [
      "Soft knees, push the hips back, bar stays close to the legs.",
      "Lower until you feel a deep hamstring stretch (usually mid-shin).",
      "Keep a neutral spine — don't round to chase range.",
      "Drive the hips forward to stand tall."
    ],
    nippard: "The hamstring's hip-extension function. The deep stretch under load makes the RDL elite for hamstring hypertrophy."
  },
  {
    id: "lying-leg-curl",
    name: "Lying / Seated Leg Curl",
    primary: ["hamstrings"], secondary: ["calves"],
    equipment: "Machine", type: "isolation", pattern: "knee-flexion",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Trains the hamstring's knee-flexion function, which hinges alone can't fully target.",
    cues: [
      "Adjust the pad to sit just above the heels.",
      "Curl fully, squeeze, control the negative.",
      "Seated version emphasizes the stretched position — slightly better for growth."
    ],
    nippard: "Hamstrings have two functions (hip extension + knee flexion). RDLs cover one; leg curls are needed for the other. Train both."
  },
  {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    primary: ["quads"], secondary: ["glutes", "hamstrings"],
    equipment: "Dumbbells", type: "compound", pattern: "lunge",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Unilateral builder that hammers quads and glutes with a big stretch and balance demand.",
    cues: [
      "Rear foot elevated, most weight on the front leg.",
      "Torso slightly forward to bias glutes, upright to bias quads.",
      "Drop straight down, drive through the front heel."
    ],
    nippard: "Excellent for fixing left/right imbalances and delivering a deep glute/quad stretch with relatively light loads."
  },
  {
    id: "hip-thrust",
    name: "Barbell Hip Thrust",
    primary: ["glutes"], secondary: ["hamstrings"],
    equipment: "Barbell", type: "compound", pattern: "hinge",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Loads the glutes hardest in the fully-contracted (shortened) position.",
    cues: [
      "Upper back on the bench, chin tucked, ribs down.",
      "Drive through the heels, full hip extension, squeeze the glutes hard at the top.",
      "Pause at lockout; don't hyperextend the lower back."
    ],
    nippard: "The hip thrust's peak-contraction overload complements the stretch-focused RDL for complete glute development."
  },
  {
    id: "leg-extension",
    name: "Leg Extension",
    primary: ["quads"], secondary: [],
    equipment: "Machine", type: "isolation", pattern: "knee-extension",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Pure quad isolation, great for the rectus femoris and a strong finisher.",
    cues: [
      "Pad on the lower shin, extend to full lockout and squeeze.",
      "Control the negative, don't let the stack slam.",
      "A slight backward lean (if the seat allows) increases rectus femoris stretch."
    ],
    nippard: "The rectus femoris is hard to fully stimulate with squats alone — leg extensions fill that gap. Great for lengthened partials at the end of a set."
  },
  {
    id: "standing-calf-raise",
    name: "Standing Calf Raise",
    primary: ["calves"], secondary: [],
    equipment: "Machine", type: "isolation", pattern: "calf",
    sets: 4, repRange: [10, 15], rir: 1,
    description: "Targets the gastrocnemius (the diamond-shaped upper calf) with a knee-straight position.",
    cues: [
      "Full stretch at the bottom — let the heels drop below the platform.",
      "Rise all the way onto the toes, pause at the top.",
      "Slow, deliberate reps beat bouncing every time."
    ],
    nippard: "Calves grow from a deep stretch and a full pause at the top. Most people bounce and shorten the ROM — don't."
  },
  {
    id: "seated-calf-raise",
    name: "Seated Calf Raise",
    primary: ["calves"], secondary: [],
    equipment: "Machine", type: "isolation", pattern: "calf",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Bent-knee position shifts emphasis to the soleus, the deeper endurance-oriented calf muscle.",
    cues: [
      "Knees bent ~90°, pad on the lower thigh.",
      "Deep stretch at the bottom, full rise at the top, pause both ends.",
      "Higher reps suit the soleus's fiber make-up."
    ],
    nippard: "Pairing a straight-knee (gastroc) and bent-knee (soleus) raise covers both calf muscles for complete lower-leg development."
  },

  /* ------------------------------ CORE --------------------------------- */
  {
    id: "hanging-leg-raise",
    name: "Hanging Leg Raise",
    primary: ["abs"], secondary: [],
    equipment: "Bodyweight", type: "isolation", pattern: "core",
    sets: 3, repRange: [10, 20], rir: 1,
    description: "Loads the lower abs through a large range with a strong contraction.",
    cues: [
      "Hang from a bar, posteriorly tilt the pelvis to start.",
      "Raise the knees/legs by curling the pelvis, not just swinging the hips.",
      "Lower under control — no kipping."
    ],
    nippard: "Add ankle weights or hold a dumbbell between the feet to keep the abs in a productive, progressively-overloaded rep range."
  },
  {
    id: "cable-crunch",
    name: "Cable Crunch",
    primary: ["abs"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "core",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Lets you load the abs progressively, just like any other muscle.",
    cues: [
      "Kneel below a rope, hold it by the head.",
      "Crunch by flexing the spine — bring the elbows toward the thighs.",
      "Keep the hips fixed; the movement is spinal flexion, not a hip hinge."
    ],
    nippard: "Abs are a muscle — they respond to progressive load. The cable crunch is the easiest way to add resistance over time."
  },
  {
    id: "plank",
    name: "Weighted Plank / Ab Wheel",
    primary: ["abs"], secondary: [],
    equipment: "Bodyweight", type: "isolation", pattern: "core",
    sets: 3, repRange: [8, 15], rir: 1,
    description: "Anti-extension core strength that protects the spine under heavy compounds.",
    cues: [
      "Ribs down, glutes squeezed, neutral spine.",
      "Ab wheel: roll out only as far as you can keep a flat back, then pull back.",
      "For planks, add a plate on the back and train short, hard holds."
    ],
    nippard: "Anti-movement core training carries over to bracing under squats and deadlifts — strength and aesthetics in one."
  },

  /* ===================================================================
   * EXPANSION — more credible, influencer-recommended movements
   * Attributions: Jeff Nippard, TNF/Joel Twinem, Renaissance Periodization
   * (Mike Israetel), Eric Helms, Jeff Cavaliere (Athlean-X), John Meadows.
   * =================================================================== */

  /* ---- CHEST ---- */
  {
    id: "pec-deck",
    name: "Machine Pec Deck Fly",
    primary: ["chest"], secondary: [],
    equipment: "Machine", type: "isolation", pattern: "fly",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Stable, fixed-path chest fly that isolates the pecs and is easy to push close to failure.",
    cues: [
      "Set the seat so the handles sit at mid-chest height.",
      "Drive the pads together with the chest, hold the squeeze.",
      "Let the arms travel back for a full stretch each rep."
    ],
    nippard: "RP / Israetel favorite: the machine removes stability demands so every rep targets the pecs and you can take it to failure safely."
  },
  {
    id: "low-cable-fly",
    name: "Low-to-High Cable Fly",
    primary: ["chest"], secondary: ["frontDelts"],
    equipment: "Cable", type: "isolation", pattern: "fly",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Cables set low, hands sweep up and in — biases the upper chest in the lengthened position.",
    cues: [
      "Start with cables at the lowest pin, soft elbow bend held constant.",
      "Sweep the hands up toward eye level, squeeze at the top.",
      "Resist on the way down for a deep upper-chest stretch."
    ],
    nippard: "Nippard programs upward fly angles to bias the often-lagging upper chest with constant cable tension."
  },
  {
    id: "smith-incline",
    name: "Smith Machine Incline Press",
    primary: ["chest"], secondary: ["frontDelts", "triceps"],
    equipment: "Machine", type: "compound", pattern: "incline-push",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Fixed bar path lets you overload the upper chest with no balance demand — easy to progress for months.",
    cues: [
      "Bench at ~30°, bar touches the upper chest.",
      "Keep the shoulder blades retracted and down.",
      "Press up and slightly back along the fixed path."
    ],
    nippard: "TNF / Joel Twinem leans on stable, loadable machine pressing so progressive overload is clean and repeatable week to week."
  },

  /* ---- BACK ---- */
  {
    id: "tbar-row",
    name: "T-Bar Row",
    primary: ["back"], secondary: ["lats", "biceps", "rearDelts"],
    equipment: "Barbell", type: "compound", pattern: "horizontal-pull",
    sets: 3, repRange: [8, 12], rir: 2,
    description: "Chest-supported or landmine row that loads the mid-back hard with a strong, stable line of pull.",
    cues: [
      "Hinge over, neutral spine, drive elbows back and up.",
      "Pull to the lower chest, squeeze the shoulder blades together.",
      "Control the stretch at the bottom — don't bounce off the floor."
    ],
    nippard: "TNF's modified T-bar row is a signature movement: heavy, stable mid-back loading with low fatigue and easy progression."
  },
  {
    id: "db-row",
    name: "Single-Arm Dumbbell Row",
    primary: ["back"], secondary: ["lats", "biceps"],
    equipment: "Dumbbells", type: "compound", pattern: "horizontal-pull",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Unilateral row with a long range of motion and a big lat stretch at the bottom.",
    cues: [
      "Brace a hand and knee on a bench, flat back.",
      "Let the dumbbell hang and stretch, then row to the hip.",
      "Drive the elbow back, don't rotate the torso to cheat."
    ],
    nippard: "Lets each side work independently through a full ROM — great for fixing left/right imbalances."
  },
  {
    id: "meadows-row",
    name: "Meadows Row",
    primary: ["back"], secondary: ["lats", "rearDelts", "biceps"],
    equipment: "Barbell", type: "compound", pattern: "horizontal-pull",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Landmine row from a staggered stance that hammers the upper-back and lats with a deep stretch.",
    cues: [
      "Stand side-on to a landmine, grip the sleeve end.",
      "Let the weight pull the shoulder forward, then row up and back.",
      "Keep the torso braced; pull with the elbow, not the bicep."
    ],
    nippard: "Created by the late John Meadows — a cult-favorite for upper-back detail and a savage stretch under load."
  },
  {
    id: "chin-up",
    name: "Chin-Up (Supinated)",
    primary: ["lats"], secondary: ["biceps", "back"],
    equipment: "Bodyweight", type: "compound", pattern: "vertical-pull",
    sets: 3, repRange: [6, 12], rir: 2,
    description: "Underhand grip vertical pull that adds serious biceps involvement alongside lat work.",
    cues: [
      "Shoulder-width supinated grip, start from a dead hang.",
      "Pull the chest to the bar, drive the elbows down.",
      "Lower under control to a full stretch; add load past 12 reps."
    ],
    nippard: "Nippard notes chin-ups train the lats AND biceps heavily — an efficient compound for arm-day carryover."
  },
  {
    id: "cable-pullover",
    name: "Cable Lat Pullover",
    primary: ["lats"], secondary: ["back"],
    equipment: "Cable", type: "isolation", pattern: "lat-isolation",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Shoulder-extension isolation that targets the lats without biceps or grip limiting you.",
    cues: [
      "Face a high pulley, slight forward lean, fixed elbow bend.",
      "Pull the bar/rope down to the hips using the lats.",
      "Feel the stretch overhead and the squeeze at the bottom."
    ],
    nippard: "An RP-style lat isolation — perfect for adding lat volume when grip and biceps are already fatigued."
  },
  {
    id: "hammer-iso-row",
    name: "Hammer Strength Iso-Row",
    primary: ["back"], secondary: ["lats", "biceps"],
    equipment: "Machine", type: "compound", pattern: "horizontal-pull",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Plate-loaded machine row with a chest pad — overload the back with zero lower-back fatigue.",
    cues: [
      "Chest on the pad, run each arm through a full stretch and contraction.",
      "Drive the elbow back, pause at peak contraction.",
      "Can be done one arm at a time for extra ROM."
    ],
    nippard: "Stable, loadable, low-fatigue — exactly the TNF profile for a back movement you can progress for months."
  },
  {
    id: "db-shrug",
    name: "Dumbbell Shrug",
    primary: ["back"], secondary: [],
    equipment: "Dumbbells", type: "isolation", pattern: "shrug",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Direct upper-trap work for a thicker, more complete back and yoke.",
    cues: [
      "Let the shoulders hang, then shrug straight up — don't roll.",
      "Pause and squeeze the traps at the top.",
      "Lower under control for a full stretch."
    ],
    nippard: "Traps respond to direct loading and a pause at the top. A small dose adds noticeable upper-back thickness."
  },

  /* ---- SHOULDERS ---- */
  {
    id: "machine-shoulder-press",
    name: "Machine Shoulder Press",
    primary: ["frontDelts"], secondary: ["sideDelts", "triceps"],
    equipment: "Machine", type: "compound", pattern: "vertical-push",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Stable overhead press you can push close to failure without worrying about balance.",
    cues: [
      "Seat set so handles start at shoulder height.",
      "Press up without shrugging, control the descent.",
      "Stop just short of locking out to keep tension on the delts."
    ],
    nippard: "TNF / RP staple: the machine path means clean, repeatable progression on vertical pressing."
  },
  {
    id: "arnold-press",
    name: "Arnold Press",
    primary: ["frontDelts"], secondary: ["sideDelts"],
    equipment: "Dumbbells", type: "compound", pattern: "vertical-push",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Rotating dumbbell press that adds front-to-side delt involvement through a long ROM.",
    cues: [
      "Start palms facing you at chin height.",
      "Rotate the palms outward as you press overhead.",
      "Reverse the rotation on the way down."
    ],
    nippard: "The rotation increases time under tension across the front and side delts in one movement."
  },
  {
    id: "leaning-lateral",
    name: "Leaning Cable Lateral Raise",
    primary: ["sideDelts"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "lateral-raise",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Leaning away from a low cable lengthens the side delt and loads it from the very bottom.",
    cues: [
      "Hold an upright, lean away from the pulley holding the post.",
      "Raise the arm out to shoulder height, lead with the elbow.",
      "Slow negative — feel the stretch at the bottom."
    ],
    nippard: "The 'Lu raise' style lean keeps tension on the side delt through the lengthened range most lifters skip."
  },
  {
    id: "db-rear-fly",
    name: "Bent-Over Dumbbell Reverse Fly",
    primary: ["rearDelts"], secondary: ["back"],
    equipment: "Dumbbells", type: "isolation", pattern: "rear-fly",
    sets: 3, repRange: [15, 20], rir: 1,
    description: "Free-weight rear-delt isolation for shoulder health and a complete 3D look.",
    cues: [
      "Hinge over, slight elbow bend held constant.",
      "Raise the dumbbells out and back, lead with the pinkies.",
      "Squeeze the rear delts; don't let the traps take over."
    ],
    nippard: "High reps and a strict tempo are key — rear delts respond best to the contraction, not heavy weight."
  },
  {
    id: "cable-upright-row",
    name: "Cable Upright Row",
    primary: ["sideDelts"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "lateral-raise",
    sets: 3, repRange: [12, 15], rir: 1,
    description: "Wide-grip upright row that biases the side delts and upper traps.",
    cues: [
      "Use a rope or wide bar on a low pulley.",
      "Pull up to chest height, elbows leading and staying high.",
      "Keep it smooth; stop if it pinches the shoulder."
    ],
    nippard: "A wide grip keeps the emphasis on the side delts rather than the front. Pull to chest height, not the chin."
  },

  /* ---- BICEPS ---- */
  {
    id: "bayesian-curl",
    name: "Bayesian Cable Curl",
    primary: ["biceps"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "curl",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Single-arm cable curl with the arm behind the body — maximal biceps stretch under constant tension.",
    cues: [
      "Face away from a low pulley, arm trailing behind you.",
      "Curl without letting the elbow drift forward.",
      "Emphasize the deep stretch at the bottom of each rep."
    ],
    nippard: "A Nippard favorite: the behind-the-body position trains the biceps long head in a deep stretch with cable tension throughout."
  },
  {
    id: "preacher-curl",
    name: "Preacher Curl",
    primary: ["biceps"], secondary: [],
    equipment: "Machine", type: "isolation", pattern: "curl",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Arm fixed on a pad removes momentum and overloads the lower biceps and the bottom stretch.",
    cues: [
      "Upper arm flat on the pad, don't let the elbow lift.",
      "Curl up, squeeze, then lower all the way to a stretch.",
      "Control the eccentric — the stretched bottom is the money zone."
    ],
    nippard: "Great for the stretched position and for taking momentum out of curling. Machine or EZ-bar both work."
  },
  {
    id: "cable-curl",
    name: "Cable Biceps Curl",
    primary: ["biceps"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "curl",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Constant-tension curl that keeps the biceps loaded at the top where dumbbells go light.",
    cues: [
      "Low pulley, elbows pinned to the sides.",
      "Curl up and squeeze hard at the top.",
      "Resist the cable on the way down."
    ],
    nippard: "Cables maintain tension through the full curl — a reliable progressable isolation."
  },
  {
    id: "concentration-curl",
    name: "Concentration Curl",
    primary: ["biceps"], secondary: [],
    equipment: "Dumbbells", type: "isolation", pattern: "curl",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Seated, braced single-arm curl that maximizes the peak contraction and mind-muscle connection.",
    cues: [
      "Elbow braced against the inner thigh.",
      "Curl up slowly, squeeze the peak, lower with control.",
      "No swinging — the brace forces strict form."
    ],
    nippard: "EMG studies often show high biceps activation here. Good as a focused finisher for the peak."
  },
  {
    id: "reverse-curl",
    name: "Reverse EZ-Bar Curl",
    primary: ["biceps"], secondary: ["forearms"],
    equipment: "Barbell", type: "isolation", pattern: "curl",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Pronated (overhand) curl that targets the brachioradialis and brachialis for thicker arms.",
    cues: [
      "Overhand grip on an EZ bar, elbows pinned.",
      "Curl up keeping the wrists firm and straight.",
      "Lower under control."
    ],
    nippard: "Builds the forearm and the muscle under the biceps, adding overall arm thickness most people neglect."
  },

  /* ---- TRICEPS ---- */
  {
    id: "skull-crusher",
    name: "EZ-Bar Skull Crusher",
    primary: ["triceps"], secondary: [],
    equipment: "Barbell", type: "isolation", pattern: "extension",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Lying extension that loads the triceps with a strong stretch — especially the long head.",
    cues: [
      "Lower the bar to the forehead or just behind the head.",
      "Keep the elbows from flaring out.",
      "Extend without locking out hard; feel the stretch at the bottom."
    ],
    nippard: "Lowering behind the head increases the long-head stretch. A classic mass builder for the triceps."
  },
  {
    id: "db-overhead-ext",
    name: "Dumbbell Overhead Triceps Extension",
    primary: ["triceps"], secondary: [],
    equipment: "Dumbbells", type: "isolation", pattern: "extension",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Single dumbbell held overhead with both hands — deep long-head stretch, no cable needed.",
    cues: [
      "Hold one dumbbell overhead, elbows pointed forward.",
      "Lower behind the head for a deep stretch.",
      "Extend fully, keep the elbows tucked."
    ],
    nippard: "The overhead position is essential for the long head. A great option when cables are busy."
  },
  {
    id: "cable-kickback",
    name: "Single-Arm Cable Kickback",
    primary: ["triceps"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "extension",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Constant-tension isolation that peaks the triceps in the fully-shortened position.",
    cues: [
      "Hinge slightly, upper arm parallel to the floor and fixed.",
      "Extend the elbow fully, squeeze the triceps at lockout.",
      "Control the return; high reps work best here."
    ],
    nippard: "Cavaliere (Athlean-X) likes loaded kickbacks for a hard peak contraction — pairs well with an overhead stretch movement."
  },

  /* ---- QUADS ---- */
  {
    id: "front-squat",
    name: "Front Squat",
    primary: ["quads"], secondary: ["glutes", "abs"],
    equipment: "Barbell", type: "compound", pattern: "squat",
    sets: 3, repRange: [5, 8], rir: 2,
    description: "Bar racked on the front delts keeps the torso upright, shifting emphasis onto the quads.",
    cues: [
      "Elbows high, bar resting on the front delts (not the hands).",
      "Sit straight down, knees forward, deep as mobility allows.",
      "Stay upright and braced — chest tall the whole rep."
    ],
    nippard: "More quad-dominant and knee-friendly torso angle than a back squat for many lifters."
  },
  {
    id: "smith-squat",
    name: "Smith Machine Squat",
    primary: ["quads"], secondary: ["glutes"],
    equipment: "Machine", type: "compound", pattern: "squat",
    sets: 3, repRange: [8, 12], rir: 1,
    description: "Fixed bar path lets you place the feet forward and isolate the quads with no balance demand.",
    cues: [
      "Feet slightly forward of the bar to bias the quads.",
      "Descend deep, knees tracking over the toes.",
      "Drive through the whole foot; great for chasing failure safely."
    ],
    nippard: "TNF / RP option to load the quads heavily and progress cleanly without stability being the limiter."
  },
  {
    id: "walking-lunge",
    name: "Walking Lunge",
    primary: ["quads"], secondary: ["glutes", "hamstrings"],
    equipment: "Dumbbells", type: "compound", pattern: "lunge",
    sets: 3, repRange: [10, 12], rir: 1,
    description: "Unilateral builder that stretches the quads and glutes under load with a balance challenge.",
    cues: [
      "Long stride, drop the back knee toward the floor.",
      "Drive through the front heel to step into the next lunge.",
      "Stay tall; let the legs do the work."
    ],
    nippard: "Excellent for quad and glute hypertrophy plus single-leg balance — count reps per leg."
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    primary: ["quads"], secondary: ["glutes"],
    equipment: "Dumbbells", type: "compound", pattern: "squat",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Beginner-friendly squat holding a dumbbell at the chest — teaches depth and an upright torso.",
    cues: [
      "Hold a dumbbell vertically against the chest.",
      "Squat between the knees, elbows inside the thighs at the bottom.",
      "Keep the chest up and heels down."
    ],
    nippard: "A great entry point to squatting and a solid higher-rep quad movement at any level."
  },
  {
    id: "sissy-squat",
    name: "Sissy Squat",
    primary: ["quads"], secondary: [],
    equipment: "Bodyweight", type: "isolation", pattern: "knee-extension",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Knees travel far forward while the torso leans back — an intense quad (rectus femoris) stretch.",
    cues: [
      "Hold a support, rise onto the toes.",
      "Lean back and drive the knees forward, lowering the torso.",
      "Feel the deep quad stretch, then extend back up."
    ],
    nippard: "CBum and others use sissy squats for the rectus femoris stretch that regular squats can't fully reach. Add weight to progress."
  },

  /* ---- HAMSTRINGS ---- */
  {
    id: "nordic-curl",
    name: "Nordic Hamstring Curl",
    primary: ["hamstrings"], secondary: [],
    equipment: "Bodyweight", type: "isolation", pattern: "knee-flexion",
    sets: 3, repRange: [5, 10], rir: 1,
    description: "Bodyweight knee-flexion with a brutal eccentric — one of the best hamstring builders and injury-preventers.",
    cues: [
      "Anchor the ankles, body straight from knees to head.",
      "Lower as slowly as possible, fighting all the way down.",
      "Push off the floor to assist back up if needed."
    ],
    nippard: "Athlean-X and the research both love Nordics — the overloaded eccentric builds hamstrings and cuts injury risk."
  },
  {
    id: "seated-leg-curl",
    name: "Seated Leg Curl",
    primary: ["hamstrings"], secondary: ["calves"],
    equipment: "Machine", type: "isolation", pattern: "knee-flexion",
    sets: 3, repRange: [10, 15], rir: 1,
    description: "Hip-flexed position puts the hamstrings on a deeper stretch — slightly better for growth than lying curls.",
    cues: [
      "Pad just above the heels, thighs locked down.",
      "Curl fully under the seat, squeeze, control the return.",
      "Let the hamstrings stretch fully at the top of the movement."
    ],
    nippard: "Nippard highlights the seated curl: the lengthened-position emphasis tends to edge out the lying version for hypertrophy."
  },
  {
    id: "good-morning",
    name: "Good Morning",
    primary: ["hamstrings"], secondary: ["glutes", "back"],
    equipment: "Barbell", type: "compound", pattern: "hinge",
    sets: 3, repRange: [8, 12], rir: 2,
    description: "Bar on the back hip-hinge that loads the hamstrings and posterior chain through a big stretch.",
    cues: [
      "Soft knees, push the hips back, neutral spine.",
      "Hinge until you feel a strong hamstring stretch.",
      "Drive the hips forward to stand; keep the bar path vertical."
    ],
    nippard: "A loadable hinge variation for posterior-chain strength. Start light — technique and bracing are everything."
  },
  {
    id: "cable-pullthrough",
    name: "Cable Pull-Through",
    primary: ["glutes"], secondary: ["hamstrings"],
    equipment: "Cable", type: "compound", pattern: "hinge",
    sets: 3, repRange: [12, 15], rir: 1,
    description: "Hip-hinge against a cable that trains the glutes and hamstrings with low spinal loading.",
    cues: [
      "Face away from a low pulley, rope between the legs.",
      "Hinge at the hips, let the rope pull you into a stretch.",
      "Snap the hips forward and squeeze the glutes at lockout."
    ],
    nippard: "A joint-friendly way to train the hip hinge and glutes when you want the stimulus without heavy axial load."
  },

  /* ---- GLUTES ---- */
  {
    id: "glute-kickback",
    name: "Cable Glute Kickback",
    primary: ["glutes"], secondary: ["hamstrings"],
    equipment: "Cable", type: "isolation", pattern: "hinge",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Single-leg hip extension that isolates the glute with constant cable tension.",
    cues: [
      "Ankle strap on a low pulley, slight forward lean.",
      "Drive the leg back and up using the glute, not the lower back.",
      "Squeeze at full extension, control the return."
    ],
    nippard: "Direct glute isolation to add volume and target the glute in its shortened, fully-contracted position."
  },
  {
    id: "step-up",
    name: "Dumbbell Step-Up",
    primary: ["glutes"], secondary: ["quads", "hamstrings"],
    equipment: "Dumbbells", type: "compound", pattern: "lunge",
    sets: 3, repRange: [10, 12], rir: 1,
    description: "Single-leg step onto a box that loads the glutes and quads with a long range of motion.",
    cues: [
      "Box at roughly knee height, full foot on top.",
      "Drive through the top heel, minimize push from the bottom leg.",
      "Control the descent; count reps per leg."
    ],
    nippard: "A higher box biases the glutes. Great unilateral builder that also trains balance and control."
  },
  {
    id: "hip-abduction",
    name: "Hip Abduction Machine",
    primary: ["glutes"], secondary: [],
    equipment: "Machine", type: "isolation", pattern: "glute-iso",
    sets: 3, repRange: [15, 20], rir: 1,
    description: "Targets the gluteus medius (upper/side glute) for that rounded, capped hip look.",
    cues: [
      "Push the knees outward against the pads.",
      "Lean forward slightly to bias the upper glute.",
      "Pause at full abduction, control the return — high reps."
    ],
    nippard: "The glute medius is hard to hit with compounds. Direct abduction work rounds out the side-glute and improves hip stability."
  },

  /* ---- CALVES ---- */
  {
    id: "leg-press-calf",
    name: "Leg Press Calf Raise",
    primary: ["calves"], secondary: [],
    equipment: "Machine", type: "isolation", pattern: "calf",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Calf raise on the leg press lets you load heavy with a controllable deep stretch.",
    cues: [
      "Balls of the feet on the bottom edge of the platform.",
      "Let the heels drop for a full stretch, then press to full plantarflexion.",
      "Pause at both ends — no bouncing."
    ],
    nippard: "Heavy, deep, paused reps. The leg press makes it easy to load and to control the stretch the calves need."
  },

  /* ---- ABS / CORE ---- */
  {
    id: "pallof-press",
    name: "Pallof Press",
    primary: ["abs"], secondary: [],
    equipment: "Cable", type: "isolation", pattern: "core",
    sets: 3, repRange: [12, 15], rir: 1,
    description: "Anti-rotation core exercise that builds bracing strength and trains the obliques.",
    cues: [
      "Stand side-on to a cable at chest height, hands at the sternum.",
      "Press straight out and resist the cable pulling you into rotation.",
      "Hold briefly at full extension, return with control. Reps per side."
    ],
    nippard: "Anti-rotation training builds a stable, strong midsection that carries over to every compound lift."
  },
  {
    id: "weighted-decline-situp",
    name: "Weighted Decline Sit-Up",
    primary: ["abs"], secondary: [],
    equipment: "Bodyweight", type: "isolation", pattern: "core",
    sets: 3, repRange: [12, 20], rir: 1,
    description: "Decline sit-up holding a plate — loads the abs through a long range you can progressively overload.",
    cues: [
      "Hook the feet, hold a plate on the chest.",
      "Curl up by flexing the spine, not just hinging at the hips.",
      "Lower slowly for a stretch; add plate weight to progress."
    ],
    nippard: "Abs grow from progressive load like any muscle — holding a plate turns sit-ups into a real, trackable hypertrophy lift."
  },
];

// Experience scales the weekly volume window and how big each overload jump is.
// Beginners need less volume and progress in bigger weight jumps; advanced
// lifters tolerate more volume but progress in smaller increments.
const EXPERIENCE = {
  beginner:     { volMult: 0.8,  jumpMult: 1.5, label: "Beginner" },
  intermediate: { volMult: 1.0,  jumpMult: 1.0, label: "Intermediate" },
  advanced:     { volMult: 1.2,  jumpMult: 0.5, label: "Advanced" },
};

// Return volume targets scaled for an experience level.
function scaledTargets(level) {
  const m = (EXPERIENCE[level] || EXPERIENCE.intermediate).volMult;
  const out = {};
  for (const [k, t] of Object.entries(VOLUME_TARGETS)) {
    out[k] = { min: Math.round(t.min * m), max: Math.round(t.max * m), freq: t.freq };
  }
  return out;
}

// Quick lookup helpers
const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

if (typeof module !== "undefined") {
  module.exports = { MUSCLES, VOLUME_TARGETS, EXPERIENCE, scaledTargets, EXERCISES, EXERCISE_BY_ID };
}
