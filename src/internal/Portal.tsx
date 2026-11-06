import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribe = () => () => {};

/** Renders `children` into document.body. Nothing on the server or while hydrating, so markup always matches. */
export function Portal({ children }: { children: ReactNode }) {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  return client ? createPortal(children, document.body) : null;
}
