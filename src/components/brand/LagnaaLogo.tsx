import logoUrl from '../../assets/lagnaa-logo.png';

type LagnaaLogoProps = {
  size?: number;
  className?: string;
  animated?: boolean;
};

export function LagnaaLogo({ size = 40, className = '', animated = true }: LagnaaLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Lagnaa One"
      width={size}
      height={size}
      draggable={false}
      className={`block shrink-0 object-contain ${animated ? 'l1-logo-animated' : ''} ${className}`}
    />
  );
}