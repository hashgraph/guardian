/**
 * Guided product tour — step data.
 *
 * Pure data. No Vue imports: this file is consumed by the composable (and,
 * potentially, by tests) without pulling in a component runtime. All copy lives
 * in i18n under `tour.steps.<id>.title` / `tour.steps.<id>.body`, so adding a
 * step means adding an entry here plus the two keys in en.json and es.json.
 */

export type TourAudience = 'all' | 'auth' | 'guest' | 'admin';

export interface TourStep {
    /** Stable id. Also the i18n key suffix: `tour.steps.<id>.title` / `.body`. */
    id: string;
    /**
     * CSS selector(s) for the highlighted element. `null` renders a centred card
     * with no spotlight. An array highlights the union bounding box of every
     * element that resolves.
     */
    target: string | string[] | null;
    /**
     * Path this step must be viewed on. Omit for steps whose target is app
     * chrome (sidebar / topbar), which is present on every route.
     */
    route?: string;
    /** Preferred popover side relative to the spotlight. Auto-flips if it doesn't fit. */
    placement?: 'top' | 'bottom' | 'left' | 'right';
    /** Who sees this step. Default 'all'. */
    audience?: TourAudience;
    /** Extra px of breathing room around the spotlight. Default 8. */
    padding?: number;
    /**
     * Optional runtime feature this step depends on. The step is dropped when
     * the feature is switched off, so the tour never spotlights a control that
     * is not on screen. Resolved in useProductTour(), which has config access.
     */
    feature?: 'feedback';
}

/**
 * Order: orientation -> global tools -> the flagship data page -> personal
 * features -> where to get help. `account` and `signIn` are mutually exclusive,
 * so a signed-in user sees 12 steps and a guest sees 10.
 */
export const TOUR_STEPS: TourStep[] = [
    { id: 'welcome',        target: null,                                    route: '/',         placement: 'bottom' },
    { id: 'nav',            target: '[data-tour="sidebar-nav"]',                                 placement: 'right'  },
    { id: 'search',         target: '[data-tour="global-search"]',                               placement: 'bottom' },
    { id: 'preferences',    target: ['[data-tour="language-selector"]',
                                     '[data-tour="network-selector"]'],                          placement: 'bottom' },
    { id: 'dashboardStats', target: '[data-tour="dashboard-stats"]',         route: '/',         placement: 'bottom' },
    { id: 'filters',        target: '[data-tour="filter-bar"]',              route: '/projects', placement: 'bottom' },
    { id: 'table',          target: '[data-tour="projects-table"]',          route: '/projects', placement: 'top'    },
    { id: 'savedFilters',   target: '[data-tour="projects-quick-filters"]',  route: '/projects', placement: 'bottom' },
    { id: 'portfolio',      target: '[data-tour="nav-portfolio"]',                               placement: 'right',  audience: 'auth'  },
    { id: 'notifications',  target: '[data-tour="notification-bell"]',                           placement: 'bottom', audience: 'auth'  },
    { id: 'account',        target: '[data-tour="auth-menu"]',                                   placement: 'bottom', audience: 'auth'  },
    { id: 'signIn',         target: '[data-tour="auth-menu"]',                                   placement: 'bottom', audience: 'guest' },
    { id: 'feedback',       target: '[data-tour="feedback-button"]',                             placement: 'top',    feature: 'feedback' },
    { id: 'help',           target: '[data-tour="tour-restart"]',                                placement: 'bottom' },
];
