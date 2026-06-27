import logoUrl from '../../assets/lagnaa-logo.png';
import { BRAND_NAME } from '../../constants/brand';

type LagnaaLogoProps = {
  size?: number;
  className?: string;
  animated?: boolean;
};

export function LagnaaLogo({ size = 40, className = '', animated = true }: LagnaaLogoProps) {
  return (
    <img
      src={logoUrl}
      alt={BRAND_NAME}
      width={size}
      height={size}
      draggable={false}
      className={`block shrink-0 rounded-2xl object-contain ${animated ? 'l1-logo-animated' : ''} ${className}`}
    />
  );
}