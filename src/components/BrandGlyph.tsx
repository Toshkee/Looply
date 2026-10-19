import Svg, { Path } from 'react-native-svg';

import type { BrandIcon } from '@/domain/brands';

/** A single-color brand logo drawn from bundled SVG path data. */
export function BrandGlyph({ glyph, size, color }: { glyph: NonNullable<BrandIcon['glyph']>; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={glyph.viewBox} accessible={false} pointerEvents="none">
      <Path d={glyph.path} fill={color} />
    </Svg>
  );
}
