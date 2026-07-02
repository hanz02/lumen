/**
 * Lumen Technical Report — comprehensive docx builder.
 * Run: node tools/report/build_report.js
 * Output: tools/report/Lumen_Technical_Report.docx
 */
const fs   = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, Footer, Header, PageBreak
} = require("docx");

const IMG = path.join(__dirname, "img");
const OUT = path.join(__dirname, "Lumen_Technical_Report.docx");
const CW  = 9360; // content width in DXA (US Letter 1" margins)

// ── colours ─────────────────────────────────────────────────────────────────
const GREEN = "2E7D45", MINT = "1A6640", INK = "1B2A20",
      GREY  = "555555", AMBER = "8C5E00", CORAL = "A0392A",
      TEAL  = "1A5C5C";

// ── helpers ──────────────────────────────────────────────────────────────────
function pngSize(file) {
  const b = fs.readFileSync(path.join(IMG, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function img(file, maxWpx, caption) {
  const { w, h } = pngSize(file);
  const sc = Math.min(1, maxWpx / w);
  const width = Math.round(w * sc), height = Math.round(h * sc);
  const out = [new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 160, after: 50 },
    children: [new ImageRun({
      type: "png", data: fs.readFileSync(path.join(IMG, file)),
      transformation: { width, height },
      altText: { title: caption || file, description: caption || file, name: file }
    })]
  })];
  if (caption) out.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: caption, italics: true, size: 18, color: GREY })]
  }));
  return out;
}

const run  = (t, o={}) => new TextRun({ text: t, size: 22, ...o });
const b    = (t, c=INK) => run(t, { bold: true, color: c });
const mono = (t) => run(t, { font: "Courier New", size: 20, color: TEAL });

function P(parts, o={}) {
  const ch = (Array.isArray(parts) ? parts : [parts])
               .map(p => typeof p === "string" ? run(p) : p);
  return new Paragraph({ spacing: { after: 140, line: 276 }, children: ch, ...o });
}
function H1(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 120 },
    children: [new TextRun({ text: t, bold: true, color: GREEN })]
  });
}
function H2(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 },
    children: [new TextRun({ text: t, bold: true, color: MINT })]
  });
}
function H3(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: t, bold: true, color: INK })]
  });
}
function bul(parts) {
  const ch = (Array.isArray(parts) ? parts : [parts])
               .map(p => typeof p === "string" ? run(p) : p);
  return new Paragraph({
    numbering: { reference: "bul", level: 0 }, spacing: { after: 80, line: 276 }, children: ch
  });
}
function num(parts) {
  const ch = (Array.isArray(parts) ? parts : [parts])
               .map(p => typeof p === "string" ? run(p) : p);
  return new Paragraph({
    numbering: { reference: "num", level: 0 }, spacing: { after: 90, line: 276 }, children: ch
  });
}
function code(text) {
  return new Paragraph({
    spacing: { after: 0, line: 240 },
    shading: { fill: "F0F4F1", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Courier New", size: 19, color: "1A5C5C" })]
  });
}
const sp = () => new Paragraph({ spacing: { after: 100 }, children: [] });

const bd = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const bds = { top: bd, bottom: bd, left: bd, right: bd };
function cell(text, width, { head=false, fill, alignRight=false }={}) {
  return new TableCell({
    borders: bds, width: { size: width, type: WidthType.DXA },
    shading: { fill: fill || (head ? "D6EEDD" : "FFFFFF"), type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold: head, size: 20, color: head ? GREEN : INK })]
    })]
  });
}
function tbl(headers, rows, widths) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h,i) => cell(h, widths[i], { head: true })) }),
      ...rows.map(r => new TableRow({ children: r.map((c,i) => cell(c, widths[i])) }))
    ]
  });
}
const rule = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C8DDD0", space: 3 } },
  spacing: { after: 160 }, children: []
});

// ============================================================
const kids = [];

// ── TITLE PAGE ───────────────────────────────────────────────────────────────
kids.push(new Paragraph({
  spacing: { after: 80 },
  children: [new TextRun({ text: "Lumen", bold: true, size: 80, color: GREEN })]
}));
kids.push(new Paragraph({
  spacing: { after: 60 },
  children: [new TextRun({ text: "How the App Works — A Full Technical Reference", bold: true, size: 32, color: INK })]
}));
kids.push(P([run("This document explains every component of Lumen from the user tapping the screen to the ranked plant list appearing on the results page. It covers the mental model, every data-capture mechanism, the calibration pipeline, the recommendation engine in detail, the Solar Position Algorithm, and the data that powers the whole system. Code snippets show the exact lines responsible for each behaviour.", { italics: true, color: GREY, size: 20 })]));
kids.push(rule());

