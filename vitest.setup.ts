import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import './test/dom-matchers.ts';
import './test/fc.ts';

afterEach(() => cleanup());
