import { createContext } from 'react';

import type { LinkComponent } from './link.tsx';

/** The nearest LinkProvider's link component (src/link/Link.tsx). */
export const LinkContext = createContext<LinkComponent | undefined>(undefined);