// ── TABLE OF CONTENTS (manual) ───────────────────────────────────────────────
kids.push(H2("Contents"));
[
  "1.  The Big Picture — what Lumen is and why it works differently",
  "2.  The Mental Model — a factory with four assembly lines",
  "3.  The Six-Step Wizard Flow",
  "4.  Data Capture — how each input is measured",
  "    4a  Lux capture: Android light sensor + plateau detection",
  "    4b  AR Distance: ARCore plane detection + line measurement",
  "    4c  Compass & GPS: magnetic heading to true window azimuth",
  "    4d  Solar Position Algorithm (SPA): direct-sun hours",
  "5.  Lux Calibration — correcting the phone sensor against a reference meter",
  "6.  The Recommendation Engine — step by step",
  "    6a  Gate 1: survival light floor",
  "    6b  Gate 2: direct-sun incompatibility",
  "    6c  Light Fit Score",
  "    6d  Direct Sun Factor",
  "    6e  Distance Factor",
  "    6f  Evidence Confidence Factor",
  "    6g  Weighted Score Formula and renormalisation",
  "    6h  Ranking and tie-breaking",
  "7.  Explanation Generation — why every plant gets a plain-language reason",
  "8.  The Plant Database — Excel to SQLite pipeline",
  "9.  The Results Screen — what the user sees",
  "10. Appendix — key constants at a glance",
].forEach(t => kids.push(bul(t)));
kids.push(new Paragraph({ children: [new PageBreak()] }));

// ── 1. THE BIG PICTURE ───────────────────────────────────────────────────────
kids.push(H1("1.  The Big Picture"));
kids.push(P([
  "Lumen is a mobile app that tells you which indoor plant will thrive at a specific spot inside a room — not just anywhere in the room, but at a precise location you point the phone at. The key word is ", b("measured", GREEN),
  ". Every other indoor plant app (Green Oasis, PRES, and others documented in the literature) decides suitability by asking you to tick a box labelled 'low light', 'medium light', or 'bright'. Those labels are vague, subjective, and completely ignore whether the spot is close to the window or far away, and whether direct sunlight ever falls on it."
]));
kids.push(P([
  "Lumen instead ", b("measures the actual light in lux at the chosen spot"), " using the phone's ambient light sensor, measures the physical distance from the spot to the window using ARCore (augmented reality), and estimates whether direct sunlight can reach that exact location using real solar geometry tied to the GPS position and the compass bearing of the window. These three numbers — lux, distance, direct-sun hours — are fed into a rule-based scoring engine that matches them against evidence-based thresholds for each of 31 plants, producing a ranked, explained recommendation list."
]));
kids.push(P("The novelty is not the list of plants. The novelty is that the recommendation changes as you move the phone: a spot 0.5 m from a west-facing window at 3,000 lux with 3 h of afternoon sun gets a completely different list than a spot 2.0 m from a north-facing window at the same 3,000 lux with no direct sun. Existing apps cannot make this distinction because they do not know any of those numbers."));
kids.push(sp()); kids.push(...img("01_architecture.png", 600, "Figure 1. Full system architecture: four sensor streams converge through calibration/processing into the four-factor engine, producing a ranked output with explanations."));

// ── 2. MENTAL MODEL ──────────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("2.  The Mental Model — a factory with four assembly lines"));
kids.push(P("The easiest way to picture the app is as a small factory with four independent assembly lines feeding one scoring desk."));
kids.push(bul([b("Assembly line 1 — Light: "), "The phone's light sensor runs for 10 seconds and produces one number: the stable median lux at the spot. This is the most important number in the system."]));
kids.push(bul([b("Assembly line 2 — Distance: "), "ARCore places two anchors in 3D space (one at the plant spot, one at the window) and measures the line between them, producing the plant-to-window distance in metres."]));
kids.push(bul([b("Assembly line 3 — Compass + SPA: "), "The compass captures the direction the window faces. The GPS gives the latitude and longitude. These two are fed into the Solar Position Algorithm, which calculates the sun's position every 5 minutes across the whole day and counts how many of those minutes the sun is pointing directly at the window — producing estimated direct-sun hours per day."]));
kids.push(bul([b("Assembly line 4 — Evidence quality: "), "This line runs entirely from the plant database. Each of the 31 plants carries a confidence rating (high / medium / low / provisional) reflecting how solid the scientific evidence behind its light thresholds is."]));
kids.push(P("The scoring desk takes the four assembly-line outputs, applies two hard pass/fail gates, then computes a weighted score for each plant that passes, ranks the survivors, and attaches a plain-English explanation to every one. That explanation is the single most important output: it is what a user reads to understand whether and why a plant suits their spot."));

// ── 3. WIZARD FLOW ───────────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("3.  The Six-Step Wizard Flow"));
kids.push(P(["The app is a ", b("locked step wizard"), " — a sequence of screens where each step cannot be opened until the previous required step is complete. This is enforced by the ", mono("maxReachable"), " variable in ", mono("App.tsx"), ", which gates the ", mono("StepProgress"), " component. The facing step (Step 4) is the only optional step; the user can skip it and still get results, but those results will not include a sun estimate."]));
kids.push(sp()); kids.push(...img("02_wizard_flow.png", 580, "Figure 2. The six-step wizard flow. Steps 1–3 are required; Step 4 (facing) is optional."));
kids.push(sp());
kids.push(tbl(
  ["Step", "Screen name", "What the user does", "What the app captures"],
  [
    ["Welcome", "LumenMark logo", "Reads intro, taps Start", "Nothing yet"],
    ["1", "Plant Spot", "Taps to place the plant marker, then the window marker", "AR distance in metres (horizontal)"],
    ["2", "Window Size", "Optionally measures width, height, sill height", "Window geometry for aperture SPA model"],
    ["3", "Spot Light", "Holds phone steady at the spot for 10 s", "Raw lux via plateau-median"],
    ["4 (optional)", "Window Facing", "Points phone at window, captures compass heading", "True azimuth → window aspect + SPA hours"],
    ["5", "Results", "Reads recommendations", "Engine runs; hero card + explanations shown"],
  ],
  [900, 1600, 3400, 3460]
));
kids.push(P(["The wizard does not allow skipping backward to change a measurement without restarting from that step, so the captures are always internally consistent. The ", mono("maxReachable"), " value is stored in React state and incremented each time a required capture resolves."]));

