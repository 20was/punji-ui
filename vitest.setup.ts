import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import './test/fc.ts';

afterEach(() => cleanup());
