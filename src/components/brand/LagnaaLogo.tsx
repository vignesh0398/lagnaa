import logoUrl from '../../assets/lagnaa-logo.png';
import { BRAND_NAME } from '../../constants/brand';

type LagnaaLogoProps = {
  size?: number;
  className?: string;
  animated?: boolean;
  /** Login/hero: transparent logo, no box, soft glow on dark backgrounds */
  blend?: boolean;
};

export function LagnaaLogo({
  size = 40,
  className = '',
  animated = true,
  blend = false,
}: LagnaaLogoProps) {
  return (
    <img
      src={logoUrl}
      alt={BRAND_NAME}
      width={size}
      height={size}
      draggable={false}
      className={[
        'block shrink-0 object-contain',
        blend ? 'l1-logo-blend' : 'rounded-xl',
        animated ? 'l1-logo-animated' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}