// ── 4. DATA CAPTURE ──────────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("4.  Data Capture — how each input is measured"));

kids.push(H2("4a  Lux capture: Android light sensor and plateau detection"));
kids.push(P(["Android provides a dedicated ambient light sensor through its ", mono("TYPE_LIGHT"), " sensor API. Unlike an accelerometer or gyroscope, ", mono("TYPE_LIGHT"), " is an ", b("on-change"), " sensor: it only fires a new reading when the value changes. This means silence on the event stream does not mean the reading is zero — it means the reading held its last value. Lumen handles this with a hold-last-value resampling step."]));
kids.push(P("The capture sequence works like this:"));
kids.push(num("The native LightSensorModule starts the TYPE_LIGHT stream and emits events via DeviceEventEmitter to the JavaScript side."));
kids.push(num("Each event is timestamped with Date.now() (not the native boot-relative timestamp, to keep everything on one JavaScript clock) and stored as a LightSample."));
kids.push(num("At the end of the 10-second capture, the sample array is passed to extractPlateauReading() in src/sensor/plateau.ts."));
kids.push(num("That function resamples the on-change stream onto a uniform 10 Hz grid using hold-last-value, so every 100 ms slot has a value even if the sensor was silent."));
kids.push(num("The grid is segmented into stable plateaus: a new segment begins whenever a sample deviates from the running segment median by more than max(10%, 30 lx). The 10% relative tolerance and 30 lx absolute floor are the same constants used in the offline Python extraction tool (tools/extract_phone_readings.py), so the thesis can document one criterion for both."));
kids.push(num("The longest stable plateau (later plateau wins ties, since the user has settled by then) is selected, and its median is returned as the raw lux reading. The function returns null — and the UI asks the user to retry rather than guessing — in two cases: (a) no plateau reaches the 1-second minimum (minPlateauMs = 1000), or (b) the longest plateau covers less than 35% of the whole 10-second capture (minCoverage = 0.35). The coverage floor was added after device testing showed that a single brief calm second could otherwise salvage a reading from an otherwise-disrupted capture; it is a live-capture-only accept/reject criterion with no offline-tool equivalent."));
kids.push(sp()); kids.push(...img("08_plateau.png", 560, "Figure 3. Plateau detection: the sensor stream is resampled, segmented, and the longest stable plateau's median is taken as the raw reading."));
kids.push(H3("Key code — plateau.ts"));
kids.push(code("// Segmentation criterion: new segment when deviation > max(10%, 30 lx)"));
kids.push(code("if (Math.abs(vals[i] - ref) > Math.max(PLATEAU.relTol * ref, PLATEAU.absTolLux)) {"));
kids.push(code("  if (i - start >= minSamples) segs.push([start, i]);"));
kids.push(code("  start = i;"));
kids.push(code("}"));
kids.push(sp());
kids.push(P("The result is a PlateauReading object containing the raw lux median, a quality flag (good/fair), the plateau duration, and the spread percentage — all saved to the evaluation log for Chapter 4 analysis."));

kids.push(H2("4b  AR Distance: ARCore plane detection and line measurement"));
kids.push(P("The AR module is implemented natively in Kotlin (ARMeasurementActivity.kt) using ARCore via the Gorisse Sceneform fork. It is launched as a separate Android Activity and returns its result to the React Native layer through a NativeModule promise."));
kids.push(P("The session proceeds like this:"));
kids.push(num("ARCore starts tracking and builds a point cloud of feature points from the camera feed. On most indoor surfaces this works within a few seconds."));
kids.push(num("The user taps to place the plant marker. ARCore fires a raycast (hit-test) from the screen touch point into the 3D scene. The app prefers a PLANE hit (highest confidence) over a DEPTH hit (depth sensor) or FEATURE_POINT hit (lower confidence), and records the hit quality."));
kids.push(num("The user taps again to place the window marker on the window surface."));
kids.push(num("The straight-line 3D distance between the two anchors is computed. The horizontal component (floor-plane projection) is extracted, since the tape-measure validation protocol measures horizontally. The horizontal distance is what feeds the recommendation engine."));
kids.push(num("A result dialog (frosted-glass card with entrance animation) shows the measured distance. The user can accept (Use Measurement) or retry (Measure Again)."));
kids.push(num("The ARResult object is returned to the JavaScript layer via the ARModule NativeModule, where it is stored in React state."));
kids.push(P([b("AR caution (load-bearing for the thesis):"), " white walls, plain window frames, and reflective glass give ARCore few feature points, so vertical-surface measurement is the least reliable output. The UI labels window dimensions as 'approximate'; the evaluation log records the AR measurement alongside a manual tape-measure reference for Chapter 4 accuracy analysis. Distance is the reliable output; window size is prototype-grade."]));

