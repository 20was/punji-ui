import { Component, createElement, Suspense, type ReactNode } from 'react';
import { useLateView } from './load.ts';

function Resolved({ id }: { id: string }) {
  return createElement(useLateView(id));
}

class Failed extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? (
      <p className="doc-p" role="status">
        This part did not load. Reload the page to try again.
      </p>
    ) : (
      this.props.children
    );
  }
}

/**
 * A part of a page whose code is not needed for the first load (see "Late" in load.ts). The prerendered HTML has it;
 * in the browser React hydrates it when its chunk has arrived and leaves the server HTML as it is until then.
 */
export function Late({ id }: { id: string }) {
  return (
    <Failed>
      <Suspense fallback={null}>
        <Resolved id={id} />
      </Suspense>
    </Failed>
  );
}
