/**
 * Guardian brand theme for the Scalar API reference.
 *
 * Hand-maintained: colors mirror the Guardian design tokens in
 * `frontend/src/variables.scss`, and the Hedera "H" mark (Guardian's brand logo
 * and favicon) is inlined as a base64 PNG data URI (sourced from
 * `frontend/src/assets/images/logo.png`) so the backend services need no
 * static-asset hosting. This file is duplicated verbatim in each gateway
 * service — keep the copies in sync when editing.
 */

// Hedera "H" mark (white H on a black circle) — Guardian's brand logo, reused
// as both the sidebar badge and the browser tab favicon.
const HEDERA_LOGO =
    'data:image/png;base64,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';

// Guardian brand mark, used as the browser tab favicon.
export const scalarFavicon = HEDERA_LOGO;

export const scalarCustomCss = `
/* ---- Light theme (Guardian design tokens) ---- */
.light-mode {
  --scalar-color-1: #23252E;
  --scalar-color-2: #495057;
  --scalar-color-3: #848FA9;
  --scalar-color-accent: #4169E2;
  --scalar-background-1: #FFFFFF;
  --scalar-background-2: #F9FAFC;
  --scalar-background-3: #EFF3F7;
  --scalar-background-accent: rgba(65, 105, 226, 0.12);
  --scalar-border-color: #E1E7EF;
  --scalar-button-1: #4169E2;
  --scalar-button-1-color: #FFFFFF;
  --scalar-button-1-hover: #476FF1;
  --scalar-color-green: #19BE47;
  --scalar-color-red: #FF432A;
  --scalar-color-yellow: #DA9B22;
  --scalar-color-blue: #4169E2;
  --scalar-color-purple: #9C27B0;
}
.light-mode .t-doc__sidebar {
  --scalar-sidebar-background-1: #F4F7FE;
  --scalar-sidebar-color-1: #23252E;
  --scalar-sidebar-color-2: #3A4A73;
  --scalar-sidebar-color-active: #4169E2;
  --scalar-sidebar-item-hover-background: #F0F3FC;
  --scalar-sidebar-item-hover-color: #23252E;
  --scalar-sidebar-item-active-background: rgba(65, 105, 226, 0.12);
  --scalar-sidebar-border-color: #E1E7EF;
  --scalar-sidebar-search-background: #FFFFFF;
  --scalar-sidebar-search-border-color: #E1E7EF;
  --scalar-sidebar-search-color: #848FA9;
}

/* ---- Dark theme (Guardian design tokens) ---- */
.dark-mode {
  --scalar-color-1: #E6EAF2;
  --scalar-color-2: #AAB4C5;
  --scalar-color-3: #6E748B;
  --scalar-color-accent: #5A7AF5;
  --scalar-background-1: #171B24;
  --scalar-background-2: #10131A;
  --scalar-background-3: #202735;
  --scalar-background-accent: rgba(90, 122, 245, 0.15);
  --scalar-border-color: #303746;
  --scalar-button-1: #4169E2;
  --scalar-button-1-color: #FFFFFF;
  --scalar-button-1-hover: #5A7AF5;
  --scalar-color-green: #8AFAAA;
  --scalar-color-red: #FF7A6B;
  --scalar-color-yellow: #FFC90D;
  --scalar-color-blue: #5A7AF5;
  --scalar-color-purple: #C58AF9;
}
.dark-mode .t-doc__sidebar {
  --scalar-sidebar-background-1: #10131A;
  --scalar-sidebar-color-1: #E6EAF2;
  --scalar-sidebar-color-2: #AAB4C5;
  --scalar-sidebar-color-active: #FFFFFF;
  --scalar-sidebar-item-hover-background: #202735;
  --scalar-sidebar-item-hover-color: #E6EAF2;
  --scalar-sidebar-item-active-background: rgba(90, 122, 245, 0.18);
  --scalar-sidebar-border-color: #303746;
  --scalar-sidebar-search-background: #171B24;
  --scalar-sidebar-search-border-color: #303746;
  --scalar-sidebar-search-color: #6E748B;
}

/* ---- Guardian logo badge at the top of the sidebar ----
   Scalar exposes no logo config field, so the mark is injected via CSS.
   The .t-doc__sidebar selector targets Scalar's internal sidebar class
   (stable across the pinned 1.2.x range); re-verify on major upgrades. */
.t-doc__sidebar {
  position: relative;
}
.t-doc__sidebar::before {
  content: '';
  display: block;
  width: 40px;
  height: 40px;
  margin: 20px 18px 10px;
  background-image: url("${HEDERA_LOGO}");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
`;