kids.push(H2("4c  Compass and GPS: magnetic heading to true window azimuth"));
kids.push(P(["The compass is read through the native CompassModule.kt, which subscribes to Android's sensor fusion of TYPE_ROTATION_VECTOR (the most stable magnetic heading source). The JavaScript wrapper in ", mono("src/sensor/compass.ts"), " collects a burst of circular-mean heading samples during the capture window to reduce short-term jitter."]));
kids.push(P(["GPS is collected once via LocationModule.kt (a one-shot coarse location request). Android's ", mono("GeomagneticField"), " class uses the GPS coordinates to compute the magnetic declination at the device's location. The app adds declination to the magnetic azimuth to get the true-north azimuth of the window:"]));
kids.push(code("trueAzimuthDeg = magneticAzimuthDeg + declinationDeg  // in CompassModule.kt"));
kids.push(P(["The true azimuth is then snapped to one of four 90-degree sectors (N/E/S/W) by ", mono("azimuthToAspect()"), " in ", mono("src/sun/solar.ts"), ". This aspect code is stored for the engine's orientation-match factor and passed to the SPA to define which direction the window faces."]));
kids.push(P("If the compass is unavailable or the user skips Step 4, the app proceeds without an aspect: the SPA is not run, the orientation-match factor shows 'unknown', and the recommendation confidence is marked 'reduced' rather than failing outright."));
kids.push(P([b("Tilt safeguard (field-confirmed cause of a wrong heading):"), " Android's getOrientation() azimuth is only stable when the phone is held flat; tilting it up to read the number — the natural human instinct — destabilises it and was the field-confirmed cause of an apparent 'compass flip'. (An earlier hypothesis blamed hard-iron interference from a metal window frame; this was tested and disproven — a magnet pressed to the phone could not reproduce the flip.) CompassModule.kt therefore emits a tiltDeg value (the angle between the device-Z axis and world-up, which is more stable than pitch/roll), and the live readout warns the user once tilt exceeds 30 degrees so the heading is re-taken flat."]));

kids.push(H2("4d  Solar Position Algorithm (SPA): direct-sun hours"));
kids.push(P("The SPA module (src/sun/solar.ts) is a pure TypeScript implementation of the NOAA General Solar Position Calculations (Meeus-based, ~±0.01 degree accuracy). It answers one specific question: how many hours per day does direct sunlight potentially reach the window, and therefore the spot? The word 'potentially' is important: the model assumes an unobstructed sky. Real trees, buildings, and overhangs can only reduce the estimate."));
kids.push(P(["The calculation starts with ", mono("solarPosition(epochMs, lat, lon)"), ", which converts a UTC timestamp to solar azimuth and elevation at the given GPS coordinates using standard ephemeris equations (Julian date, mean longitude, equation of center, obliquity, declination, equation of time, hour angle). This is then sampled every 5 minutes for the whole calendar day."]));
kids.push(P("The app has two modes for the direct-sun estimate:"));
kids.push(bul([b("Orientation-only mode (estimateDirectSun): "), "used when only the window aspect is known but not the window dimensions. The sun is considered 'in the window' at any sample time when its elevation is above 3 degrees and its azimuth falls within 85 degrees of the window's outward-facing bearing."]));
kids.push(bul([b("Aperture model (estimateDirectSunThroughAperture): "), "used when AR window dimensions (width, height, sill) and plant distance are all available. Adds two geometric tests: (1) the sun must fall within the horizontal cone defined by atan(windowWidth/2 / distance) plus a 6-degree margin for compass error; (2) the sunbeam's vertical position at the spot (sill - distance * tan(elevation)) must overlap the plant's assumed height range (0 to 0.4 m). This is where the AR window measurements enter the calculation."]));
kids.push(P(["The output is a ", mono("DirectSunEstimate"), " containing total hours and a list of time intervals (e.g. '09:05–11:30'). These are shown in the DirectSunCard on the results screen."]));
kids.push(sp()); kids.push(...img("07_spa.png", 600, "Figure 4. Left: the sun's azimuth and elevation path across a summer day in KL. Every 5-minute sample above 3 degrees elevation that falls within the window's bearing is counted. Right: the aperture geometry — horizontal cone and vertical beam tests."));

