import markSvg from '../../public/brand/mascot-mark-mono.svg?raw';

/** The platform mark. Inline so it inherits colour and can animate; the same geometry ships as favicon.svg. */
export function Logo({ size = 28, animated = false, className = '' }: { size?: number; animated?: boolean; className?: string }) {
  return <span className={`logo ${animated ? 'logo-anim' : ''} ${className}`} style={{ width: size, height: size }} aria-hidden dangerouslySetInnerHTML={{ __html: markSvg }} />;
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <a className={`wordmark ${light ? 'wm-light' : ''}`} href="#/" aria-label="Mascot — home">
      <Logo size={26} /><span>Mascot</span>
    </a>
  );
}
