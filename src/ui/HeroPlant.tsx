/** Signature welcome illustration — a potted plant drawn entirely in SVG
 *  (gradient leaves, terracotta pot). No bitmap assets: scales crisply and is
 *  fully reproducible for the FYP write-up. */

import React from 'react';
import Svg, {
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const LEAF = 'M0 0 C -15 -9 -15 -36 0 -49 C 15 -36 15 -9 0 0 Z';

export default function HeroPlant({ size = 220 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <SvgLinearGradient id="leafA" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9DEBBE" />
          <Stop offset="1" stopColor="#3E9E63" />
        </SvgLinearGradient>
        <SvgLinearGradient id="leafB" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6FD89A" />
          <Stop offset="1" stopColor="#2C7A4A" />
        </SvgLinearGradient>
        <SvgLinearGradient id="pot" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D08A60" />
          <Stop offset="1" stopColor="#A05C38" />
        </SvgLinearGradient>
      </Defs>

      {/* foliage — a fan of leaves rising from the pot */}
      <G translateX={100} translateY={138}>
        <G rotation={-42} translateY={-6}>
          <Path d={LEAF} fill="url(#leafB)" />
        </G>
        <G rotation={-20} translateY={-2}>
          <Path d={LEAF} fill="url(#leafA)" />
        </G>
        <G rotation={0}>
          <Path d={LEAF} fill="url(#leafB)" />
        </G>
        <G rotation={20} translateY={-2}>
          <Path d={LEAF} fill="url(#leafA)" />
        </G>
        <G rotation={42} translateY={-6}>
          <Path d={LEAF} fill="url(#leafB)" />
        </G>
        {/* central vein highlights */}
        <Path d="M0 -4 L0 -44" stroke="#1F5538" strokeWidth={1.4} opacity={0.5} />
      </G>

      {/* pot */}
      <Rect x="58" y="138" width="84" height="12" rx="3" fill="url(#pot)" />
      <Path d="M64 152 L136 152 L128 192 L72 192 Z" fill="url(#pot)" />
      <Path
        d="M64 152 L136 152 L134 162 L66 162 Z"
        fill="#000"
        opacity={0.12}
      />
    </Svg>
  );
}