// ── 5. LUX CALIBRATION ───────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("5.  Lux Calibration — correcting the phone sensor"));
kids.push(P("The Android light sensor is not a calibrated scientific instrument. In field testing with a Samsung S21+, the phone's readings were consistently lower than the reference meter (UNI-T UT383) by about 15% on average, with an additional systematic offset. A linear regression over 210 paired field measurements produced:"));
kids.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 140 },
  children: [new TextRun({ text: "calibrated_lux  =  1.1054  ×  phone_lux  +  134.4", bold: true, size: 26, font: "Courier New", color: GREEN })]
}));
kids.push(P(["with R = 0.996 and R² = 0.993 — a very tight fit. This means the phone consistently underestimates by about 10% and has a systematic intercept of 134 lux. The constants are stored in ", mono("LUX_CALIBRATION"), " inside ", mono("src/engine/config.ts"), " and can only be regenerated by running ", mono("tools/analyze_spot_observations.py"), " on the field dataset — they must never be hand-tuned."]));
kids.push(P(["The engine operates in 'both' mode: the captured reading stays raw in ", mono("SpotInput.lux"), ", and the calibration is applied at scoring time inside ", mono("recommend()"), " in ", mono("src/engine/recommend.ts"), ". Every Recommendation object carries both ", mono("luxRaw"), " (the phone reading) and ", mono("luxUsed"), " (the calibrated value) for transparency and evaluation logging."]));
kids.push(H3("Range guard (below 200 lux)"));
kids.push(P("The linear formula has a large intercept (+134 lux). Below 200 lux, this intercept dominates and produces wild over-predictions — a phone reading of 15 lux would become 151 lux calibrated, when the reference meter shows only 25–26 lux. To prevent this artefact, the calibration function has a range guard:"));
kids.push(code("if (cal.validMinLux != null && rawLux < cal.validMinLux) {"));
kids.push(code("  return Math.round(rawLux);  // return raw — do not apply formula"));
kids.push(code("}"));
kids.push(P("Below 200 lux the raw phone reading is returned unchanged. This is the honest choice: the calibration was validated only between 200 and 6,000 lux, so outside that range the formula should not be trusted."));
kids.push(sp()); kids.push(...img("03_calibration.png", 560, "Figure 5. Lux calibration: phone reading (x-axis) vs reference meter reading (y-axis). The range guard zones are shaded."));

// ── 6. THE ENGINE ────────────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("6.  The Recommendation Engine — step by step"));
kids.push(P(["The entire engine lives in ", mono("src/engine/"), " and is a pure function: given a list of Plant objects and a SpotInput, it returns a RecommendResult with no side effects. This makes it fully unit-testable and identical on-device and in the evaluation test harness."]));
kids.push(P("The engine processes every plant through the same pipeline: calibrate lux → apply gates → score survivors → rank → explain."));

kids.push(H2("6a  Gate 1 — Survival light floor"));
kids.push(P(["Gate 1 asks a simple question: is the measured (calibrated) lux at the spot below the plant's ", mono("maintenance_lux_min"), " — the minimum it needs to survive at all? If yes, the plant is immediately eliminated and no scoring is attempted."]));
kids.push(code("// src/engine/gates.ts"));
kids.push(code("if (p.maintenance_lux_min != null && spot.lux < p.maintenance_lux_min) {"));
kids.push(code("  return { eliminated: true, reason: `Measured light...` };"));
kids.push(code("}"));
kids.push(P("This gate is academically defensible: the maintenance floor is an evidence-based threshold in the plant database, traced to a source URL. Below this lux value the plant cannot photosynthesize enough to survive, regardless of anything else about the spot."));

kids.push(H2("6b  Gate 2 — Direct-sun incompatibility"));
kids.push(P(["Gate 2 eliminates any plant with ", mono("direct_sun_tolerance === 'none'"), " when the spot is determined to receive direct sun (either by SPA estimate ≥ 1 hour, or by the user confirming direct sun was observed during the capture). Direct sun on a no-tolerance plant causes leaf scorch — it is not a scoring penalty, it is a hard veto."]));
kids.push(code("if (p.direct_sun_tolerance === 'none' && spotHasDirectSun(spot)) {"));
kids.push(code("  return { eliminated: true, reason: 'Direct sun present; scorches...' };"));
kids.push(code("}"));
kids.push(P(["Window orientation is deliberately ", b("not"), " a gate — only a scoring and explanation factor. Gating on orientation would contradict the thesis spine: if the measured lux is adequate, the plant can survive, regardless of which direction the window faces. Orientation affects how light quality changes across the day but the measured reading already captures the result of that."]));
kids.push(sp()); kids.push(...img("05_gate_logic.png", 560, "Figure 6. Gate logic flowchart. Only two hard eliminations exist: light too low, or direct sun on a no-tolerance plant."));

kids.push(H2("6c  Light Fit Score (weight = 0.30)"));
kids.push(P(["The light fit score is a piecewise function in ", mono("lightFitScore()"), " (", mono("src/engine/lightFit.ts"), ") that maps the calibrated spot lux to a [0, 1] sub-score for one plant. There are four zones:"]));
kids.push(bul([b("Below survival minimum (already eliminated by Gate 1): "), "returns 0."]));
kids.push(bul([b("Survival zone (above minimum, below preferred floor): "), "ramps linearly from 0.6 to 1.0 as lux climbs from the maintenance floor to the preferred floor. The 0.6 base reflects that the plant is merely persisting, not thriving."]));
kids.push(bul([b("Preferred zone (above preferred floor, at or below ceiling): "), "returns 1.0. The plant is in its ideal light range."]));
kids.push(bul([b("Excess zone (above preferred ceiling): "), "returns 0.7. The plant can survive very bright light but may show stress (bleaching, scorch) — partial credit, not zero."]));
kids.push(code("// Survival zone ramp: 0.6 at floor, 1.0 at preferred floor"));
kids.push(code("return 0.6 + 0.4 * ((lux - floor) / (good - floor));"));
kids.push(sp()); kids.push(...img("04_light_fit.png", 560, "Figure 7. Light fit score curve. The survival zone ramps from 0.6 to 1.0 between the maintenance floor and preferred floor. Excess light scores 0.7."));

