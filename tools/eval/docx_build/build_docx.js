/* Build the plain-language evaluation report as a Word document with embedded
 * diagrams. All numbers are the real engine/dataset results. */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, Footer, Header, PageBreak,
} = require("docx");

const IMG = path.join(__dirname, "img");
const OUT = path.join(__dirname, "..", "output", "Lumen_Evaluation_Report.docx");

const GREEN = "2E7D45", INK = "1B2A20", GREY = "666666", AMBER = "B07D2A", BLUE = "3B6EA5";
const CONTENT_W = 9360;

// ---- helpers ---------------------------------------------------------------
function pngSize(file) {
  const b = fs.readFileSync(path.join(IMG, file));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function image(file, maxWpx, caption) {
  const { w, h } = pngSize(file);
  const scale = Math.min(1, maxWpx / w);
  const width = Math.round(w * scale), height = Math.round(h * scale);
  const out = [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 140, after: 40 },
      children: [new ImageRun({
        type: "png", data: fs.readFileSync(path.join(IMG, file)),
        transformation: { width, height },
        altText: { title: caption || file, description: caption || file, name: file },
      })],
    }),
  ];
  if (caption) out.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 180 },
    children: [new TextRun({ text: caption, italics: true, size: 18, color: GREY })],
  }));
  return out;
}
const run = (t, o = {}) => new TextRun({ text: t, size: 22, ...o });
function P(parts, o = {}) {
  const children = (Array.isArray(parts) ? parts : [parts]).map(p =>
    typeof p === "string" ? run(p) : p);
  return new Paragraph({ spacing: { after: 140, line: 276 }, children, ...o });
}
function H1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }); }
function H2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }); }
function bullet(parts) {
  const children = (Array.isArray(parts) ? parts : [parts]).map(p =>
    typeof p === "string" ? run(p) : p);
  return new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 80, line: 276 }, children });
}
function numbered(ref, parts) {
  const children = (Array.isArray(parts) ? parts : [parts]).map(p =>
    typeof p === "string" ? run(p) : p);
  return new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 100, line: 276 }, children });
}
const b = (t) => run(t, { bold: true });
const bg = (t) => run(t, { bold: true, color: GREEN });
const br = (t) => run(t, { bold: true, color: "C0504D" });

// ---- tables ----------------------------------------------------------------
const bd = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
function cell(text, width, { head = false, alignRight = false, fill } = {}) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: fill || (head ? "D6EEDD" : "FFFFFF"), type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold: head, size: 20 })],
    })],
  });
}
function table(headers, rows, widths) {
  const headRow = new TableRow({ tableHeader: true, children: headers.map((hh, i) => cell(hh, widths[i], { head: true })) });
  const bodyRows = rows.map(r => new TableRow({
    children: r.map((c, i) => cell(c, widths[i], { alignRight: i > 0 && /^[-\d]/.test(String(c)) })),
  }));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: [headRow, ...bodyRows] });
}
const sp = () => new Paragraph({ spacing: { after: 80 }, children: [] });

// ===========================================================================
const kids = [];

// Title block
kids.push(new Paragraph({
  spacing: { after: 60 }, children: [new TextRun({ text: "Lumen — Evaluation Report", bold: true, size: 48, color: GREEN })],
}));
kids.push(new Paragraph({
  spacing: { after: 60 }, children: [new TextRun({ text: "Does the recommendation engine really use measured light, distance and sun — and is that better than the “label” method other apps use?", bold: true, size: 26, color: INK })],
}));
kids.push(P([run("A plain-language report written so a non-programmer can follow it. Every technical word is explained. All numbers come from running the real app engine on the real plant dataset. ", { italics: true, color: GREY, size: 20 })]));
kids.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 4 } }, spacing: { after: 200 }, children: [] }));

// What's inside
kids.push(H2("What's inside"));
[
  "1. Why this report exists — your worry, in plain terms",
  "2. The short answer",
  "3. The words you need (including “variables”)",
  "4. How the engine works",
  "5. Part 1 — proof the engine really uses distance and sun",
  "6. “But light already changes with distance!” — your question, answered with your data",
  "7. Part 2 — your engine vs the old “label” method",
  "8. How this connects to your thesis",
  "9. Honest limitations",
  "10. Glossary",
].forEach(t => kids.push(bullet(t)));
kids.push(new Paragraph({ children: [new PageBreak()] }));

