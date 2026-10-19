// The barrel re-exports every component. It is side-effect free ("sideEffects"
// lists CSS only), so bundlers drop what an app does not import. Each component
// also has its own subpath (`@punji/ui/button`) for tools that do not tree-shake.
export { Button, buttonClass } from './button/Button.tsx';
export type { ButtonProps, ButtonVariant } from './button/Button.tsx';
export { SegmentedControl } from './segmented-control/SegmentedControl.tsx';
export type { Option, SegmentedProps } from './segmented-control/SegmentedControl.tsx';
export type { ControlSize } from './internal/types.ts';