kids.push(H2("6d  Direct Sun Factor (weight = 0.25)"));
kids.push(P(["The direct sun factor converts the SPA output (estimated hours per day) and the plant's ", mono("direct_sun_tolerance"), " field into a [0, 1] sub-score. If no sun data was captured (Step 4 skipped), this factor is marked ", mono("available: false"), " and dropped from the weighted sum — the remaining weights are renormalised so the score is still honest."]));
kids.push(tbl(
  ["Plant tolerance", "Spot sun condition", "Sub-score", "Meaning"],
  [
    ["tolerant", "Any", "1.0", "Enjoys full sun — no penalty ever"],
    ["some", "≤ 3 h direct sun", "1.0", "Within the comfortable limit"],
    ["some", "> 3 h direct sun", "0.6", "Approaching or past its limit"],
    ["none", "No direct sun", "1.0", "Perfect — the plant is protected"],
    ["none", "Direct sun present", "0.2", "Risk of scorch (also triggers Gate 2 elimination for stricter cases)"],
    ["unknown", "Any", "0.6", "Cautious neutral — not enough data"],
  ],
  [1600, 2000, 1160, 4600]
));

kids.push(H2("6e  Distance Factor (weight = 0.25)"));
kids.push(P(["The AR-measured distance is converted to a zone (near ≤ 1.0 m, mid ≤ 2.5 m, deep > 2.5 m) and crossed against the plant's light class (low / medium / high, derived from its ", mono("maintenance_lux_min"), " threshold). The ZONE_CLASS_FIT matrix encodes the idea that high-light plants need to be close to the window to get enough light, while low-light plants actually prefer being set back where the light is gentler."]));
kids.push(sp()); kids.push(...img("09_distance_matrix.png", 400, "Figure 8. Distance factor matrix. The diagonal (near/high, mid/medium, deep/low) scores 1.0. Off-diagonal scores 0.7 or 0.4."));
kids.push(sp());
kids.push(P(["If no AR distance was captured, this factor is also marked ", mono("available: false"), " and dropped, with the remaining three factors renormalised."]));

kids.push(H2("6f  Evidence Confidence Factor (weight = 0.20)"));
kids.push(P(["Each plant in the database carries a ", mono("final_confidence"), " rating that reflects the quality of the scientific evidence behind its lux thresholds: species/cultivar-specific peer-reviewed data = high; genus-level data or single study = medium; inferred from indirect sources = low; placeholder estimate = provisional. The confidence factor converts this to a score:"]));
kids.push(tbl(
  ["Confidence level", "Sub-score", "What it means"],
  [
    ["high", "1.0", "Species-specific, peer-reviewed, multi-source agreement"],
    ["medium", "0.7", "Genus-level or single reliable source"],
    ["low", "0.45", "Indirect inference or species-adjacent data"],
    ["provisional", "0.3", "Placeholder — data gap acknowledged in the dataset"],
  ],
  [1800, 1260, 6300]
));
kids.push(P("This factor means that a plant with uncertain thresholds can never top the ranking over a plant with solid evidence even if the other three factors are similar — the database uncertainty propagates honestly into the score."));

kids.push(H2("6g  Weighted Score Formula and renormalisation"));
kids.push(P(["The four sub-scores are combined with the formula in ", mono("scorePlant()"), " (", mono("src/engine/scoring.ts"), "):"]));
kids.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 },
  children: [new TextRun({
    text: "score  =  ( light×0.30 + sun×0.25 + distance×0.25 + confidence×0.20 )  ÷  sum(available weights)",
    bold: true, size: 22, font: "Courier New", color: GREEN
  })]
}));
kids.push(P("The denominator is the sum of the weights of only the available factors — not always 1.0. If Step 4 was skipped and distance is also missing, the engine computes:"));
kids.push(code("// Only light + confidence available"));
kids.push(code("wSum = 0.30 + 0.20 = 0.50"));
kids.push(code("score = (light×0.30 + confidence×0.20) / 0.50"));
kids.push(P("This renormalisation means the score is always on the 0–100 scale and always reflects the available evidence. A partial capture is not penalised relative to its own evidence — but the recommendation carries a 'reduced' confidence flag to tell the user that some inputs were missing."));
kids.push(sp()); kids.push(...img("06_scoring.png", 580, "Figure 9. Weighted score calculation. Four factor boxes feed the weighted sum. The example shows a Snake Plant at 3,200 lux, 0.5 m, 1 h sun."));