// 1. The doubt
kids.push(H1("1. Why this report exists — your worry, in plain terms"));
kids.push(P([
  "Your project's big new idea is simple to say: ", b("other apps guess a plant's light from a vague label"),
  " (“this is a low-light room”), but ", bg("your app measures the real light at the exact spot"),
  ", and also looks at how far the spot is from the window and whether the sun reaches it.",
]));
kids.push(P([
  "Hiding inside that idea was a fair worry: ", br("what if the engine only pretends to use distance and sun?"),
  " What if, deep down, the recommendation is really decided by the light reading alone? If that were true, your “multi-factor” system would secretly be a “one-factor” system, and the novelty would weaken. So before writing the evaluation chapter, you needed proof — from the running code, not the design notes — that distance and sun genuinely change the answer.",
]));
kids.push(...image("01_doubt.png", 600, "Figure 1. The worry: is the engine really using all three inputs, or secretly just the light reading?"));

// 2. Short answer
kids.push(H1("2. The short answer"));
kids.push(P([bg("The engine is the left-hand picture, not the right. "), "It genuinely uses light, distance and sun. This was proven by running the real engine (the exact code in the app) on the real 31-plant dataset."]));
kids.push(bullet([b("Part 1 (the check): "), "keeping the light reading exactly the same and changing only distance and sun, the answer moved from ", b("8 plants, to 30 plants, to 8 plants"), ". A light-only system would have given the same answer all three times. It did not."]));
kids.push(bullet([b("Part 2 (the comparison): "), "the old “label” method gives two spots the same plant list whenever they share a light band — even when one is a scorching sunny window and the other a shady corner. Your engine tells them apart."]));
kids.push(bullet([b("Your sharp question about distance "), "(“doesn't light already change with distance?”) is answered honestly in Section 6 using your own field data — and it actually points to where your argument is strongest."]));

// 3. Words
kids.push(H1("3. The words you need (including “variables”)"));
kids.push(P([b("Lux"), " — a number for how bright the light is, the way a human eye sees it. Your phone's light sensor reads it. Bigger = brighter."]));
kids.push(P([b("AR distance"), " — “AR” is augmented reality (the phone uses its camera to understand 3D space). The app uses it to measure how far the plant spot is from the window, in metres."]));
kids.push(P([b("SPA / sun exposure"), " — “SPA” is the Solar Position Algorithm, standard astronomy maths that works out where the sun is in the sky for a place, date and time. The app uses it to estimate how many hours of direct sun could reach the spot."]));
kids.push(P([b("Independent variable (IV)"), " and ", b("dependent variable (DV)"), " — the language of an experiment. An ", b("independent variable"), " is an input you change (the knobs): here, light, distance and sun. A ", b("dependent variable"), " is the output you watch to see if it moved: here, the recommendation (which plants, in what order, with what score)."]));
kids.push(P([b("Fixed-label method (“the old way”)"), " — what existing apps such as ", b("Green Oasis"), " do: pick a light level (low / medium / high) from a fixed table and return every plant tagged for it. It never looks at distance or sun."]));

// 4. Engine
kids.push(H1("4. How the engine works"));
kids.push(P("The engine works in two steps. First it removes clearly unsuitable plants (the “gates”). Then it scores and ranks the ones that remain."));
kids.push(...image("02_pipeline.png", 470, "Figure 2. The engine pipeline: two gates remove unsuitable plants, then a blended score ranks the rest."));
kids.push(P([b("The score is like a recipe. "), "Each surviving plant gets a 0–100 score blended from four ingredients in fixed shares. The distance and sun ingredients are the ones that change when you move the spot."]));
kids.push(...image("03_recipe.png", 600, "Figure 3. The score recipe: light 30%, sun 25%, distance 25%, evidence quality 20%."));
kids.push(P([b("One honest detail for the methodology chapter: "), "window direction and window size do not go straight into the score. They are used earlier, to work out the sun-exposure number, which then enters the engine. So they are “upstream” inputs — real, but indirect."]));

