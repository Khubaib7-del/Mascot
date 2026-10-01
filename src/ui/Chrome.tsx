import { Wordmark } from './Logo';

export function Nav({ current, floating = false }: { current: string; floating?: boolean }) {
  return (
    <header className={`nav ${floating ? 'nav-float' : ''}`}>
      <Wordmark />
      <nav aria-label="Primary">
        <a href="#/explore" aria-current={current === 'explore' ? 'page' : undefined}>Collection</a>
        <a href="#/mascot/floe">Playground</a>
        <a href="#/#worlds" className="nav-soft">Worlds</a>
        <a href="#/#library" className="nav-soft">Library</a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div><Wordmark /><p>Living characters for intelligent work.</p></div>
      <p className="fine">Prototype build. Every character, prop and environment is an original procedural design owned by the project — see ASSETS.md for the asset and licence policy.</p>
    </footer>
  );
}
