---
'@punji/ui': minor
---

One internal overlay layer under Sheet, Drawer and CommandPalette: a ref-counted scroll lock (stacked overlays restore the page exactly, with scrollbar compensation), `inert` on the rest of the page while a modal is open (nested modals keep the outer one inert), and a focus scope that traps Tab, starts on the safest control and restores focus. Sheet now renders in a portal on document.body, locks scrolling and makes the page inert; Drawer's Tab wrap no longer misses position:fixed controls. New `@punji/ui/dialog` entry with `Dialog` and `AlertDialog` (role dialog / alertdialog, named by the title, described by the body; the alert starts on Cancel, Esc is Cancel and the scrim does nothing).