// 5. Part 1
kids.push(H1("5. Part 1 — proof the engine really uses distance and sun"));
kids.push(P([b("The idea: "), "change one thing at a time. Hold the light reading still (3000 lux in all three spots) and change only the distance and the sun. If the engine were secretly light-only, the answer would freeze. If it moves, the other inputs must be doing real work."]));
kids.push(table(
  ["Spot (light fixed at 3000 lux)", "Distance", "Direct sun", "Plants recommended"],
  [["A — near & sunny", "0.5 m", "5 hours", "8"], ["B — deep & shaded", "3.0 m", "0 hours", "30"], ["C — middle", "1.5 m", "2 hours", "8"]],
  [3960, 1800, 1800, 1800],
));
kids.push(sp());
kids.push(...image("04_part1.png", 560, "Figure 4. Same light in all three spots, but the answer changes (8 / 30 / 8) because distance and sun changed."));
kids.push(P([b("Why these numbers make sense. "), "In spot B there is no direct sun, so nothing risks scorching and almost every plant survives 3000 lux — 30 of 31 pass. In spots A and C the sun is now present, so the engine's sun gate removes every plant that burns in direct sun, leaving only the 8 that tolerate it. ", b("That drop from 30 to 8 is caused only by the sun input"), " — the light never changed."]));
kids.push(H2("Zooming in on one plant"));
kids.push(P([
  "Removing whole plants is dramatic; the fine print is just as clear. The ", b("Snake Plant"),
  " survives all three spots, and its sun and distance ingredients visibly move — so its final score moves too (76.5 → 86.5 → 94.0). Direct proof these inputs feed the maths, not just the wording.",
]));
kids.push(...image("05_subscores.png", 560, "Figure 5. The Snake Plant's sun and distance ingredients (and its final score) change with the inputs, while light stays fixed."));
kids.push(P([
  b("The clearest single example. "), "The ", b("ZZ Plant"), " cannot take direct sun. In spot A (sun present) it is ",
  br("removed"), " — the app's reason: “This spot receives direct sun, which scorches ZZ Plant.” In spot B (no sun, same 3000 lux) it is the ",
  bg("joint #1 pick, score 100"), ". The only thing that changed was the sun input.",
]));

// 6. The distance question
kids.push(H1("6. “But light already changes with distance!” — your question, answered with your data"));
kids.push(P([
  "You raised a sharp point: in your light dataset, the brightness differs a lot between 50 cm, 100 cm and 150 cm from the window — so surely the old label method could tell those spots apart from the light alone? ",
  b("You are right that the light falls off, and your own data proves it: the median reading drops to about 34% of its value (a ~66% fall) from 50 cm to 150 cm."),
]));
kids.push(P([b("But here is the part that matters. "), "The old method does not read the lux number — it only asks “which of three buckets?”, and the buckets are huge (LOW is the whole 1–4,000 lux range). So the real question is whether the drop ", b("jumps the plant from one bucket to another"), "."]));
kids.push(...image("06_falloff.png", 600, "Figure 6. Your real field data. Left: the light drops ~3x but stays in the LOW bucket, so the old method sees no change. Right: a brighter day where the drop crosses buckets, so the old method does react."));
kids.push(P("Across your 65 measured sessions:"));
kids.push(bullet([b("~55% of the time"), " the drop stays inside one bucket (e.g. 2,800 → 1,328 lux, all “LOW”). The old method gives the ", b("identical list"), " for all three distances, even though the real light tripled. Your engine, reading the precise number against each plant's own minimum, resolves it."]));
kids.push(bullet([b("~45% of the time"), " the drop crosses a bucket line (e.g. 12,040 → 5,192 → 3,410 lux). Here the old method ", b("does"), " change its answer — credited honestly."]));
kids.push(P([b("So distance is the weaker half of your argument, because the light reading already carries some of it. "), "The strong, unbreakable half is the sun — which the next section shows."]));

// 7. Part 2
kids.push(H1("7. Part 2 — your engine vs the old “label” method"));
kids.push(P([b("The part the old method can never do: sun. "), "Your light reading is taken in soft, indirect conditions. Whether ", b("direct"), " sun hits the spot depends on the window's direction and the time of day — none of which a single light reading contains. So two spots can read the same light yet differ completely in sun."]));
kids.push(...image("07_sun_same_lux.png", 600, "Figure 7. Two spots both reading 2000 lux. The old method gives both the same 30 plants; your engine keeps 28 for the shaded spot but only 8 for the sunny one."));
kids.push(P([b("The full comparison on real spots. "), "Three groups: (1) same light, different sun; (2) a real light-falloff session that stays in one bucket; (3) a real session whose falloff crosses buckets."]));
kids.push(...image("08_part2.png", 600, "Figure 8. Old method (grey) vs your engine (green) on real spots. The biggest gaps appear where sun differs (Group 1) and where a dim spot can't sustain every “low-light” plant (D3)."));
kids.push(table(
  ["Group", "Spot", "Old method", "Your engine", "Why they differ"],
  [
    ["1 – same lux,\ndifferent sun", "X north, no sun", "30", "28", "sun gate keeps safe plants"],
    ["", "Y west, 3 h sun", "30", "8", "sun gate removes scorch-prone plants"],
    ["2 – real falloff,\nsame bucket", "D1 / D2 / D3 (50/100/150 cm)", "30 / 30 / 30", "30 / 30 / 19", "engine drops plants too thirsty for the dim 150 cm spot"],
    ["3 – falloff\ncrosses buckets", "B1 / B2 / B3", "31 / 30 / 30", "30 / 30 / 30", "here the old method reacts too (honest case)"],
  ],
  [2200, 2560, 1400, 1400, 1800],
));
kids.push(sp());
kids.push(P([b("Reading Group 1: "), "same light (2000 lux), but the old method gives both spots the same 30 plants, while your engine gives 28 to the shaded spot and only 8 to the sunny one — it has quietly removed 20 plants that would burn. That is the single cleanest piece of evidence, and it does not depend on distance at all."]));

