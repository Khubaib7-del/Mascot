import { useState } from 'react';
import { MascotCard } from '../MascotCard';
import { FAMILIES, MASCOTS } from '../../mascot/registry';

export function Explore() {
  const [family, setFamily] = useState<string | null>(null);
  const list = MASCOTS.filter((m) => !family || m.family === family);
  return (
    <main id="main" className="page">
      <header className="section-head">
        <p className="eyebrow">The collection</p>
        <h1 className="display">Characters, not skins.</h1>
        <p className="lede narrow">Every mascot has its own body, coat, face and temperament. Open one to dress it, give it a job, and move it through the worlds.</p>
      </header>
      <div className="filters" role="group" aria-label="Filter by family">
        <button className="chip" aria-pressed={family === null} onClick={() => setFamily(null)}>All</button>
        {FAMILIES.map((f) => <button key={f} className="chip" aria-pressed={family === f} onClick={() => setFamily(f)}>{f}</button>)}
      </div>
      <div className="grid">{list.map((m) => <MascotCard key={m.id} def={m} index={MASCOTS.indexOf(m) + 1} />)}</div>
      <aside className="coming">
        <p className="eyebrow">Next</p>
        <p>Creator submissions, premium packs and downloadable GLB/VRM files are on the roadmap. Nothing here is for sale yet.</p>
      </aside>
    </main>
  );
}
