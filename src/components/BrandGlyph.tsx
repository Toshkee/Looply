import Svg, { Path } from 'react-native-svg';

import type { BrandIcon } from '@/domain/brands';

/** A single-color brand logo drawn from bundled SVG path data. */
export function BrandGlyph({ brand, size, color }: { brand: BrandIcon; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} pointerEvents="none">
      <Path d={brand.path} fill={color} />
    </Svg>
  );
}
