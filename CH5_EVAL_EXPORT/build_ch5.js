/* Build Chapter 5 (Results and Evaluation) as a Word document in the thesis
 * house style (Times New Roman 12pt, black bold headings, captions below
 * tables/figures). All numbers are the confirmed live results. Prose obeys the
 * Chapter 3/4 rules: no em dashes, no en dashes, no semicolons, and no colons in
 * running prose (colons only in figure/table captions). Ranges written as "to".
 * Run:  NODE_PATH=../../tools/eval/docx_build/node_modules node build_ch5.js
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, Footer, PageBreak,
} = require("docx");

const IMG = path.join(__dirname, "figures");
const OUT = path.join(__dirname, "SWE2302061_Chapter5_FULL_DRAFT.docx");
const CONTENT_W = 9360;
const GREY = "666666";

// ---- helpers ---------------------------------------------------------------
function pngSize(file) {
  const b = fs.readFileSync(path.join(IMG, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function figure(file, maxWpx, caption) {
  const { w, h } = pngSize(file);
  const scale = Math.min(1, maxWpx / w);
  const width = Math.round(w * scale), height = Math.round(h * scale);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 160, after: 40 },
      children: [new ImageRun({
        type: "png", data: fs.readFileSync(path.join(IMG, file)),
        transformation: { width, height },
        altText: { title: caption, description: caption, name: file },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: caption, italics: true, size: 20 })],
    }),
  ];
}
// body run 12pt Times New Roman
const run = (t, o = {}) => new TextRun({ text: t, size: 24, ...o });
const b = (t) => run(t, { bold: true });
function P(parts, o = {}) {
  const children = (Array.isArray(parts) ? parts : [parts]).map(p =>
    typeof p === "string" ? run(p) : p);
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 160, line: 360 },
    children, ...o,
  });
}
function H1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 }, children: [new TextRun({ text: t, bold: true, size: 32 })] }); }
function H2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 120 }, children: [new TextRun({ text: t, bold: true, size: 28 })] }); }

// ---- tables ----------------------------------------------------------------
const bd = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
function cell(text, width, { head = false, alignRight = false } = {}) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: head ? "E7E6E6" : "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { after: 0, line: 264 },
      children: [new TextRun({ text: String(text), bold: head, size: 21 })],
    })],
  });
}
function table(headers, rows, widths, caption) {
  const headRow = new TableRow({ tableHeader: true, children: headers.map((hh, i) => cell(hh, widths[i], { head: true })) });
  const bodyRows = rows.map(r => new TableRow({
    children: r.map((c, i) => cell(c, widths[i], { alignRight: i > 0 && /^[-\d(]/.test(String(c)) })),
  }));
  const t = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: [headRow, ...bodyRows] });
  const cap = new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 80, after: 200 },
    children: [new TextRun({ text: caption, italics: true, size: 20 })],
  });
  return [t, cap];
}

// ===========================================================================
const kids = [];

// Title block
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "CHAPTER 5", bold: true, size: 32 })] }));
kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [new TextRun({ text: "RESULTS AND EVALUATION", bold: true, size: 32 })] }));

// 5.1 Introduction
kids.push(H1("5.1 Introduction"));
kids.push(P("This chapter reports how well Lumen performs, measured against the three research questions set out in Chapter 3, and it reports the functional testing of the finished application. Because the project is a theoretical one with no human user study, which was agreed with the supervisor, the chapter rests on measured results rather than on a questionnaire. Every number in this chapter comes from running the real application code, the real plant dataset, or the two field validation logs, and each value can be traced back to the file that produced it. A measured result of this kind is a firmer base than a survey of opinion, because anyone who runs the same code on the same data can reproduce it."));
kids.push(P("The three research questions are restated here so the chapter stands on its own. Research question one asks whether the measuring tools inside Lumen, the light sensor, the augmented reality distance, and the window sizing, are accurate enough to be trusted. Research question two asks whether every measured input actually changes the recommendation, or whether the light reading alone quietly does all of the work. Research question three asks whether measuring the real conditions at a spot produces more spot specific recommendations than the fixed label method used by existing apps."));
kids.push(P("The chapter is organised as follows. Section 5.2 validates the measuring instruments against trusted references and answers research question one. Section 5.3 checks that the recommendation engine applies its own rules correctly, a precondition that must hold before the later results carry any meaning. Section 5.4 answers research question two by holding the light reading still and varying the other inputs. Section 5.5 answers research question three by comparing Lumen against a fixed label baseline. Section 5.6 reports the functional testing. Section 5.7 discusses what the results mean, and Section 5.8 summarises the chapter. Usability testing, in which real users would judge the recommendations, is outside the scope of this theoretical project and is treated as a limitation in Chapter 6."));

// 5.2 Instrument Validation
kids.push(H1("5.2 Instrument Validation (Research Question 1)"));
kids.push(P("A recommendation can only be as trustworthy as the measurements it is built on, so the measuring tools are checked first. This section validates each measured input against a trusted reference value, which is a value from a proper instrument that is treated as correct, in the way the answer key at the back of a textbook is treated as correct. Such a reference value is called the ground truth."));

kids.push(H2("5.2.1 Light Sensor Calibration"));
kids.push(P("The phone light sensor reads lower than a proper light meter, so a fixed conversion is applied to correct it. The conversion was fitted from 210 paired readings, where each pair is one phone reading taken next to one reading from a UT383 reference light meter, collected across seventy sessions and three distances of 50, 100 and 150 cm from a window. The fitted line is meter equals 1.1054 times phone plus 134.4. The two tools move together almost perfectly, with a Pearson correlation of 0.996, where a value of 1 would mean they rise and fall in perfect step, and the line explains 99.3 percent of the variation in the meter reading, written as an R squared of 0.993. Figure 5.1 shows the 210 pairs with the fitted line. The points sit in a tight cluster along the line, which is the visual reason the conversion can be trusted."));
kids.push(...figure("fig_5_1_calibration_scatter.png", 560, "Figure 5.1: Agreement between the phone light sensor and the reference meter across 210 paired readings, with the fitted conversion line and the line of perfect agreement. The inset magnifies the dense low light region."));
kids.push(P("Table 5.1 breaks the agreement down by sky condition, by distance, and by light level. Across every slice the correlation stays high, which shows the conversion is not an accident of one particular condition. The largest average gaps in lux appear in the brightest readings and at the closest 50 cm distance, where the absolute values are largest, while the percentage gaps stay broadly stable."));
kids.push(...table(
  ["Breakdown slice", "n", "Mean gap (lux)", "Mean gap (%)", "Correlation r"],
  [
    ["All readings", "210", "379.9", "16.4", "0.996"],
    ["Sky, overcast", "69", "279.7", "14.4", "0.989"],
    ["Sky, partly cloudy", "30", "612.8", "19.1", "0.989"],
    ["Sky, rainy", "57", "134.8", "16.0", "0.983"],
    ["Sky, sunny", "54", "637.2", "17.6", "0.998"],
    ["Distance, 50 cm", "70", "590.7", "16.8", "0.996"],
    ["Distance, 100 cm", "70", "340.5", "15.6", "0.997"],
    ["Distance, 150 cm", "70", "208.6", "16.7", "0.989"],
    ["Light, under 500 lux", "51", "30.6", "14.8", "0.979"],
    ["Light, 500 to 2000 lux", "65", "221.0", "18.3", "0.885"],
    ["Light, 2000 lux and above", "94", "679.3", "15.8", "0.996"],
  ],
  [3360, 900, 1800, 1650, 1650],
  "Table 5.1: Light sensor agreement with the reference meter, broken down by sky, distance and light level (source, agreement_summary.csv).",
));

kids.push(H2("5.2.2 Calibration Cross-Validation"));
kids.push(P("A conversion that fits its own data well might still fail on new readings, so it was tested by cross validation, which means fitting the line on part of the data and checking it on the part held back. The check used a five fold session level split. The seventy sessions were divided into five groups, and in turn each group was held out for testing while the line was refitted on the other four, so that no reading from a session ever appeared in both the fitting set and the test set. Keeping whole sessions together matters, because two readings from the same session are not truly independent, and letting them straddle the two sets would make the test look easier than it really is. This is like sitting an exam set from a chapter you did not revise, rather than from the exact questions you had already practised."));
kids.push(P("On the 183 held out readings at or above 200 lux, which is the range the app trusts, the average gap was 267.5 lux and the average percentage gap was 15.07 percent. Table 5.2 lists the five folds. Below 200 lux the percentage gap rises sharply, to 38.36 percent when all readings are included, because at such low light a gap of only a few lux is a large fraction of the reading. For that reason the app does not apply the conversion below 200 lux and returns the raw value instead, which avoids turning a 15 lux reading into a misleading 151 lux. The conversion constants shipped in the app are the ones fitted on all 210 readings, and the cross validation is a separate check that the conversion holds up on readings it never saw."));
kids.push(...table(
  ["Fold", "Held out readings", "Slope", "Intercept", "Mean gap (lux)", "Mean gap (%)"],
  [
    ["1", "36", "1.141", "98.6", "286.4", "12.07"],
    ["2", "34", "1.097", "153.1", "263.1", "18.99"],
    ["3", "35", "1.098", "148.7", "278.3", "12.91"],
    ["4", "41", "1.104", "166.8", "274.6", "14.80"],
    ["5", "37", "1.100", "180.5", "235.3", "16.73"],
    ["All held out, phone 200 lux and above", "183", "", "", "267.5", "15.07"],
  ],
  [3560, 1900, 900, 1000, 1000, 1000],
  "Table 5.2: Five fold session level cross-validation of the light conversion (source, calibration_crossval.csv).",
));

kids.push(H2("5.2.3 AR Distance Validation"));
kids.push(P("The augmented reality distance was checked against a tape measure across thirty spots, spanning near, middle and deep placements. The comparison uses a Bland Altman analysis, which is the standard way to compare two measuring tools. It plots the gap between the two tools against their average, so the reader can see both the typical gap and how far the gap can stray. Figure 5.2 shows the plot."));
kids.push(P("The augmented reality reading was on average 5.6 cm longer than the tape, an average absolute gap of 9.2 cm, or 11.1 percent of the true distance, and the two tools correlate at 0.990. The limits of agreement, which are the band inside which about 95 of every 100 gaps fall, run from 25.2 cm short to 36.3 cm long. One spot stands out, at 63.3 cm too long, and it is marked separately in Figure 5.2. It came from a poor lock onto a semi reflective floor, the kind of surface Chapter 3 flagged as difficult for augmented reality. Because the engine uses the distance only to place the spot into one of three broad zones, near up to 1.0 m, middle up to 2.5 m, and deep beyond that, a typical gap of a few centimetres changes the recommendation only when a spot sits right on a zone boundary."));
kids.push(...figure("fig_5_2_bland_altman_ar.png", 540, "Figure 5.2: Bland Altman agreement between the augmented reality distance and a tape measure (n equals 30). The centre line is the average gap and the dashed lines are the limits of agreement. The single large outlier is marked."));

kids.push(H2("5.2.4 Window Size Validation"));
kids.push(P("The window sizing was checked against a tape measure across thirty windows, giving ninety measurements once width, height and sill height are counted separately. The honest picture is that the three dimensions are not equally reliable. Table 5.3 and Figure 5.3 report each one on its own. Width is measured well, with an average gap of 5.3 cm, or 3.6 percent. Height is middling, at 15.1 cm, or 7.2 percent. Sill height is the weakest, at 17.7 cm, or 37.6 percent. The large percentage on the sill comes from two things, the sills are often physically low, so a small gap in centimetres is a large fraction of a small number, and two windows produced gross augmented reality failures where the reading locked onto a far surface. This is exactly why Lumen treats the window dimensions as approximate and never lets them act as a hard filter in the recommendation. They feed only the sun estimate, which is itself labelled as potential sun."));
kids.push(...table(
  ["Window dimension", "Measurements", "Mean gap (cm)", "Mean gap (%)"],
  [
    ["Width", "30", "5.3", "3.6"],
    ["Height", "30", "15.1", "7.2"],
    ["Sill height", "30", "17.7", "37.6"],
  ],
  [3360, 2000, 2000, 2000],
  "Table 5.3: Augmented reality window sizing accuracy per dimension, against a tape measure (source, Window_Size_AR_vs_Tape_Log.xlsx).",
));
kids.push(...figure("fig_5_3_window_dimensions.png", 600, "Figure 5.3: Window sizing accuracy per dimension. Width is reliable and sill height is the weakest, shown as both the average gap in centimetres and the same gap as a percentage of the true size."));

// 5.3 Engine Correctness
kids.push(H1("5.3 Engine Correctness"));
kids.push(P("Before the later results can mean anything, the engine must be shown to apply its own rules correctly. If the engine did not faithfully use each plant's published light thresholds, then any finding about how it differentiates spots would be meaningless. This section is therefore a gate that must pass first, and it is not a research question in its own right."));
kids.push(P("The check works by building an independent oracle, which is a second, separately written piece of code that works out the expected verdict for each plant straight from that plant's own cited thresholds, its minimum survival light, its preferred range, and its direct sun tolerance. The expected verdicts are then compared against what the real engine produces from end to end. The oracle shares only two things with the engine, the same calibration conversion and the single published constant that counts one hour of direct sun as sun being present, and it re derives all of the gate and light band decisions on its own. Because the decision logic is written independently, agreement between the two cannot be circular."));
kids.push(P("Across ten representative spots and all thirty one plants, with two checks for each plant, a gate check and a light band check, all 620 of the 620 decisions agreed, with no mismatches. Table 5.4 lists the ten spots. This confirms the pipeline faithfully implements the cited thresholds and that there is no wiring fault between the evidence base and the output. The check runs automatically as part of the test suite and it is pure logic, so it does not depend on any human judgement of plant health."));
kids.push(...table(
  ["Spot", "Description", "Converted lux", "Recommended", "Eliminated"],
  [
    ["S1", "very dim, no sun", "80", "0", "31"],
    ["S2", "dim, no sun", "577", "7", "24"],
    ["S3", "low to mid, no sun", "1793", "25", "6"],
    ["S4", "mid, no sun", "3451", "30", "1"],
    ["S5", "mid, 3 h sun", "3451", "8", "23"],
    ["S6", "bright, no sun", "6767", "30", "1"],
    ["S7", "bright, 4 h sun", "6767", "8", "23"],
    ["S8", "very bright, 5 h sun", "13399", "8", "23"],
    ["S9", "low, 2 h sun", "1793", "6", "25"],
    ["S10", "mid, sun present", "2898", "8", "23"],
  ],
  [1000, 3360, 2000, 1500, 1500],
  "Table 5.4: The ten spots used in the engine correctness check. All 620 gate and band decisions matched the independently derived expectation (source, engine_correctness.test.ts).",
));

// 5.4 Input Sensitivity
kids.push(H1("5.4 Input Sensitivity (Research Question 2)"));
kids.push(P("Research question two asks whether every measured input really moves the recommendation, or whether the light reading alone quietly decides everything. The test changes one thing at a time. The light reading is held at exactly the same value, 3000 lux from the phone, which the engine converts to 3451 lux, while only the distance and the direct sun change across three spots. If the engine were secretly light only, the answer would not move. Table 5.5 shows that it moves a great deal."));
kids.push(...table(
  ["Spot (light fixed at 3000 lux)", "Distance", "Direct sun", "Plants recommended"],
  [
    ["A, near and sunny", "0.5 m", "5 hours", "8"],
    ["B, deep and shaded", "3.0 m", "0 hours", "30"],
    ["C, middle", "1.5 m", "2 hours", "8"],
  ],
  [3960, 1800, 1800, 1800],
  "Table 5.5: With the light held fixed, changing only distance and sun changes the number of recommended plants (source, ivdv_evaluation.test.ts).",
));
kids.push(P("With no direct sun at spot B, nothing risks scorching, so thirty of the thirty one plants pass at 3000 lux. At spots A and C the sun is present, so the direct sun gate removes every plant that cannot take direct sun, leaving eight. The fall from thirty to eight is caused only by the sun input, since the light never changed. A fixed label method that reads only the light would have returned the same count at all three spots."));
kids.push(P("Spots A and C are worth a closer look. They recommend the very same eight plants, yet in a different order, because the nearer distance and the longer sun exposure at spot A change the weighted scores. So distance changes the ranking here even where it does not change which plants appear. As one plain example, the Snake Plant survives all three spots and its score rises from 76.5 at spot A to 94.0 at spot C as its distance and sun ingredients change, which shows these inputs feed the score arithmetic and not merely the wording of the explanation."));
kids.push(P("A note on which inputs a real user can skip. The window facing, and with it the sun estimate, is the genuinely optional step, and when it is missing the engine drops the sun ingredient and rescales the rest. The distance is a required capture, so this test varies it to expose its weight rather than to suggest it can be left out. The overall result is that light, distance and sun are all load bearing."));

// 5.5 Comparison with a Fixed-Label Baseline
kids.push(H1("5.5 Comparison with a Fixed-Label Baseline (Research Question 3)"));
kids.push(P("Research question three is the core contribution. It compares Lumen against the fixed label method that existing apps use. That baseline sorts the spot light into one of three wide buckets, low from 1 to 4000 lux, medium from 4000 to 11000 lux, and full from 11000 to 32000 lux, and then returns every plant that tolerates the bucket, in no particular order. The baseline used here is a faithful re implementation of that rule, which isolates the difference in method. It is not a third party app, which keeps the comparison controlled."));

kids.push(H2("5.5.1 The Within-Band Opportunity"));
kids.push(P("The baseline can only tell two spots apart when their light readings fall in different buckets, so the first question is how often a real change in light stays hidden inside one bucket. Using the ground truth meter readings from the seventy field sessions, and reading the light at 50, 100 and 150 cm from the window, 41 of the 70 sessions, which is 59 percent, stay within a single bucket across all three distances, while the remaining 29, which is 41 percent, cross a bucket line. Figure 5.4 shows every session with the two bucket boundaries drawn across it. The 59 percent of sessions that stay within a bucket are exactly the cases where the light genuinely changes with distance yet the baseline cannot see it, and where the measured engine, reading the precise value against each plant's own minimum, can. This 59 percent figure is stable, it becomes 60 percent when computed on the calibrated phone reading the app actually uses, so it is not an artefact of which reading is chosen."));
kids.push(...figure("fig_5_4_distance_falloff.png", 560, "Figure 5.4: Measured light at 50, 100 and 150 cm from the window for all seventy sessions, on a logarithmic scale, with the two fixed label band boundaries. Sessions that stay within one band are drawn apart from sessions that cross a band."));

kids.push(H2("5.5.2 The Three Comparison Groups"));
kids.push(P("Three groups of spots make the difference concrete. Table 5.6 gives the count returned by each method, and Figure 5.5 illustrates the cleanest of the three. In group one, two spots read the same 2000 lux, but one faces north with no direct sun and the other faces west with three hours of sun. The baseline gives both the identical list of thirty plants, because a light reading cannot carry whether the sun reaches the spot. The engine keeps twenty eight plants for the shaded spot but only eight for the sunny one, having removed the plants that would scorch. This sun case is the strongest evidence, because it holds no matter how light and distance are related. In group two, a real fall off that stays inside one bucket, the light drops from 2800 to 1328 lux across the three distances yet never leaves the low bucket, so the baseline returns the same thirty plants at every distance, while the engine drops to nineteen at the dimmest 150 cm spot. In group three, a fall off that crosses buckets, from 12040 down to 3410 lux, the baseline does react, its counts moving with the bucket, and this is credited honestly. The engine's advantage in group three is that it still ranks the survivors."));
kids.push(...table(
  ["Group", "Spot", "Baseline count", "Engine count"],
  [
    ["1, same lux, different sun", "north window, no sun", "30", "28"],
    ["1, same lux, different sun", "west window, 3 h sun", "30", "8"],
    ["2, fall off within one band", "50, 100, 150 cm", "30, 30, 30", "30, 30, 19"],
    ["3, fall off across bands", "50, 100, 150 cm", "31, 30, 30", "30, 30, 30"],
  ],
  [3260, 2900, 1600, 1600],
  "Table 5.6: Recommended counts from the fixed label baseline and the measured engine across the three comparison groups (source, ivdv_evaluation.test.ts).",
));
kids.push(...figure("fig_5_5_rq3_concept.png", 580, "Figure 5.5: Why the measured approach separates spots the fixed label method collapses. Both spots read 2000 lux, so the baseline returns one identical unranked list, while the engine reads the sun and distance and keeps twenty eight plants for the shaded spot but only eight for the sunny one."));

kids.push(H2("5.5.3 Ranking Advantage"));
kids.push(P("Even when the two methods return the same set of plants, they differ in one further way. The baseline is unranked by design and hands back a flat list. The engine always orders its survivors by suitability, using the distance and sun that the baseline never reads. So across all seventy sessions the engine adds a best first ordering that the fixed label method cannot provide, whatever the light bucket."));

// 5.6 Functional Testing
kids.push(H1("5.6 Functional Testing"));
kids.push(P("Alongside the measured evaluation, the finished application was checked with 38 manual black box test cases, numbered TC-01 to TC-38, covering the wizard flow, the captures, the augmented reality, the engine gates, the sun module, the evaluation log, and a range of edge cases. Table 5.7 summarises the cases by module area. Of the 38 cases, 37 passed and one failed, which is TC-37."));
kids.push(...table(
  ["Module area", "Cases", "Pass", "Fail"],
  [
    ["Lux capture and calibration", "4", "4", "0"],
    ["Augmented reality distance", "5", "4", "1"],
    ["Compass and sun estimate", "7", "7", "0"],
    ["Recommendation engine", "6", "6", "0"],
    ["Window sizing", "4", "4", "0"],
    ["Wizard flow", "6", "6", "0"],
    ["Evaluation log", "2", "2", "0"],
    ["System and offline", "3", "3", "0"],
    ["Interface polish", "1", "1", "0"],
    ["Total", "38", "37", "1"],
  ],
  [3960, 1800, 1800, 1800],
  "Table 5.7: Manual functional test cases by module area (source, Functional_Test_Case_Log_v2.xlsx).",
));
kids.push(P("The single failure, TC-37, is reported in full, because one transparent failure is a stronger sign of an honest test process than a suspicious clean sweep. TC-37 checks that a phone that genuinely cannot run augmented reality shows a clear message rather than a blank screen. The original defect, a black screen with no way out, was fixed, and the application now handles such a phone gracefully through three layers of defence. It checks augmented reality support at start up and greys out the augmented reality buttons when the phone reports itself as not capable, it checks again in native code before opening the camera view, and it catches the late failure that appears on some phones only after a trip to the store to install augmented reality services."));
kids.push(P("The case was recorded as a failure because on the test phone the buttons were greyed out at start up, so the exact on tap message named in the expected result never appeared. In other words the phone was handled safely, with no black screen and with the tape measure fallback still available, but by a different one of the three layers than the test expected. The underlying reason is that the augmented reality framework reports an unsupported phone through more than one status, and the three layers each answer a different status, so the exact wording a user sees depends on which status their phone returns. This is a consistency gap in the message, not a crash or a wrong result, and closing it with a single unified check is noted as future work in Chapter 6."));
kids.push(P("The manual suite is backed by a larger automated suite of 118 tests across 11 files, all passing, with the type checker reporting no errors. Together these give confidence that the behaviour described in this chapter is the behaviour of the shipped code."));

// 5.7 Discussion
kids.push(H1("5.7 Discussion"));
kids.push(P("The results answer the three research questions in turn. For research question one, the measuring instruments are accurate within stated bounds. The light conversion is tight, with a correlation of 0.996 and a held out percentage gap of about 15 percent in its trusted range. The augmented reality distance is accurate enough to place a spot in the correct broad zone, with an average gap near 9 cm. The window sizing is reliable for width but weak for the sill, which is why it never acts as a hard filter. For research question two, every measured input moves the recommendation, since the set of plants, their ranking, and their scores all change when distance and sun change while the light is held still. For research question three, the measured approach separates spots that the fixed label baseline collapses, in a quantified 59 percent of real sessions where a light change hides inside one bucket, and it adds a suitability ranking throughout, while the baseline is credited for the 41 percent of sessions where the light does cross a bucket."));
kids.push(P("Two honest limits frame these results. First, the evaluation establishes internal validity, that the system does the right thing according to its own evidence and inputs, but it does not establish real world effectiveness, because no long term horticultural trial was run in which recommended plants were grown and observed over time. Second, the direct sun estimate is a geometric prediction, checked for correctness against known solar positions, and it is not validated against measured hours of sun on site, so it is always presented as potential sun. Both points are carried forward into Chapter 6. Usability testing, in which real users would judge whether they prefer the recommendations, was outside the scope of this supervisor approved theoretical project and is treated fully as a limitation in Chapter 6."));

// 5.8 Chapter Summary
kids.push(H1("5.8 Chapter Summary"));
kids.push(P("This chapter evaluated Lumen against its three research questions and reported its functional testing, using measured results throughout. The instruments were validated against trusted references, with a tight light conversion, a distance accurate enough for zone placement, and a window sizing that is reliable except for the sill height. The engine was shown to apply its own rules correctly in all 620 checked decisions. Holding the light still and varying distance and sun proved that every measured input moves the recommendation. Comparing Lumen against a fixed label baseline showed that the measured approach differentiates spots the baseline cannot, in 59 percent of real sessions, and ranks the results throughout. The functional testing passed 37 of 38 cases, with the single failure reported openly and tied to a future improvement. Chapter 6 draws these findings together into the conclusion, states the limitations in full, and sets out the future work."));

// ---- document --------------------------------------------------------------
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24, color: "000000" } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "000000", font: "Times New Roman" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: "000000", font: "Times New Roman" },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Chapter 5   ", size: 18, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY })] })] }) },
    children: kids,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, "(" + Math.round(buf.length / 1024) + " KB)"); });
