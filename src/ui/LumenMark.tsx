/** Lumen brand mark — a leaf catching light, drawn entirely in SVG (no bitmap
 *  assets, so it scales crisply and stays reproducible for the FYP write-up).
 *  The name "Lumen" nods to the app's core idea: a real light measurement, not
 *  a static label — so the mark pairs a light source with the leaf it reaches.
 *  One `size` prop covers both the small top-bar mark and the large welcome hero. */

import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { palette } from '../theme/theme';

export default function LumenMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <SvgLinearGradient id="lumenLeaf" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9DEBBE" />
          <Stop offset="1" stopColor="#3E9E63" />
        </SvgLinearGradient>
      </Defs>

      {/* light source — a small sun in the upper-left, rays reaching the leaf */}
      <Circle cx="11" cy="11" r="4.2" fill={palette.mint} />
      <G stroke={palette.mint} strokeWidth={1.8} strokeLinecap="round">
        <Line x1="11" y1="2.5" x2="11" y2="5" />
        <Line x1="2.5" y1="11" x2="5" y2="11" />
        <Line x1="4.6" y1="4.6" x2="6.4" y2="6.4" />
        <Line x1="17.4" y1="4.6" x2="15.6" y2="6.4" />
        <Line x1="4.6" y1="17.4" x2="6.4" y2="15.6" />
      </G>

      {/* leaf catching the light */}
      <Path d="M32 12 C 32 26 24 34 10 34 C 10 20 18 12 32 12 Z" fill="url(#lumenLeaf)" />
      <Path
        d="M14 30 C 19 24 25 18 30 15"
        stroke="#1F5538"
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        opacity={0.5}
      />
    </Svg>
  );
}
