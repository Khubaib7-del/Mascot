export function Nav({ current }: { current: string }) {
  return (
    <header className="nav">
      <a className="wordmark" href="#/" aria-label="Mascot — home">Mascot<span aria-hidden>.</span></a>
      <nav aria-label="Primary">
        <a href="#/explore" aria-current={current === 'explore' ? 'page' : undefined}>Collection</a>
        <a href="#/mascot/moss">Playground</a>
        <a href="#/#library" className="nav-soft">Library</a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <span className="wordmark">Mascot<span aria-hidden>.</span></span>
        <p>Interactive 3D characters with real surfaces.</p>
      </div>
      <p className="fine">Prototype build. All characters are original procedural designs owned by the project — see RESEARCH.md for asset and licence policy.</p>
    </footer>
  );
}
