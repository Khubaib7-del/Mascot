import { Component, type ReactNode } from 'react';
import { useRoute } from './router';
import { Home } from '../ui/pages/Home';
import { Explore } from '../ui/pages/Explore';
import { Playground } from '../ui/playground/Playground';
import { getMascot } from '../mascot/registry';
import { Nav, Footer } from '../ui/Chrome';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page notfound" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display">This page failed to load.</h1>
        <p className="lede">{this.state.error.message}</p>
        <a className="btn" href="#/">Back to start</a>
      </main>
    );
  }
}

export function App() {
  const route = useRoute();
  const [first, id] = route.path;

  if (first === 'mascot') {
    const def = id ? getMascot(id) : undefined;
    return (
      <Boundary key={`pg-${id}`}>
        {def ? <Playground key={def.id} def={def} route={route} /> : <NotFound />}
      </Boundary>
    );
  }
  const home = first === undefined;
  return (
    <Boundary key={first ?? 'home'}>
      <a className="skip" href="#main">Skip to content</a>
      <Nav current={first ?? ''} floating={home} />
      {first === 'explore' ? <Explore /> : home ? <Home /> : <NotFound />}
      {!home && <Footer />}
    </Boundary>
  );
}

function NotFound() {
  return (
    <main id="main" className="page notfound">
      <p className="eyebrow">404</p>
      <h1 className="display">We couldn’t find that character.</h1>
      <a className="btn" href="#/explore">Explore the collection</a>
    </main>
  );
}