kids.push(H2("6h  Ranking and tie-breaking"));
kids.push(P(["After all plants are scored, survivors are sorted in ", mono("recommend()"), " by: (1) score descending, (2) recommendation confidence descending (high > medium > low > provisional > reduced), (3) common name alphabetically as a final tiebreaker. The rank (1-based) is assigned after sorting and attached to each Recommendation."]));
kids.push(P("Eliminated plants are kept in the result under the eliminated array so the UI can show them in the 'Show unsuitable plants' toggle with their gate reason — full transparency about why a plant was ruled out."));

// ── 7. EXPLANATION ───────────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("7.  Explanation Generation"));
kids.push(P(["Every Recommendation carries an ", mono("explanation"), " field — a plain-English paragraph built by ", mono("buildExplanation()"), " in ", mono("src/engine/explain.ts"), ". This is non-negotiable for the thesis: the app must be explainable, not a black box."]));
kids.push(P("The explanation is assembled from four sentence fragments, one for each major factor:"));
kids.push(num([b("Light sentence: "), "Describes whether the lux is in the preferred range, survival range, or excess, using plain language ('right inside its preferred range' / 'enough to keep it alive, but below its preferred range')."]));
kids.push(num([b("Sun sentence: "), "States the sun condition at the spot and whether it suits the plant."]));
kids.push(num([b("Distance sentence: "), "States the measured distance and the zone label ('a close-up spot' / 'a mid-distance spot' / 'a spot well back from the window')."]));
kids.push(num([b("Confidence sentence: "), "Closes with a statement about evidence quality ('backed by high-confidence, species-specific evidence' / 'treat it as a guide')."]));
kids.push(P("If optional inputs were missing, those sentences are simply omitted. The explanation is always grammatically complete and never contains null fragments."));
kids.push(P(["A ", mono("displayWarning"), " string is also generated when warnings are warranted: sun exposure risk, low/provisional confidence, or a proxy-species evidence note. Warnings appear in amber beneath the explanation on the results card."]));

// ── 8. THE DATABASE ──────────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("8.  The Plant Database — Excel to SQLite"));
kids.push(P("The plant data is the core scientific contribution of the project. It consists of 31 indoor plant species with evidence-based lux thresholds derived from peer-reviewed horticultural literature. The data lives in Excel workbooks on OneDrive and is exported to a bundled SQLite database by a Python script."));
kids.push(H2("What the database contains per plant"));
kids.push(tbl(
  ["Field", "Meaning", "Example"],
  [
    ["maintenance_lux_min", "Absolute survival floor. Below this the plant cannot stay alive.", "300 lx (ZZ Plant)"],
    ["maintenance_lux_max", "Upper end of the survival range (before preferred).", "5000 lx"],
    ["preferred_lux_min", "Lower bound of the ideal growth range.", "1000 lx"],
    ["preferred_lux_max", "Upper bound — beyond this, excess stress.", "3000 lx"],
    ["direct_sun_tolerance", "none / some / tolerant / unknown", "none (Anthurium)"],
    ["final_confidence", "high / medium / low / provisional", "high"],
    ["aspect_orientation", "N;E;S;W codes the plant prefers", "N;E"],
  ],
  [2200, 3600, 3560]
));
kids.push(P(["Two threshold levels per plant is an intentional design decision (CLAUDE.md §2.2): the engine can tell the user whether the spot will merely keep the plant alive (survival) or let it actively grow and look its best (preferred). This is more informative than a single 'minimum light' number."]));
kids.push(H2("The export pipeline"));
kids.push(P(["The Python script ", mono("tools/export_to_sqlite.py"), " reads the Excel workbooks and writes ", mono("android/app/src/main/assets/plant_db.sqlite"), ". It gates the build on integrity checks: row counts, orphan foreign keys, missing evidence references, LOOKUP code compliance, and empty source URLs. It aborts on any violation — no silent data corruption."]));
kids.push(P(["The SQLite file is bundled inside the APK and loaded at runtime by ", mono("src/data/plantStore.ts"), " via the PlantDataModule native bridge. The ", mono("mapPlant.ts"), " module converts each database row into a typed Plant object for the engine."]));

// ── 9. RESULTS SCREEN ────────────────────────────────────────────────────────
kids.push(H1("9.  The Results Screen — what the user sees"));
kids.push(P("The results screen is assembled from three cards rendered in order: RecommendationList, then DirectSunCard, then EvaluationCard."));
kids.push(H2("RecommendationList"));
kids.push(P("The top-ranked plant gets a Hero Card: a large dark-green gradient card with a BEST MATCH badge, the plant name, a large score number, a fill-bar progress track, and the full explanation. Tapping 'See score breakdown' expands four mini factor bars (one per factor) with colour-coded scores (green for high, amber for medium, red for low) and a plain-English note for each."));
kids.push(P("Runners-up appear as compact rows beneath, with the same score bar, confidence dot, and explanation. A 'Show unsuitable plants' toggle expands the eliminated list with gate reasons."));
kids.push(H2("DirectSunCard"));
kids.push(P("Shows the SPA result: total estimated hours, the time intervals (e.g. 09:05–11:30), and a pair of SVG diagrams — a side view (showing the sun angle α° and the vertical beam geometry) and a top view (showing the sun's bearing relative to the window)."));
kids.push(H2("EvaluationCard"));
kids.push(P("Shows the evaluation log for Chapter 4 data collection: AR distance, raw and calibrated lux, timestamps, and optional reference fields for manual entry of tape-measure and UT383 reference readings. The reference fields are four tape columns (ref_tape_distance_cm, ref_tape_width_cm, ref_tape_height_cm, ref_tape_sill_cm — so one row validates all four AR-fallible dimensions) and five UT383 lux columns plus a live median (ref_meter_lux_1..5, ref_meter_lux_median — mirroring the original five-reading field protocol). Saved to an append-only real .csv file in app storage (via FileProvider), sharable through the Android share sheet; the destructive log-clear is guarded by a ConfirmModal."));
kids.push(sp()); kids.push(...img("10_e2e_example.png", 580, "Figure 10. End-to-end example: from raw inputs to a scored, ranked plant recommendation."));

