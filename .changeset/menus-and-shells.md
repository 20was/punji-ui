---
'@punji/ui': minor
---

Menu and app-shell parity for the web migration (all beta, backward compatible). `@punji/ui/menu` gains `MenuHead`, item `hint`, `next`, `busy` and `lang`, controlled `open`/`defaultOpen`/`onOpenChange`, a standalone `MenuList` with `MenuItemRow` and `MenuSeparator`, and `phone="sheet"` (plus the `RowMenu` shorthand) so a row menu opens as the bottom Sheet under 768px. New modules: `NotificationBell` and `InboxList` (`@punji/ui/notification-bell`, `@punji/ui/inbox-list`), `BottomTabBar` (`@punji/ui/bottom-tab-bar`), `ReorderList` (`@punji/ui/reorder-list`), `Checklist` and `ProgressPill` (`@punji/ui/checklist`), and `LockedCell`, `LockedHead` and `LockedPreview` (`@punji/ui/locked-cell`, `@punji/ui/locked-preview`). The menu module now bundles the Sheet, so `@punji/ui/menu` and `@punji/ui/breadcrumb` are about 2.5 kB gzip larger.
