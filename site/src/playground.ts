// Which component pages have a props playground, and how. The controls come from the generated API data (the prop's
// type decides boolean, select, number or text); this file only says which props to expose, their starting values,
// and the few facts the type cannot give (a prop typed with an alias that is not on the page, a controlled prop's
// handler). To add a component: add an entry keyed by the page slug. The component's chunk loads only when the
// playground is opened.

export interface PlaygroundControl {
  /** Forces the control kind; by default the prop's API type decides. */
  kind?: 'boolean' | 'text' | 'number' | 'select';
  /** The choices of a select, when the type is an alias the page does not document. */
  options?: readonly (string | number)[];
  /** The starting value. */
  initial?: string | number | boolean;
}

export interface PlaygroundDef {
  /** The component's export name; its API entry on the page gives the prop types. */
  component: string;
  /** Loads the component's module (a dynamic import, so it is its own chunk). */
  load: () => Promise<Record<string, unknown>>;
  /** The props to expose, in order. `true` takes everything from the API type. */
  props: Record<string, PlaygroundControl | true>;
  /** Starting text of the children; leave out for a component without children. */
  children?: string;
  /** Controlled props: prop name -> the handler prop that reports the next value (the playground keeps the state). */
  bind?: Record<string, string>;
}

export const PLAYGROUNDS: Record<string, PlaygroundDef> = {
  button: {
    component: 'Button',
    load: () => import('@punji/ui/button'),
    children: 'Buy SBL',
    props: { variant: { initial: 'primary' }, size: { options: ['sm', 'md', 'lg'], initial: 'md' }, block: true, loading: true },
  },
  switch: {
    component: 'Switch',
    load: () => import('@punji/ui/switch'),
    props: { checked: { initial: true }, label: { kind: 'text', initial: 'Price alerts' }, disabled: true, busy: true },
    bind: { checked: 'onChange' },
  },
  checkbox: {
    component: 'Checkbox',
    load: () => import('@punji/ui/checkbox'),
    children: 'I accept the terms',
    props: { checked: { initial: false }, disabled: true },
    bind: { checked: 'onChange' },
  },
  'status-pill': {
    component: 'StatusPill',
    load: () => import('@punji/ui/status-pill'),
    children: 'Open',
    props: { tone: { initial: 'gain' }, dot: { initial: true }, size: true },
  },
  'status-tag': {
    component: 'StatusTag',
    load: () => import('@punji/ui/status-tag'),
    children: 'KYC verified',
    props: { tone: true },
  },
  avatar: {
    component: 'Avatar',
    load: () => import('@punji/ui/avatar'),
    props: { name: { kind: 'text', initial: 'Sita Sharma' }, size: { options: ['sm', 'md', 'lg'], initial: 'md' }, tone: true, loading: true },
  },
  figure: {
    component: 'Figure',
    load: () => import('@punji/ui/figures'),
    props: { value: { kind: 'number', initial: 1234567.5 }, kind: { options: ['rs', 'int', 'pct', 'num'], initial: 'rs' }, dp: { kind: 'number', initial: 2 } },
  },
  'status-banner': {
    component: 'StatusBanner',
    load: () => import('@punji/ui/status-banner'),
    children: 'Orders placed after 3 pm settle on the next trading day.',
    props: { tone: { options: ['info', 'warn', 'danger'], initial: 'info' }, title: { kind: 'text', initial: 'Market closes at 3 pm' }, dismissible: true },
  },
  card: {
    component: 'Card',
    load: () => import('@punji/ui/card'),
    children: 'Net worth Rs 12,34,567',
    props: {
      title: { kind: 'text', initial: 'Portfolio' },
      description: { kind: 'text', initial: 'As of 14 Nov close' },
      headingLevel: { options: [2, 3], initial: 3 },
      rule: true,
      flush: true,
    },
  },
  chip: {
    component: 'Chip',
    load: () => import('@punji/ui/controls'),
    children: 'Banks',
    props: { selected: { initial: true }, size: { options: ['md', 'sm'], initial: 'md' }, disabled: true },
  },
};
