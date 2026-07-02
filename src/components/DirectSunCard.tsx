/** Prominent, spot-specific direct-sun readout. Surfaces the SPA aperture
 *  estimate (hours + local-time windows) and, when the full window geometry is
 *  known, draws a TRUE side-view (elevation) of the sun ray entering the window
 *  and reaching the plant — the same geometry `estimateDirectSunThroughAperture`
 *  tests (sill/head heights, distance, elevation α, penetration band). The ray
 *  sweeps across the window over the interval the spot is actually lit. Stays
 *  honest: a potential, unobstructed-sky estimate; measured lux remains the
 *  arbiter, and the side view shows only the vertical (penetration) test — the
 *  horizontal azimuth-cone test is a separate, plan-view check. An expandable
 *  "How is this calculated?" panel explains the SPA pipeline in plain language. */

import React, { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { APERTURE_PARAMS, signedAngularDiffDeg } from '../sun/solar';
import { palette } from '../theme/theme';
import CardHeader from '../ui/CardHeader';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Geometry for the diagrams (metres + the representative rays/bearings). */
export type ApertureDiagram = {
  /** Window opening width, m (sets the top-view azimuth cone). */
  widthM: number;
  /** Sill height above the floor (bottom of glass), m. */
  sillM: number;
  /** Head height above the floor (top of glass), m. */
  topM: number;
  /** Horizontal plant-to-window distance, m. */
  distanceM: number;
  /** Signed lateral plant offset from window centre, m (+ = right looking out). */
  lateralOffsetM: number;
  /** Assumed plant-top height above the floor, m. */
  plantTopM: number;
  /** Window outward-facing bearing, degrees true. */
  windowAzimuthDeg: number;
  /** Duration of the longest lit interval, minutes (scales the top-view sweep). */
  intervalMinutes: number;
  /** Representative sun elevation for the interval (its midpoint), degrees. */
  elevationDeg: number;
  /** Sun elevation at the start of the longest lit interval, degrees. */
  elevationStartDeg: number;
  /** Sun elevation at the end of the longest lit interval, degrees. */
  elevationEndDeg: number;
  /** Sun bearing at the start of the longest lit interval, degrees true. */
  sunAzStartDeg: number;
  /** Sun bearing at the end of the longest lit interval, degrees true. */
  sunAzEndDeg: number;
  /** "13:05–14:00" — the interval these rays represent. */
  peakLabel: string;
  /** No direct sun reaches the spot: the span is the whole daylight window and the
   *  views must never highlight the plant (the sun is drawn missing the opening). */
  noSun?: boolean;
};

type ViewMode = 'side' | 'top';

type Props = {
  hours: number;
  /** Pre-formatted "09:05–11:30" windows. */
  intervalLabels: string[];
  /** True = aperture model (this spot); false = orientation-only (whole window). */
  perSpot: boolean;
  /** Full side-view geometry; present only for spot-specific estimates with sun. */
  diagram?: ApertureDiagram | null;
  /** The light reading was captured at night — show the night view, hide the
   *  interactive sun diagrams (the hours stay valid as POTENTIAL daytime sun). */
  capturedAtNight?: boolean;
};

const VBW = 300;
const VBH = 196;
const PAD = 16;
const RAD = Math.PI / 180;
/** One there-and-back sun sweep across the interval, ms. */
const SWEEP_MS = 6000;

const clampDeg = (d: number) => Math.max(2, Math.min(88, d));

export default function DirectSunCard({
  hours,
  intervalLabels,
  perSpot,
  diagram,
  capturedAtNight = false,
}: Props) {
  const none = hours <= 0;
  const [view, setView] = useState<ViewMode>('side');

  // With no direct sun, the Top (azimuth) view is the one that explains why —
  // default to it so the user lands on the informative picture.
  useEffect(() => {
    if (diagram?.noSun) setView('top');
  }, [diagram?.noSun]);

  const betaDeg =
    diagram != null
      ? Math.round(
          (Math.atan(diagram.widthM / 2 / Math.max(0.4, diagram.distanceM)) *
            180) /
            Math.PI +
            APERTURE_PARAMS.azMarginDeg,
        )
      : 0;

  return (
    <View style={styles.card}>
      <CardHeader
        icon="sun"
        title={perSpot ? 'Direct sun at this spot' : 'Direct sun (this window)'}
        kicker="potential sun · clear-sky estimate"
      />

      {capturedAtNight ? (
        <>
          <NightView />
          <View style={styles.row}>
            <Text style={styles.hours}>{hours.toFixed(1)}</Text>
            <Text style={styles.hoursUnit}>h potential direct sun</Text>
          </View>
          <View style={styles.pills}>
            {intervalLabels.map((label) => (
              <View key={label} style={styles.pill}>
                <Text style={styles.pillText}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.nightNote}>
            Captured at night — this is the spot’s potential daytime direct sun.
            Re-measure the light during the day for an accurate reading.
          </Text>
        </>
      ) : (
        <>
          {diagram != null && (
            <View style={styles.seg}>
              <Pressable
                onPress={() => setView('side')}
                style={[styles.segBtn, view === 'side' && styles.segBtnOn]}
              >
                <Text
                  style={[styles.segTxt, view === 'side' && styles.segTxtOn]}
                >
                  Side · elevation
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setView('top')}
                style={[styles.segBtn, view === 'top' && styles.segBtnOn]}
              >
                <Text style={[styles.segTxt, view === 'top' && styles.segTxtOn]}>
                  Top · azimuth
                </Text>
              </Pressable>
            </View>
          )}

          {diagram != null ? (
            view === 'side' ? (
              <SideView geom={diagram} />
            ) : (
              <TopView geom={diagram} />
            )
          ) : none ? null : (
            <SchematicView />
          )}

          {none && (
            <Text style={styles.noneText}>
              No direct sun is expected to reach this{' '}
              {perSpot ? 'spot' : 'window'} today
              {diagram != null
                ? ' — the sun’s path above stays outside the window’s opening'
                : ''}
              . It relies on indirect light.
            </Text>
          )}

          <View style={styles.row}>
            <Text style={styles.hours}>{hours.toFixed(1)}</Text>
            <Text style={styles.hoursUnit}>h potential direct sun</Text>
          </View>

          {intervalLabels.length > 0 && (
            <View style={styles.pills}>
              {intervalLabels.map((label) => (
                <View key={label} style={styles.pill}>
                  <Text style={styles.pillText}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {diagram != null && view === 'side' && (
            <Text style={styles.legend}>
              {diagram.noSun
                ? 'Side view: the sun does climb the sky today, but it never lines up with the window opening (see the Top view), so the beam never reaches the plant.'
                : `Side view at ${diagram.peakLabel}: the sun rises from ${Math.round(
                    diagram.elevationStartDeg,
                  )}° to ${Math.round(
                    diagram.elevationEndDeg,
                  )}° above the horizon, clears the ${diagram.sillM.toFixed(
                    2,
                  )} m sill, and reaches the plant ${diagram.distanceM.toFixed(
                    1,
                  )} m inside the room.`}
            </Text>
          )}
          {diagram != null && view === 'top' && (
            <Text style={styles.legend}>
              {diagram.noSun
                ? 'Top view: the travelling dot is the sun’s path across today. It never enters the window’s opening cone for this spot, so no direct sun lands here.'
                : `Top view at ${diagram.peakLabel}: from above, the sun reaches your spot only while it shines in through the window opening — a cone of about ±${betaDeg}° (${diagram.widthM.toFixed(
                    2,
                  )} m wide, ${diagram.distanceM.toFixed(
                    1,
                  )} m away). A narrower window lights the spot for less of the day.`}
            </Text>
          )}
        </>
      )}

      <HowItWorks perSpot={perSpot} />

      <Text style={styles.caveat}>
        {perSpot
          ? 'Worked out from your AR-measured window for this exact spot. The Side and Top views are just the up-down and left-right halves of the same check — and the plant choice still comes from the measured light, not this estimate.'
          : "Worked out from the window's compass facing. Measure the window size for a spot-specific Side and Top view."}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Quantitative side-view: window + plant + sun ray + penetration band */
/* The ray sweeps the sun's elevation across the lit interval.         */
/* ------------------------------------------------------------------ */

function SideView({ geom }: { geom: ApertureDiagram }) {
  const { sillM, topM, distanceM, plantTopM } = geom;

  // --- world geometry (metres; x = into the room, y = up from the floor) ---
  const d = Math.max(0.4, distanceM);
  const aStart = clampDeg(geom.elevationStartDeg);
  const aEnd = clampDeg(geom.elevationEndDeg);
  const aMax = Math.max(aStart, aEnd, clampDeg(geom.elevationDeg));

  // Sun sits outside, up-and-left, on the window-head ray. Its horizontal
  // offset is FIXED so the frame never zooms; only its height (and the ray
  // angle) move as α sweeps.
  const sunBack = Math.min(1.1, Math.max(0.6, d * 0.5));
  const sunX = -sunBack;
  const sunYMax = topM + sunBack * Math.tan(aMax * RAD);

  const xMin = sunX - 0.15;
  const xMax = d + 0.5;
  const yMax = Math.max(topM, sunYMax, plantTopM) + 0.3;

  // --- world -> pixel, computed ONCE from the widest extent (equal scale on
  //     both axes, so the drawn α equals the real solar elevation) ---
  const worldW = xMax - xMin;
  const availW = VBW - 2 * PAD;
  const availH = VBH - 2 * PAD;
  const scale = Math.min(availW / worldW, availH / yMax);
  const offX = PAD + (availW - worldW * scale) / 2;
  const offY = PAD + (availH - yMax * scale) / 2;
  const X = (wx: number) => offX + (wx - xMin) * scale;
  const Y = (wy: number) => VBH - offY - wy * scale;

  const floorY = Y(0);
  const wallX = X(0);
  const headY = Y(topM);
  const sillY = Y(sillM);
  const plantX = X(d);
  const plantTopY = Y(plantTopM);
  const plantH = floorY - plantTopY;
  const potW = Math.min(30, Math.max(15, scale * 0.22));
  const potTopY = floorY - plantH * 0.42;
  const dimY = (floorY + VBH) / 2;

  // --- animate: sweep α from the interval's start elevation to its end ---
  const [t, setT] = useState(0);
  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    let start = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      if (now - last >= 32) {
        last = now;
        setT(now - start);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const p = (1 - Math.cos((2 * Math.PI * t) / SWEEP_MS)) / 2; // 0 → 1 → 0
  const alpha = clampDeg(aStart + (aEnd - aStart) * p);
  const tanA = Math.tan(alpha * RAD);
  const pulse = (Math.sin((2 * Math.PI * t) / 2600) + 1) / 2;

  // Sill / head rays: height drops by d·tanα over horizontal distance.
  const rayY = (h: number, x: number) => Y(h - x * tanA);
  const band = [
    `${X(xMin)},${rayY(topM, xMin)}`,
    `${X(xMax)},${rayY(topM, xMax)}`,
    `${X(xMax)},${rayY(sillM, xMax)}`,
    `${X(xMin)},${rayY(sillM, xMin)}`,
  ].join(' ');

  // Where the beam band overlaps the plant's [0, plantTop] extent → the "hit".
  const bandLow = sillM - d * tanA;
  const bandHigh = topM - d * tanA;
  const hitLow = Math.max(0, bandLow);
  const hitHigh = Math.min(plantTopM, bandHigh);
  // No direct sun reaches the spot today → never paint a "hit" glow (the side
  // view ignores azimuth, so a vertical overlap here would be misleading).
  const hasHit = !geom.noSun && hitHigh > hitLow;

  const sunPx = X(sunX);
  const sunPy = Y(topM + sunBack * tanA);

  // α wedge at the window head (between horizontal and the ray toward the sun).
  const wedgeR = Math.min(30, Math.max(16, scale * 0.5));
  const wedgePts: string[] = [`${wallX},${headY}`];
  for (let i = 0; i <= 10; i++) {
    const phi = Math.PI - alpha * RAD * (i / 10);
    wedgePts.push(
      `${wallX + wedgeR * Math.cos(phi)},${headY - wedgeR * Math.sin(phi)}`,
    );
  }

  return (
    <View style={styles.diagramWrap}>
      <Svg width={VBW} height={VBH} viewBox={`0 0 ${VBW} ${VBH}`}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#16314A" stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.surface} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.amber} stopOpacity={0.42} />
            <Stop offset="1" stopColor={palette.amber} stopOpacity={0.1} />
          </LinearGradient>
          <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7FB9D6" stopOpacity={0.42} />
            <Stop offset="1" stopColor="#7FB9D6" stopOpacity={0.16} />
          </LinearGradient>
        </Defs>

        {/* sky behind, then the sunlight slab through the opening */}
        <Rect x={0} y={0} width={VBW} height={floorY} fill="url(#sky)" />
        <Polygon points={band} fill="url(#beam)" />
        <Line
          x1={X(xMin)}
          y1={rayY(topM, xMin)}
          x2={X(xMax)}
          y2={rayY(topM, xMax)}
          stroke={palette.amber}
          strokeWidth={1.5}
          strokeOpacity={0.85}
        />
        <Line
          x1={X(xMin)}
          y1={rayY(sillM, xMin)}
          x2={X(xMax)}
          y2={rayY(sillM, xMax)}
          stroke={palette.amber}
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeDasharray="4 4"
        />

        {/* earth strip masks the slab below the floor; floor line on top */}
        <Rect x={0} y={floorY} width={VBW} height={VBH - floorY} fill={palette.inset} />
        <Line x1={0} y1={floorY} x2={VBW} y2={floorY} stroke={palette.hairline} strokeWidth={1.5} />

        {/* wall + window: solid wall below the sill and above the head, glass between */}
        <Rect x={wallX - 4} y={floorY} width={8} height={sillY - floorY} fill={palette.raised} />
        <Rect x={wallX - 4} y={PAD * 0.4} width={8} height={headY - PAD * 0.4} fill={palette.raised} />
        <Rect x={wallX - 4} y={headY} width={8} height={sillY - headY} fill="url(#glass)" />
        <Rect
          x={wallX - 4}
          y={headY}
          width={8}
          height={sillY - headY}
          fill="none"
          stroke={palette.mint}
          strokeWidth={1.2}
          strokeOpacity={0.8}
        />

        {/* α wedge between horizontal and the incoming ray */}
        <Polygon points={wedgePts.join(' ')} fill={palette.amber} fillOpacity={0.18} />
        <Polyline
          points={wedgePts.slice(1).join(' ')}
          fill="none"
          stroke={palette.amber}
          strokeWidth={1.2}
        />

        {/* distance dimension in the earth strip */}
        <Line x1={wallX} y1={floorY + 6} x2={wallX} y2={dimY + 2} stroke={palette.textFaint} strokeWidth={1} />
        <Line x1={plantX} y1={floorY + 6} x2={plantX} y2={dimY + 2} stroke={palette.textFaint} strokeWidth={1} />
        <Line x1={wallX} y1={dimY} x2={plantX} y2={dimY} stroke={palette.textDim} strokeWidth={1} />

        {/* plant: pot + foliage, lit where the band overlaps it */}
        <Path
          d={`M${plantX - potW / 2 + 2},${potTopY} L${plantX + potW / 2 - 2},${potTopY} L${plantX + potW / 2 - 4},${floorY} L${plantX - potW / 2 + 4},${floorY} Z`}
          fill="#9A6A45"
        />
        <Ellipse cx={plantX} cy={potTopY - plantH * 0.16} rx={potW * 0.62} ry={plantH * 0.2} fill={palette.leaf} />
        <Ellipse cx={plantX - potW * 0.42} cy={potTopY - plantH * 0.06} rx={potW * 0.4} ry={plantH * 0.16} fill="#3E9C64" />
        <Ellipse cx={plantX + potW * 0.42} cy={potTopY - plantH * 0.06} rx={potW * 0.4} ry={plantH * 0.16} fill="#3E9C64" />
        <Ellipse cx={plantX} cy={plantTopY + plantH * 0.06} rx={potW * 0.46} ry={plantH * 0.18} fill={palette.mint} fillOpacity={0.92} />
        {hasHit && (
          <Ellipse
            cx={plantX}
            cy={Y((hitLow + hitHigh) / 2)}
            rx={potW * 0.7}
            ry={Math.max(6, ((hitHigh - hitLow) * scale) / 2 + 6)}
            fill={palette.amber}
            fillOpacity={0.22 + pulse * 0.16}
          />
        )}

        {/* sun glow + disc + rays (glow breathes via pulse) */}
        <Circle cx={sunPx} cy={sunPy} r={13 + pulse * 4} fill={palette.amber} fillOpacity={0.18} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <Line
              key={i}
              x1={sunPx + Math.cos(a) * 10}
              y1={sunPy + Math.sin(a) * 10}
              x2={sunPx + Math.cos(a) * 15}
              y2={sunPy + Math.sin(a) * 15}
              stroke={palette.amber}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          );
        })}
        <Circle cx={sunPx} cy={sunPy} r={8} fill="#FFD86B" />

        {/* labels — α° rendered last so it always sits above the animated sun */}
        <SvgText x={wallX + 9} y={headY + 1} fill={palette.textDim} fontSize={8.5}>
          head {topM.toFixed(1)} m
        </SvgText>
        <SvgText x={wallX + 9} y={sillY + 9} fill={palette.textDim} fontSize={8.5}>
          sill {sillM.toFixed(1)} m
        </SvgText>
        <SvgText x={(wallX + plantX) / 2} y={dimY - 3} fill={palette.textDim} fontSize={8.5} textAnchor="middle">
          d = {d.toFixed(1)} m
        </SvgText>
        <SvgText x={VBW - 6} y={14} fill={palette.amber} fontSize={9} fontWeight="700" textAnchor="end">
          α = {Math.round(alpha)}°
        </SvgText>
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Plan (top) view: the azimuth gate — sun bearing vs window opening.  */
/* The sun sweeps its bearing; it only "counts" inside the cone.       */
/* ------------------------------------------------------------------ */

function TopView({ geom }: { geom: ApertureDiagram }) {
  const d = Math.max(0.4, geom.distanceM);
  const W = Math.max(0.1, geom.widthM);
  const x = geom.lateralOffsetM ?? 0;
  // Window edges as SIGNED bearing deviations from the normal, seen from the
  // (possibly off-centre) plant — same geometry as estimateDirectSunThroughAperture.
  const rightEdgeDeg = (Math.atan((W / 2 - x) / d) * 180) / Math.PI; // literal opening
  const leftEdgeDeg = (Math.atan((-W / 2 - x) / d) * 180) / Math.PI;
  const rightBetaDeg = rightEdgeDeg + APERTURE_PARAMS.azMarginDeg; // gated cone
  const leftBetaDeg = leftEdgeDeg - APERTURE_PARAMS.azMarginDeg;
  const betaDeg = rightBetaDeg - leftBetaDeg; // total gated span (for the label)
  const rightEdge = rightEdgeDeg * RAD;
  const leftEdge = leftEdgeDeg * RAD;
  const rightBeta = rightBetaDeg * RAD;
  const leftBeta = leftBetaDeg * RAD;

  // Real sun-bearing deviations at the interval edges, plus a FIXED time
  // lead-in/out. Driving the sweep by clock time (not a padded azimuth range)
  // makes both the sweep and the bright span scale with the true duration:
  // a shorter interval shows a shorter bright sweep, and the bright span is the
  // ACTUAL interval (all gates), not just the azimuth cone.
  const devS = signedAngularDiffDeg(geom.sunAzStartDeg, geom.windowAzimuthDeg);
  const devE = signedAngularDiffDeg(geom.sunAzEndDeg, geom.windowAzimuthDeg);
  const durMin = Math.max(1, geom.intervalMinutes);
  const MARGIN_MIN = 25;
  const totalMin = durMin + 2 * MARGIN_MIN;
  const ratePerMin = (devE - devS) / durMin; // sun bearing speed, °/min
  // bearing deviation at a given minute into the swept window (clamped for draw)
  const devAt = (tm: number) =>
    Math.max(-88, Math.min(88, devS + (tm - MARGIN_MIN) * ratePerMin));

  // pixel layout: plant apex at the bottom, outside (sun) above the window
  const P = { x: VBW / 2, y: 172 };
  const dPix = 80;
  const winY = P.y - dPix;
  // Opening edges projected onto the wall — asymmetric when the plant is off-centre.
  const xL = P.x + dPix * Math.tan(leftEdge);
  const xR = P.x + dPix * Math.tan(rightEdge);
  const Rcone = 150;
  const Rsun = 138;

  // gated azimuth cone (the sector that counts as direct sun), left edge → right edge
  const sect: string[] = [`${P.x},${P.y}`];
  for (let i = 0; i <= 12; i++) {
    const a = leftBeta + ((rightBeta - leftBeta) * i) / 12;
    sect.push(`${P.x + Rcone * Math.sin(a)},${P.y - Rcone * Math.cos(a)}`);
  }

  // faint guide arc the sun travels along (whole swept window)
  const pathPts: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = devAt((totalMin * i) / 20) * RAD;
    pathPts.push(`${P.x + Rsun * Math.sin(a)},${P.y - Rsun * Math.cos(a)}`);
  }

  const PERIOD = 5200;
  const [t, setT] = useState(0);
  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    let start = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      if (now - last >= 32) {
        last = now;
        setT(now - start);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const phase = (((t % PERIOD) + PERIOD) % PERIOD) / PERIOD; // 0 → 1, sawtooth
  const tm = phase * totalMin; // minutes into the swept window
  const theta = devAt(tm) * RAD;
  // bright ONLY during the real interval (bounded by every gate, not just azimuth);
  // never when no direct sun reaches the spot (the dot just traces the day's path)
  const lit = !geom.noSun && tm >= MARGIN_MIN && tm <= MARGIN_MIN + durMin;
  const fade = Math.min(1, Math.min(phase, 1 - phase) / 0.06); // soften wrap
  const pulse = (Math.sin((2 * Math.PI * t) / 2400) + 1) / 2;

  const sunX = P.x + Rsun * Math.sin(theta);
  const sunY = P.y - Rsun * Math.cos(theta);
  const crossX = P.x + dPix * Math.tan(theta);

  const labelX = P.x + 0.72 * Rcone * Math.sin(rightBeta);
  const labelY = P.y - 0.72 * Rcone * Math.cos(rightBeta);

  return (
    <View style={styles.diagramWrap}>
      <Svg width={VBW} height={VBH} viewBox={`0 0 ${VBW} ${VBH}`}>
        {/* outside (sky) tint above the wall */}
        <Rect x={0} y={0} width={VBW} height={winY} fill="#16314A" fillOpacity={0.16} />

        {/* gated azimuth cone */}
        <Polygon points={sect.join(' ')} fill={palette.amber} fillOpacity={0.13} />
        {/* literal opening edges (geometric, dashed) */}
        <Line x1={P.x} y1={P.y} x2={P.x + Rcone * Math.sin(leftEdge)} y2={P.y - Rcone * Math.cos(leftEdge)} stroke={palette.amber} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="4 4" />
        <Line x1={P.x} y1={P.y} x2={P.x + Rcone * Math.sin(rightEdge)} y2={P.y - Rcone * Math.cos(rightEdge)} stroke={palette.amber} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="4 4" />

        {/* window facing (normal) */}
        <Line x1={P.x} y1={P.y} x2={P.x} y2={winY - 22} stroke={palette.textFaint} strokeWidth={1} strokeDasharray="3 4" />

        {/* wall with the window opening cut out (opening shifts when off-centre) */}
        <Line x1={0} y1={winY} x2={xL} y2={winY} stroke={palette.raised} strokeWidth={6} />
        <Line x1={xR} y1={winY} x2={VBW} y2={winY} stroke={palette.raised} strokeWidth={6} />
        <Line x1={xL} y1={winY} x2={xR} y2={winY} stroke={palette.mint} strokeWidth={3} strokeLinecap="round" />

        {/* sun travel guide + active ray */}
        <Polyline points={pathPts.join(' ')} fill="none" stroke={palette.hairline} strokeWidth={1.5} strokeDasharray="2 5" />
        <Line
          x1={P.x}
          y1={P.y}
          x2={sunX}
          y2={sunY}
          stroke={palette.amber}
          strokeWidth={lit ? 2.4 : 1}
          strokeOpacity={(lit ? 0.9 : 0.22) * fade}
          strokeDasharray={lit ? undefined : '3 5'}
        />
        {lit && (
          <Circle cx={crossX} cy={winY} r={4.5 + pulse * 2} fill={palette.amber} fillOpacity={0.55 * fade} />
        )}

        {/* plant (apex) */}
        <Circle cx={P.x} cy={P.y} r={10} fill="none" stroke={palette.leaf} strokeOpacity={0.4} />
        <Circle cx={P.x} cy={P.y} r={6} fill={palette.leaf} />

        {/* sun (bright inside the cone, dim outside) */}
        <Circle cx={sunX} cy={sunY} r={11 + pulse * 3} fill={palette.amber} fillOpacity={(lit ? 0.22 : 0.08) * fade} />
        <Circle cx={sunX} cy={sunY} r={7} fill={lit ? '#FFD86B' : palette.textFaint} fillOpacity={fade} />

        {/* labels */}
        <SvgText x={P.x} y={P.y + 16} fill={palette.textDim} fontSize={8.5} textAnchor="middle">
          plant
        </SvgText>
        <SvgText x={xR + 5} y={winY - 5} fill={palette.textDim} fontSize={8.5}>
          window
        </SvgText>
        <SvgText x={labelX} y={labelY} fill={palette.amber} fontSize={9} fontWeight="700" textAnchor="middle">
          {Math.round(betaDeg)}°
        </SvgText>
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------ */
/* Illustrative fallback when the window size was not captured  */
/* ------------------------------------------------------------ */

function SchematicView() {
  return (
    <View style={styles.diagramWrap}>
      <Svg width={VBW} height={120} viewBox={`0 0 ${VBW} 120`}>
        <Defs>
          <LinearGradient id="beam2" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.amber} stopOpacity={0.35} />
            <Stop offset="1" stopColor={palette.amber} stopOpacity={0.06} />
          </LinearGradient>
        </Defs>
        {/* soft beam from an off-screen sun through a generic window */}
        <Polygon points="60,30 92,30 220,104 150,104" fill="url(#beam2)" />
        <Line x1={0} y1={104} x2={VBW} y2={104} stroke={palette.hairline} strokeWidth={1.5} />
        {/* generic window */}
        <Rect x={56} y={30} width={9} height={56} fill={palette.raised} />
        <Rect x={56} y={30} width={9} height={56} fill="none" stroke={palette.mint} strokeOpacity={0.7} strokeWidth={1.2} />
        {/* sun */}
        <Circle cx={32} cy={26} r={9} fill="#FFD86B" />
        {/* generic plant */}
        <Path d="M196,104 L214,104 L211,86 L199,86 Z" fill="#9A6A45" />
        <Ellipse cx={205} cy={80} rx={15} ry={9} fill={palette.leaf} />
        <Ellipse cx={205} cy={74} rx={10} ry={7} fill={palette.mint} fillOpacity={0.9} />
      </Svg>
      <Text style={styles.schematicTag}>illustration · facing-only estimate</Text>
    </View>
  );
}

/* ------------------------------------------------------------ */
/* Night view: shown when the light was captured after dark.    */
/* A calm moon + stars (the sun diagrams make no sense at night) */
/* ------------------------------------------------------------ */

function NightView() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return undefined;
    let raf = 0;
    let start = 0;
    let last = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      if (now - last >= 60) {
        last = now;
        setT(now - start);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const twinkle = (Math.sin((2 * Math.PI * t) / 2600) + 1) / 2;
  const stars = [
    { x: 60, y: 34, r: 1.6, ph: 0 },
    { x: 110, y: 22, r: 1.1, ph: 0.5 },
    { x: 168, y: 40, r: 1.8, ph: 0.2 },
    { x: 232, y: 26, r: 1.2, ph: 0.7 },
    { x: 268, y: 52, r: 1.5, ph: 0.35 },
    { x: 92, y: 64, r: 1.0, ph: 0.85 },
    { x: 210, y: 70, r: 1.3, ph: 0.15 },
  ];

  return (
    <View style={styles.diagramWrap}>
      <Svg width={VBW} height={120} viewBox={`0 0 ${VBW} 120`}>
        <Defs>
          <LinearGradient id="night" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#16314A" stopOpacity={0.55} />
            <Stop offset="1" stopColor={palette.surface} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={VBW} height={120} fill="url(#night)" />

        {stars.map((s, i) => (
          <Circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={palette.mint}
            fillOpacity={0.35 + 0.6 * ((twinkle + s.ph) % 1)}
          />
        ))}

        {/* crescent moon: a bright disc with an offset surface-coloured disc */}
        <Circle cx={150} cy={58} r={26} fill="#FFE9A8" fillOpacity={0.18 + twinkle * 0.12} />
        <Circle cx={150} cy={58} r={18} fill="#E9EFC9" />
        <Circle cx={141} cy={53} r={16} fill={palette.surface} />
      </Svg>
      <Text style={styles.schematicTag}>night-time · sun path hidden</Text>
    </View>
  );
}

/* ----------------------------------------------------- */
/* Expandable plain-language explanation of the pipeline  */
/* ----------------------------------------------------- */

type Step = { h: string; p: string };

const PERSPOT_STEPS: Step[] = [
  {
    h: 'Find the sun',
    p: "From your location and today's date, we work out the sun's compass direction and height in the sky for any moment — using the standard solar-position equations (accurate to about 0.01°).",
  },
  {
    h: 'Check the whole day',
    p: 'We do that every 5 minutes from dawn to dusk, and keep only the moments when the sun is at least 3° above the horizon.',
  },
  {
    h: 'Is the sun in front of the window? (Top view)',
    p: "The sun has to be shining roughly toward the window to come through it. We allow for how wide the window is and how far back your plant sits — that's the cone in the Top view.",
  },
  {
    h: 'Does the light reach the plant? (Side view)',
    p: 'Even when the sun faces the window, the beam dips as it crosses the room. We check it still lands on the plant rather than the floor in front of it — that\'s the Side view.',
  },
  {
    h: 'Add up the sunny spells',
    p: 'Runs of passing checks become time windows like 13:05–14:00, and adding them up gives the hours shown above.',
  },
];

const FACING_STEPS: Step[] = [
  PERSPOT_STEPS[0],
  PERSPOT_STEPS[1],
  {
    h: 'Is the sun in front of the window?',
    p: "The sun has to be within about ±85° of the way the window faces, and at least 3° above the horizon.",
  },
  {
    h: 'Add up the sunny spells',
    p: 'Runs of passing checks become time windows like 09:05–11:30, and their total is the hours shown. Capture the window size for a spot-specific side view.',
  },
];

const FOOT =
  'It assumes a clear sky with nothing outside blocking the sun, so the real figure can only be lower — that is why it is labelled potential.';

function HowItWorks({ perSpot }: { perSpot: boolean }) {
  const [open, setOpen] = useState(false);
  const steps = perSpot ? PERSPOT_STEPS : FACING_STEPS;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={styles.how}>
      <Pressable onPress={toggle} style={styles.howHeader} hitSlop={8}>
        <Text style={styles.howTitle}>How is this calculated?</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path
              d="M4 6 L8 10 L12 6"
              stroke={palette.textDim}
              strokeWidth={1.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </Pressable>

      {open && (
        <View style={styles.howBody}>
          {steps.map((s, i) => (
            <View key={s.h} style={styles.step}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <View style={styles.stepText}>
                <Text style={styles.stepH}>{s.h}</Text>
                <Text style={styles.stepP}>{s.p}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.howFoot}>{FOOT}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 22,
  },
  diagramWrap: {
    width: VBW,
    alignSelf: 'center',
    marginBottom: 8,
  },
  seg: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: palette.inset,
    borderRadius: 999,
    padding: 3,
    marginBottom: 12,
    gap: 3,
  },
  segBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  segBtnOn: {
    backgroundColor: palette.raised,
  },
  segTxt: {
    color: palette.textFaint,
    fontSize: 12.5,
    fontWeight: '800',
  },
  segTxtOn: {
    color: palette.mint,
  },
  schematicTag: {
    color: palette.textFaint,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  hours: {
    color: palette.amber,
    fontSize: 44,
    fontWeight: '900',
  },
  hoursUnit: {
    color: palette.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    backgroundColor: palette.raised,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillText: {
    color: palette.mint,
    fontSize: 14,
    fontWeight: '800',
  },
  legend: {
    color: palette.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  noneText: {
    color: palette.textDim,
    fontSize: 14,
    lineHeight: 21,
  },
  nightNote: {
    color: palette.amber,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 12,
  },
  how: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: 12,
  },
  howHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  howTitle: {
    color: palette.mint,
    fontSize: 14,
    fontWeight: '800',
  },
  howBody: {
    marginTop: 12,
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    gap: 10,
  },
  stepNum: {
    color: palette.bg,
    backgroundColor: palette.leaf,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
  },
  stepH: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  stepP: {
    color: palette.textDim,
    fontSize: 12.5,
    lineHeight: 18,
  },
  howFoot: {
    color: palette.textFaint,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  caveat: {
    color: palette.textFaint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
});
