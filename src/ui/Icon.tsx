/** Vector icon set (react-native-svg) — one consistent line-icon family so the
 *  app reads as a single product instead of mixed emoji. Stroke-based, rounded
 *  caps, sized from a 24×24 grid. Colour defaults to the leaf accent. */

import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { palette } from '../theme/theme';

export type IconName =
  | 'leaf'
  | 'pin'
  | 'window'
  | 'sun'
  | 'compass'
  | 'sparkle'
  | 'check'
  | 'ruler'
  | 'clipboard'
  | 'arrowRight'
  | 'arrowLeft'
  | 'lock'
  | 'close'
  | 'alert'
  | 'phone'
  | 'bulb'
  | 'moon'
  | 'box'
  | 'widthArrows'
  | 'heightArrows'
  | 'sillArrows'
  | 'scan';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export default function Icon({
  name,
  size = 24,
  color = palette.leaf,
  strokeWidth = 1.9,
}: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'leaf' && (
        <>
          <Path d="M4 20C4 11 9 4.5 19 3c0.6 10-4.5 16.5-14 17z" {...common} />
          <Path d="M8.5 16.5C10.5 12.5 13.5 9.5 17 7.5" {...common} />
        </>
      )}

      {name === 'pin' && (
        <>
          <Path
            d="M12 21.5c4.2-4 6.5-7.4 6.5-10.7A6.5 6.5 0 0 0 5.5 10.8c0 3.3 2.3 6.7 6.5 10.7z"
            {...common}
          />
          <Path
            d="M12 8.4c-2 .5-3 2.2-3 4 1.9.4 3.6-.6 4.4-2.4"
            {...common}
            strokeWidth={1.5}
          />
        </>
      )}

      {name === 'window' && (
        <>
          <Rect x="4" y="3.5" width="16" height="17" rx="2" {...common} />
          <Line x1="12" y1="3.5" x2="12" y2="20.5" {...common} />
          <Line x1="4" y1="12" x2="20" y2="12" {...common} />
        </>
      )}

      {name === 'sun' && (
        <>
          <Circle cx="12" cy="12" r="4" {...common} />
          <Line x1="12" y1="2.5" x2="12" y2="5" {...common} />
          <Line x1="12" y1="19" x2="12" y2="21.5" {...common} />
          <Line x1="2.5" y1="12" x2="5" y2="12" {...common} />
          <Line x1="19" y1="12" x2="21.5" y2="12" {...common} />
          <Line x1="5.3" y1="5.3" x2="7" y2="7" {...common} />
          <Line x1="17" y1="17" x2="18.7" y2="18.7" {...common} />
          <Line x1="18.7" y1="5.3" x2="17" y2="7" {...common} />
          <Line x1="7" y1="17" x2="5.3" y2="18.7" {...common} />
        </>
      )}

      {name === 'compass' && (
        <>
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" {...common} />
          <Circle cx="12" cy="12" r="0.9" fill={color} stroke="none" />
        </>
      )}

      {name === 'sparkle' && (
        <>
          <Path
            d="M12 3.5l1.9 5.6L19.5 11l-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z"
            {...common}
          />
          <Path d="M18.5 16.5l.7 2 .7-2 2-.7-2-.7-.7-2-.7 2-2 .7z" {...common} strokeWidth={1.4} />
        </>
      )}

      {name === 'check' && <Path d="M5 12.5l4.2 4.2L19 7" {...common} strokeWidth={2.4} />}

      {name === 'ruler' && (
        <>
          <Rect
            x="2.7"
            y="8.2"
            width="18.6"
            height="7.6"
            rx="1.4"
            transform="rotate(45 12 12)"
            {...common}
          />
          <Line x1="9.2" y1="6.8" x2="10.6" y2="8.2" {...common} strokeWidth={1.4} />
          <Line x1="12" y1="9.6" x2="13.4" y2="11" {...common} strokeWidth={1.4} />
          <Line x1="14.8" y1="12.4" x2="16.2" y2="13.8" {...common} strokeWidth={1.4} />
        </>
      )}

      {name === 'clipboard' && (
        <>
          <Path
            d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H16"
            {...common}
          />
          <Rect x="8" y="3" width="8" height="3.6" rx="1.2" {...common} />
          <Line x1="8.5" y1="11" x2="15.5" y2="11" {...common} strokeWidth={1.5} />
          <Line x1="8.5" y1="14.5" x2="13" y2="14.5" {...common} strokeWidth={1.5} />
        </>
      )}

      {name === 'arrowRight' && (
        <>
          <Line x1="4.5" y1="12" x2="19" y2="12" {...common} strokeWidth={2.2} />
          <Path d="M13 6l6 6-6 6" {...common} strokeWidth={2.2} />
        </>
      )}

      {name === 'arrowLeft' && (
        <>
          <Line x1="19.5" y1="12" x2="5" y2="12" {...common} strokeWidth={2.2} />
          <Path d="M11 6l-6 6 6 6" {...common} strokeWidth={2.2} />
        </>
      )}

      {name === 'lock' && (
        <>
          <Rect x="5.5" y="10.5" width="13" height="9.5" rx="2" {...common} />
          <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...common} />
        </>
      )}

      {name === 'close' && (
        <Path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5" {...common} strokeWidth={2.1} />
      )}

      {name === 'alert' && (
        <>
          <Path d="M12 4.5 L21 19 H3 Z" {...common} />
          <Line x1="12" y1="10" x2="12" y2="13.5" {...common} strokeWidth={2} />
          <Circle cx="12" cy="16.4" r="0.5" fill={color} stroke={color} />
        </>
      )}

      {name === 'phone' && (
        <>
          <Rect x="7" y="2" width="10" height="20" rx="2" {...common} />
          <Circle cx="12" cy="4.4" r="0.6" fill={color} stroke="none" />
          <Line x1="10" y1="19.2" x2="14" y2="19.2" {...common} strokeWidth={1.4} />
        </>
      )}

      {name === 'bulb' && (
        <>
          <Circle cx="12" cy="10" r="5" {...common} />
          <Line x1="9.8" y1="15.2" x2="14.2" y2="15.2" {...common} strokeWidth={1.5} />
          <Line x1="10.3" y1="17.3" x2="13.7" y2="17.3" {...common} strokeWidth={1.5} />
          <Line x1="12" y1="2" x2="12" y2="3.6" {...common} strokeWidth={1.5} />
          <Line x1="5.5" y1="4.3" x2="6.7" y2="5.5" {...common} strokeWidth={1.5} />
          <Line x1="18.5" y1="4.3" x2="17.3" y2="5.5" {...common} strokeWidth={1.5} />
        </>
      )}

      {name === 'moon' && (
        <Path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          {...common}
        />
      )}

      {name === 'box' && (
        <>
          <Rect x="4" y="9" width="16" height="11" rx="1.5" {...common} />
          <Path d="M4 9 L12 4 L20 9" {...common} />
          <Line x1="12" y1="9" x2="12" y2="20" {...common} strokeWidth={1.4} />
        </>
      )}

      {/* width: two upright edge posts with a horizontal span arrow between */}
      {name === 'widthArrows' && (
        <>
          <Line x1="4" y1="6.5" x2="4" y2="17.5" {...common} strokeWidth={1.5} />
          <Line x1="20" y1="6.5" x2="20" y2="17.5" {...common} strokeWidth={1.5} />
          <Line x1="6.5" y1="12" x2="17.5" y2="12" {...common} />
          <Path d="M9 9 L6.5 12 L9 15" {...common} />
          <Path d="M15 9 L17.5 12 L15 15" {...common} />
        </>
      )}

      {/* height: two horizontal end bars with a vertical span arrow between */}
      {name === 'heightArrows' && (
        <>
          <Line x1="6.5" y1="4" x2="17.5" y2="4" {...common} strokeWidth={1.5} />
          <Line x1="6.5" y1="20" x2="17.5" y2="20" {...common} strokeWidth={1.5} />
          <Line x1="12" y1="6.5" x2="12" y2="17.5" {...common} />
          <Path d="M9 9 L12 6.5 L15 9" {...common} />
          <Path d="M9 15 L12 17.5 L15 15" {...common} />
        </>
      )}

      {/* sill: an arrow rising from the floor line up to the sill ledge */}
      {name === 'sillArrows' && (
        <>
          <Line x1="3" y1="20.5" x2="21" y2="20.5" {...common} />
          <Line x1="7" y1="5.5" x2="17" y2="5.5" {...common} strokeWidth={1.5} />
          <Line x1="12" y1="18.5" x2="12" y2="7.5" {...common} />
          <Path d="M9 10.5 L12 7.5 L15 10.5" {...common} />
        </>
      )}

      {/* scan: AR viewfinder corners with a centre point */}
      {name === 'scan' && (
        <>
          <Path d="M4 9 V6 A2 2 0 0 1 6 4 H9" {...common} />
          <Path d="M20 9 V6 A2 2 0 0 0 18 4 H15" {...common} />
          <Path d="M4 15 V18 A2 2 0 0 0 6 20 H9" {...common} />
          <Path d="M20 15 V18 A2 2 0 0 1 18 20 H15" {...common} />
          <Circle cx="12" cy="12" r="1.3" fill={color} stroke="none" />
        </>
      )}
    </Svg>
  );
}