// ── 10. APPENDIX ─────────────────────────────────────────────────────────────
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(H1("10.  Appendix — Key Constants at a Glance"));
kids.push(P(["All tuning constants live in ", mono("src/engine/config.ts"), ". They are design decisions stated and defended in Methodology Chapter 3. They must never be hand-tuned — only changed via the designated Python analysis scripts."]));
kids.push(tbl(
  ["Constant", "Value", "Meaning", "Where used"],
  [
    ["WEIGHTS.light", "0.30", "30% of the final score", "scorePlant()"],
    ["WEIGHTS.directSun", "0.25", "25% of the final score", "scorePlant()"],
    ["WEIGHTS.distance", "0.25", "25% of the final score", "scorePlant()"],
    ["WEIGHTS.confidence", "0.20", "20% of the final score", "scorePlant()"],
    ["DISTANCE_ZONES.nearMaxM", "1.0 m", "Near zone ceiling", "distanceFactor()"],
    ["DISTANCE_ZONES.midMaxM", "2.5 m", "Mid zone ceiling", "distanceFactor()"],
    ["LIGHT_CLASS.lowMaxLux", "800 lx", "Low-light class ceiling", "plantLightClass()"],
    ["LIGHT_CLASS.mediumMaxLux", "5000 lx", "Medium-light class ceiling", "plantLightClass()"],
    ["DIRECT_SUN_HOURS_THRESHOLD", "1.0 h", "Minimum hours to count as 'direct sun present'", "applyGates(), spotHasDirectSun()"],
    ["SOME_TOLERANCE_HOURS_OK", "3.0 h", "Max hours before 'some' tolerance plant is penalised", "directSunFactor()"],
    ["LUX_CALIBRATION.slope", "1.1054", "Linear regression slope (S21+ vs UT383)", "applyLuxCalibration()"],
    ["LUX_CALIBRATION.intercept", "134.4 lx", "Linear regression intercept", "applyLuxCalibration()"],
    ["LUX_CALIBRATION.validMinLux", "200 lx", "Range guard lower bound", "applyLuxCalibration()"],
    ["DIRECT_SUN_PARAMS.minElevationDeg", "3 deg", "Sun must clear this elevation to count", "estimateDirectSun()"],
    ["DIRECT_SUN_PARAMS.sampleStepMin", "5 min", "SPA sampling resolution", "estimateDirectSun()"],
    ["APERTURE_PARAMS.azMarginDeg", "6 deg", "Compass/edge error margin in azimuth cone", "estimateDirectSunThroughAperture()"],
    ["PLATEAU.relTol", "0.10 (10%)", "Relative plateau tolerance", "segmentPlateaus()"],
    ["PLATEAU.absTolLux", "30 lx", "Absolute plateau tolerance floor", "segmentPlateaus()"],
    ["PLATEAU.minPlateauMs", "1000 ms", "Shortest accepted plateau (live capture)", "extractPlateauReading()"],
    ["PLATEAU.minCoverage", "0.35", "Longest plateau must cover >=35% of capture, else retry", "extractPlateauReading()"],
    ["NIGHT_THRESHOLD_ELEVATION_DEG", "-6 deg", "Civil twilight — day/night UI check (separate from the SPA 3 deg beam floor)", "daylightStatus(), capturedAtNight"],
  ],
  [2800, 1200, 3200, 2160]
));
kids.push(sp());
kids.push(P(["All constants are in ", mono("src/engine/config.ts"), " and ", mono("src/sensor/plateau.ts"), ". Calibration constants regenerate from ", mono("tools/analyze_spot_observations.py"), ". SPA params are defended in Chapter 3 by accuracy-requirement analysis."], { spacing: { after: 200 } }));

// ── BUILD ─────────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: GREEN },
        paragraph: { spacing: { before: 400, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: MINT },
        paragraph: { spacing: { before: 260, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: INK },
        paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C8DDD0", space: 3 } },
        spacing: { after: 0 },
        children: [new TextRun({ text: "Lumen — Technical Reference", size: 18, color: GREY })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT, spacing: { before: 0 },
        children: [
          new TextRun({ text: "Page ", size: 18, color: GREY }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY }),
          new TextRun({ text: " of ", size: 18, color: GREY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GREY }),
        ]
      })] })
    },
    children: kids
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  const kb = Math.round(buf.length / 1024);
  console.log(`Written: ${OUT}  (${kb} KB)`);
});
