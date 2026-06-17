/* eslint-env jest */
/** Stub the two native UI libraries so unit tests render without the native
 *  side. Each component just passes its children through a plain View. */

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => React.createElement(View, props, props.children),
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props) => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Path: Stub,
    Circle: Stub,
    Rect: Stub,
    Line: Stub,
    G: Stub,
    Defs: Stub,
    Stop: Stub,
    LinearGradient: Stub,
    RadialGradient: Stub,
    ClipPath: Stub,
    Mask: Stub,
    Ellipse: Stub,
    Polygon: Stub,
    Polyline: Stub,
    Text: Stub,
    TSpan: Stub,
    Use: Stub,
  };
});
