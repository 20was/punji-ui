---
'@punji/ui': patch
---

Overlay accessibility: Sheet and CommandPalette use unique ids (several can be open), Sheet traps Tab across every tabbable control (textarea, tabindex, summary, contenteditable) and starts on the safest control, never a danger button (mark one with `data-autofocus` to choose). Toasts pause on hover and focus, an action toast stays at least 10 s, and they sit in one live region so each is announced once. InfoTip and Tooltip bubbles can be hovered, Esc closes them from anywhere, and a scroll only closes them once the trigger leaves the window.
