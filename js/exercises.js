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