// 8. Thesis
kids.push(H1("8. How this connects to your thesis"));
kids.push(P([b("It answers your worry. "), "Proven from the real code: the engine genuinely uses light, distance and sun. You can write the evaluation chapter on solid ground."]));
kids.push(P([b("It defines your variables (Chapter 3). ")]));
kids.push(table(
  ["Independent variables (inputs you change)", "Where it acts in the engine"],
  [
    ["IV1 — Light at the spot (lux)", "survival gate + light ingredient"],
    ["IV2 — Distance to the window (m)", "distance ingredient"],
    ["IV3 — Direct-sun exposure (hours)", "sun gate + sun ingredient"],
    ["IV4 — Window direction (N/E/S/W)", "upstream: feeds the sun number"],
    ["IV5 — Window size (width/sill/top)", "upstream: feeds the sun number"],
  ],
  [4680, 4680],
));
kids.push(sp());
kids.push(P([b("Dependent variable (the output): "), "the recommendation — which plants are recommended, the order they are ranked, each plant's 0–100 score, whether a plant was removed (and why), and how confident the result is."]));
kids.push(P([b("It quietly fixes Objective (ii). "), "Your proposal said you would “compare rule-based vs hybrid techniques,” but no hybrid model was built. This evaluation re-frames Objective (ii) into something you can actually deliver: ", b("“Does measuring the real spot conditions produce more spot-specific recommendations than the fixed-label method used by existing apps?”"), " Part 1 and Part 2 are the answer. State this re-framing openly — examiners respect an honest, justified pivot."]));
kids.push(P([b("It backs your literature review. "), "Chapter 2 (§2.8) already names Green Oasis as a fixed-label system, and §2.9 states the gap: no app combines evidence-based thresholds + measured spot light + sun interpretation + AR distance + explainable scoring. This report is the experimental evidence for that gap."]));

// 9. Limitations
kids.push(H1("9. Honest limitations"));
kids.push(bullet([b("It tests the engine's logic, not real plant survival. "), "It proves the engine responds correctly to its inputs, not that a recommended plant will thrive for months. Your app is framed as a decision aid, so this is consistent."]));
kids.push(bullet([b("The distance and sun values are realistic test inputs. "), "The accuracy of the AR and SPA measurements themselves is a separate question, checked elsewhere against a tape measure and a light meter."]));
kids.push(bullet([b("The old-method stand-in is a fair, simplified model. "), "It represents the category of “fixed light label, no spot measurement,” which the literature says these apps share."]));
kids.push(bullet([b("It shows the methods differ and argues your differences are sensible (safer, more specific). "), "It is not a user study proving people prefer your picks — that would be future work."]));

// 10. Glossary
kids.push(H1("10. Glossary"));
kids.push(table(
  ["Term", "Plain meaning"],
  [
    ["Lux", "A number for how bright the light is, to a human eye. The phone reads it."],
    ["AR distance", "Phone-camera measurement of how far the spot is from the window."],
    ["SPA / sun exposure", "Astronomy maths that estimates hours of potential direct sun at the spot."],
    ["Gate", "A pass/fail filter that removes a plant (too dark, or sun would scorch it)."],
    ["Score", "A 0–100 blend of four ingredients (light 30, sun 25, distance 25, evidence 20)."],
    ["Independent variable", "An input you change in the experiment (light, distance, sun)."],
    ["Dependent variable", "The output you watch (the recommendation)."],
    ["Fixed-label method", "The old way: pick a light label, return all plants for it; ignores distance and sun."],
    ["Photone bands", "The fixed lux ranges (low 1–4,000 / medium 4,000–11,000 / full 11,000–32,000)."],
  ],
  [2600, 6760],
));
kids.push(sp());
kids.push(P([run("Reproduce any number in this report: run ", { italics: true, color: GREY, size: 20 }), run("python tools/eval/export_plants_json.py", { font: "Consolas", size: 19 }), run(" then ", { italics: true, color: GREY, size: 20 }), run("npx jest tools/eval/ivdv_evaluation.test.ts", { font: "Consolas", size: 19 }), run(".", { italics: true, color: GREY, size: 20 })]));

// ---- document --------------------------------------------------------------
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: GREEN, font: "Arial" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, color: INK, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 260 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Lumen Evaluation Report   ·   page ", size: 18, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY })] })] }) },
    children: kids,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT, "(" + Math.round(buf.length / 1024) + " KB)"); });
