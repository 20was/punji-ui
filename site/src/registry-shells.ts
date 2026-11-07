// App shell and menu parity pages (web migration wave 2): NotificationBell, InboxList, BottomTabBar, ReorderList,
// Checklist and the locked-state trio. Kept apart from registry.ts so it merges cleanly. Pure data (no JSX).
import type { ApiRef, PageDef } from './registry.ts';

const ui = (module: string, ...names: string[]): ApiRef[] => names.map((name) => ({ name, module }));

export const SHELL_PAGES: readonly PageDef[] = [
  {
    slug: 'notification-bell',
    stability: 'beta',
    title: 'NotificationBell',
    description: 'A bell button with an unread badge capped at 99+. The accessible name carries the real count; no badge while loading or when nothing is unread.',
    lead: 'The bell in a top bar: an unread badge that stops at 99+, and a name that always says the real number.',
    group: 'feedback',
    kind: 'component',
    summary:
      'The button that opens the inbox. The badge shows the count up to 99 and "99+" beyond; the button\'s accessible name (which you pass, count included: "Notifications, 128 unread") carries the real number, so the badge is drawn from CSS and hidden from assistive technology rather than read as a second, different name. No count yet (null) or none unread draws no badge, never a 0. It is a plain button with aria-haspopup="dialog" and aria-expanded: you own the popover or sheet it opens.',
    use: ['The top bar of an app, opening an `InboxList` in a `Popover` (wide) or a full screen (phone).', '`staffOnly` for a feature only staff can see, so they never mistake it for a launched one.'],
    avoid: ['A count that is not unread notifications (use `CountBadge`).', 'A count in the label that differs from the badge: say the real number in `label`.'],
    api: [...ui('notification-bell', 'NotificationBell', 'NotificationBellProps', 'badgeText')],
    examples: [
      { id: 'basic', title: 'Counts', note: 'Loading, none, a few and over 99. The name carries the real number.' },
      { id: 'with-inbox', title: 'Opening an inbox', note: 'The bell is the Popover anchor; aria-expanded follows the state.' },
    ],
    keyboard: ['Enter or Space presses the button; focus stays on it. Esc in the inbox it opens returns focus here.'],
    accessibility: [
      'A button with an accessible name from `label`, `aria-haspopup="dialog"`, `aria-expanded` and (when given) `aria-controls`.',
      'The badge is `aria-hidden` and drawn from a `data-n` attribute, so a screen reader hears the name once, with the true count.',
      'The button is 44px square.',
    ],
    responsive: ['Fixed 44px square; the badge stays inside it. Put it in a flex bar with `flex: none`.'],
    notes: {
      title: 'Migrating from the web kit',
      points: [
        'Props are unchanged (`count`, `label`, `onClick`, `expanded`, `controls`, `staffOnly`, `testId`, `ref`). It renders its own button instead of web\'s `BarButton`, so the bar styling comes from `pu-bell`; `badgeText` is exported from `@punji/ui/notification-bell`.',
        'Classes changed from `kit-bell-n` and `kit-bell-staff` to `pu-bell-n` and `pu-bell-staff`.',
      ],
    },
    related: ['inbox-list', 'popover', 'status-pill', 'bottom-tab-bar'],
  },
  {
    slug: 'inbox-list',
    stability: 'beta',
    title: 'InboxList',
    description: 'A notification list: head with unread count and one action, grouped rows with unread state, a loading skeleton, empty and error states, and a footer.',
    lead: 'The notification centre\'s body: groups of rows with an unread dot, a skeleton while loading, and a state when empty.',
    group: 'feedback',
    kind: 'component',
    summary:
      'InboxList is the frame (head with title, an unread summary and one action such as "Mark all read", an optional filter and note, the body, and an "older" footer). Fill it with `InboxGroup` sections of `InboxRow` rows, an `InboxSkeleton` while loading, or one `InboxState` holding an empty or error message. A row is one tap target: a link when it has an `href`, a button otherwise, with an icon chip, the sentence, kind and time, and an unread weight and dot. An unread row also says "Unread" to screen readers. Text is passed as text and printed as text, never markup.',
    use: ['A notification popover on a wide screen and the whole screen on a phone (`onBack` shows the back button there).', 'Any chronological feed where each item opens one thing.'],
    avoid: ['Rows with several controls (a delete button and a link): an inbox row is one tap target.', 'Putting HTML in titles; escape or send text.'],
    api: [
      ...ui('inbox-list', 'InboxList', 'InboxListProps', 'InboxGroup', 'InboxGroupProps', 'InboxRow', 'InboxRowProps', 'InboxState', 'InboxStateProps', 'InboxSkeleton', 'InboxSkeletonProps'),
    ],
    examples: [
      { id: 'basic', title: 'Groups and rows', note: 'Today and Earlier, an unread dot, a staff-only row and a footer.' },
      { id: 'states', title: 'Loading, empty and error', note: 'The skeleton, and InboxState holding an InlineState.' },
    ],
    keyboard: ['Tab moves through the action, the filter, each row and the footer. Enter or Space opens a row (a link follows its href).'],
    accessibility: [
      'Each group is a section named by its label; its rows are a list. The visible group heading is hidden from assistive technology so the name is read once.',
      'The unread summary (`meta`) is an `aria-live="polite"` region, so "All caught up" is announced after "Mark all read".',
      'Unread is weight, a dot and the words "Unread" for screen readers: never colour alone.',
      'The skeleton is `role="status"` with your `label`; its shapes are hidden.',
    ],
    responsive: ['Fills its container; put it in a Popover with a fixed width on a wide screen and full height on a phone. Long titles wrap anywhere.'],
    notes: {
      title: 'Migrating from the web kit',
      points: [
        'Names and props are unchanged. `InboxRow` takes an optional `linkComponent` and otherwise uses your `LinkProvider`; `InboxSkeleton` takes an optional `testId` (default `inbox-skeleton`).',
        'Classes changed from `kit-inbox*`, `kit-ing*` and `kit-inrow*` to `pu-inbox*`. The `kit-sr` helper is unchanged.',
      ],
    },
    related: ['notification-bell', 'inline-state', 'popover', 'empty-skeleton'],
  },
  {
    slug: 'bottom-tab-bar',
    stability: 'beta',
    title: 'BottomTabBar',
    description: 'The phone bottom navigation: a few link tabs and a More sheet. Router-agnostic, safe-area aware, current page marked with aria-current.',
    lead: 'A phone\'s bottom tabs with a More sheet: any router, safe-area insets, and the current page announced.',
    group: 'layout',
    kind: 'component',
    summary:
      'BottomTabBar renders a `nav` of link tabs plus, when you pass `more`, a "More" button that opens the library Sheet with the rest of your navigation. It never reads the URL: you say which tab is current, so it works with any router through `LinkProvider`. The bar is fixed to the bottom with the device safe-area inset, drawn into the document body, hidden from 1024px up, slides away while scrolling down and steps aside while a text field has focus. Punji\'s own tabs and the More content stay in your app.',
    use: ['The signed-in app on a phone: three or four destinations and a More sheet for the rest.', '`more` as a function to close the sheet after a link inside it is chosen.', '`placement="inline"` for a docs preview or a bar inside a frame.'],
    avoid: ['More than five tabs; move the rest into More.', 'Site navigation on a wide screen: use a sidebar or header; the fixed bar hides itself from 1024px.'],
    api: [...ui('bottom-tab-bar', 'BottomTabBar', 'BottomTabBarProps', 'BottomTab')],
    examples: [
      { id: 'basic', title: 'Tabs and More', note: 'Inline placement for the preview. The More sheet holds a MenuList of links.' },
      { id: 'router', title: 'With a router link', note: 'LinkProvider supplies the router link; `current` comes from the router.' },
    ],
    keyboard: [
      'Tab moves through the tabs and More. Enter follows a tab link; Enter or Space opens More.',
      'In the More sheet focus is trapped; Esc closes it and focus returns to the More button.',
    ],
    accessibility: [
      'A `nav` landmark named by `label`, with a list of links. The current tab has `aria-current="page"`; More has it when `current="more"` and the sheet is closed.',
      'More is `aria-haspopup="dialog"` and `aria-expanded`. The sheet is modal: the page goes inert, scroll locks and focus moves in and back (inert, then scroll lock, then focus scope).',
      'Each tab is at least 56px tall (above the 44px target) with a visible label; icons are decorative.',
      'The bar leaves a keyboard-raising text field alone: it hides while a field has focus so it never covers the field.',
    ],
    responsive: [
      'The fixed bar pads for `env(safe-area-inset-bottom)` and the left and right insets, and is hidden from 1024px up. At 390px each tab shares the width equally and its label is cut with an ellipsis.',
      'Give the page bottom padding equal to the bar\'s height (about 56px plus the inset) so content is not covered.',
    ],
    notes: {
      title: 'Migrating from the web kit',
      points: [
        'Web\'s `AppTabBar` mixes in Punji hosts, routes (`tabRoutes`), cookies and sections. `BottomTabBar` takes the finished list instead: `tabs` (`id`, `label`, `icon`, `href`), `current` and `more`. Compute the current tab in web\'s router layer and pass it; build the More content with `MenuList`/`MenuItemRow` or your own rows.',
        'Web\'s `labels.bar`/`more`/`sheet`/`close` become `label`, `moreLabel`, `moreTitle` and `closeLabel`. The theme toggle, sign out and language switch are rows you put in `more`.',
        'The class `app-tabbar` becomes `pu-tabbar`.',
      ],
    },
    related: ['menu', 'sheet', 'breadcrumb', 'notification-bell'],
  },
  {
    slug: 'reorder-list',
    stability: 'beta',
    title: 'ReorderList',
    description: 'A list in edit mode for putting items in your own order: drag with a handle, keyboard pick-up with arrow keys, or Up and Down buttons, with live announcements.',
    lead: 'Reorder a list by dragging, with the keyboard, or with Up and Down buttons, and hear each move announced.',
    group: 'forms',
    kind: 'component',
    summary:
      'A controlled reorder list: it reports the new order of keys through `onChange` and never saves anything. `mode="drag"` gives each row a handle you can drag with a pointer, or focus, press Space to pick up, move with the arrow keys, and press Space to put down (Esc puts it back). `mode="buttons"` gives each row 44px Up and Down buttons for touch, where a scroll must never move a row by mistake. Every step is spoken through a polite live region. The pure move reuses the watchlist\'s `moveItem`.',
    use: ['A watchlist, a pinned-items list or a column order in an edit mode with Done and Cancel.', '`mode="buttons"` on a phone and `mode="drag"` on a desk.'],
    avoid: ['Sorting by a field (a table sort): reordering is the reader\'s own order.', 'Saving on every move; save on Done.'],
    api: [...ui('reorder-list', 'ReorderList', 'ReorderListProps', 'ReorderItem', 'ReorderLabels', 'REORDER_LABELS', 'moveKey')],
    examples: [
      { id: 'basic', title: 'Drag and keyboard', note: 'Focus a handle, Space to pick up, arrows to move, Space to drop, Esc to cancel.' },
      { id: 'buttons', title: 'Up and Down buttons', note: 'For touch. The first Up and the last Down are disabled.' },
    ],
    keyboard: [
      'On a handle: Space or Enter picks the row up (`aria-pressed`), ArrowUp and ArrowDown move it, Space or Enter drops it, Esc returns it to where it started.',
      'In buttons mode: Tab to Up or Down, Enter or Space moves the row; focus follows the control to the row\'s new place.',
    ],
    accessibility: [
      'A list named by `label`. Each handle is a button named "Move NICA. Space to pick up, arrow keys to move" (replace any word with `labels`).',
      'Picking up, moving, dropping and cancelling are announced through a polite live region ("NICA, moved to position 2 of 9").',
      'Focus stays on the control the reader was using after a move. Leaving a picked-up handle drops it where it is.',
      'Drag is an extra: the keyboard and the buttons do the same job, so nothing needs a pointer.',
    ],
    responsive: ['Rows are at least 44px; at 390px the title never truncates and the sub line is cut with an ellipsis.'],
    notes: {
      title: 'Migrating from the web kit',
      points: [
        'Props are unchanged except `words` is now `labels` (a partial: give only the functions you change; the English defaults are `REORDER_LABELS`), per the library\'s API conventions.',
        '`moveKey` is exported from `@punji/ui/reorder-list` and built on the watchlist\'s `moveItem`. The class prefix is `pu-reorder`, not `kit-ro`.',
      ],
    },
    related: ['watchlist', 'tabs', 'button'],
  },
  {
    slug: 'checklist',
    stability: 'beta',
    title: 'Checklist and ProgressPill',
    description: 'A getting-started guide: a segmented progress line and ordered steps with one action each, plus a ProgressPill to fold it away and bring it back.',
    lead: 'A getting-started guide of real steps with a progress line, and a small ring pill that opens it again.',
    group: 'feedback',
    kind: 'component',
    summary:
      'Checklist shows a progress line (one segment per step, filled by how many are done, with your "1 of 4 done" text) over an ordered list of steps. Each step has an icon, a title, one line and one action, or a quiet check and "Done" once finished (its words muted, never struck through). Put the open steps first. ProgressPill is the same guide folded away: a pill with a ring that opens it again; use one per page. The caller keeps the done state and any dismissal.',
    use: ['A first-run setup guide on an overview page.', 'ProgressPill bottom-right (above the tab bar on a phone) once the guide is dismissed.'],
    avoid: ['A multi-page flow with required order: use `OnboardingWizard`.', 'Steps that do not exist yet: show only what the reader can do.'],
    api: [...ui('checklist', 'Checklist', 'ChecklistProps', 'ChecklistItem', 'ProgressPill', 'ProgressPillProps')],
    examples: [
      { id: 'basic', title: 'Guide and pill', note: 'Mark steps done; the pill reflects the count.' },
    ],
    keyboard: ['Not interactive itself; each action you pass is a normal control. The pill is a button: Enter or Space.'],
    accessibility: [
      'An ordered list named by `label`. The progress text (`progress`) is real text; the segmented bar is decorative.',
      'A finished row says "Done" in words with a check, never only a strike-through or colour.',
      'The pill\'s children are its accessible name ("Setup guide, 1 of 4 done"); the ring is hidden.',
    ],
    responsive: ['Under 480px the action moves under the title so the title keeps its width.'],
    notes: {
      title: 'Migrating from the web kit',
      points: ['Props and names are unchanged. Classes: `kit-clist*` and `kit-ppill*` became `pu-checklist*` and `pu-progress-pill*`; the ring is drawn from `done` and `total` (no `--kit-pp` property to set). Persisting the dismissal (web\'s `useGuideHidden`) stays in the app: use `useLocalStorage`.'],
    },
    related: ['onboarding-wizard', 'step-list', 'notification-bell', 'button'],
  },
  {
    slug: 'locked-cell',
    stability: 'beta',
    uxOnly: true,
    title: 'LockedCell and LockedHead',
    description: 'A table column the account does not include: a lock on the head and a soft bar in each cell, with the lock said in words. Holds no figure.',
    lead: 'A locked column in a data table: a lock on the head, a bar in each cell, and no figure behind it.',
    group: 'data',
    kind: 'component',
    summary:
      '`LockedHead` keeps the column\'s name and adds a lock (and the words "Not included on this account" for screen readers); give the column `sortable: false`. `LockedCell` is a `<td>` with a soft bar and the same words. It takes no value on purpose: the page must not hold the figure at all, so none can sit behind a bar and nothing is hidden by CSS alone. The server must leave the value out. It is the table form of `LockedNote`.',
    use: ['A column of figures the account\'s entitlement does not include (a broker\'s net buy, a forecast), inside `DataTable`.', 'With a `LockedNote` or `LockedPreview` explaining how to get it.'],
    avoid: ['Hiding real data behind a bar or blur: send nothing.', 'An error or loading state: use the table\'s loading rows or an error state.'],
    api: [...ui('locked-cell', 'LockedCell', 'LockedCellProps', 'LockedHead', 'LockedHeadProps')],
    examples: [{ id: 'table', title: 'A locked column', note: 'The Net column is not included: head with a lock, cells with a bar.' }],
    keyboard: ['Not interactive.'],
    accessibility: [
      'The head reads "Net, Not included on this account"; each cell reads "Not included on this account" (the bar is decorative). Replace the words with `label` in the reader\'s language.',
      'Cells keep the column\'s `num` alignment and `wide`/`hideUnder` rules, so the table layout does not shift.',
    ],
    responsive: ['In a stacked row (`DataTable stack`) pass `column` so the column\'s name prints before the bar.'],
    notes: {
      title: 'Migrating from the web kit',
      points: ['Props are unchanged; the classes are `pu-locked-head` and `pu-locked-bar` (were `kit-th-lock`, `kit-locked-bar`). A locked state is a message, not access control: the server must omit the data.'],
    },
    related: ['locked-note', 'locked-preview', 'data-table'],
  },
  {
    slug: 'locked-preview',
    stability: 'beta',
    uxOnly: true,
    title: 'LockedPreview',
    description: 'What a signed-in view looks like, for someone who is not: blurred example shapes, hidden from assistive technology, with a lock, one line and one action.',
    lead: 'A blurred example of a signed-in view with a lock over it, one line on what is behind it and one action.',
    group: 'feedback',
    kind: 'component',
    summary:
      'A card on the inverse surface holds example rows made only of shapes (`LockedRow`, `LockedTile`): bars where a name and a figure would be, so nothing in it can be read as a fact about anyone. The example is blurred, inert and hidden from assistive technology; a lock box over it says what is behind it and offers the one action (sign in). Like `LockedNote` it is a message, not a lock: the real view must not be sent to a reader who cannot see it.',
    use: ['A signed-out page that previews a member view (broker activity, a watchlist, alerts).', 'With the sign-in button as `action`.'],
    avoid: ['Real data under the blur: it is shapes only.', 'A signed-in reader: never show it to them.'],
    api: [...ui('locked-preview', 'LockedPreview', 'LockedPreviewProps', 'LockedRow', 'LockedRowProps', 'LockedTile')],
    examples: [{ id: 'basic', title: 'Rows and tiles', note: 'Example shapes under a lock box with a sign-in action.' }],
    keyboard: ['Only the `action` you pass is focusable; the example is inert, so Tab never enters the blurred shapes.'],
    accessibility: [
      'The title is the card heading (h2); the lock heading is an h3 by default (`lockHeadingLevel`). The example is `aria-hidden` and `inert`.',
      'The lock icon is decorative; the words say what is behind it.',
    ],
    responsive: ['Fills its container. Under 480px the diverging bar in each row is dropped so the name and value keep room.'],
    notes: {
      title: 'Migrating from the web kit',
      points: ['Props are unchanged except `lockHeadingLevel` (new). `className` still accepts the marker a crawler\'s paywall markup selects (`punji-gated`). Classes `kit-lp-*` became `pu-locked-*`.'],
    },
    related: ['locked-note', 'locked-cell', 'card', 'empty-skeleton'],
  },
];
