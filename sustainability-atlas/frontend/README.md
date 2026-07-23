# Sustainability Atlas — Frontend

Nuxt 3 application with Vue 3, TanStack Query/Table, shadcn-vue patterns, and Tailwind CSS v4.

## Tech Stack

| Category | Library |
|----------|---------|
| Framework | Nuxt 3, Vue 3 (Composition API) |
| Styling | Tailwind CSS 4, tailwind-merge, tw-animate-css |
| UI Components | shadcn-vue pattern + Reka UI (headless primitives) |
| Data Fetching | TanStack Query (Vue Query) |
| Data Tables | TanStack Table (Vue Table) |
| Charts | Unovis (@unovis/ts + @unovis/vue) |
| Maps | Leaflet + @vue-leaflet/vue-leaflet |
| Icons | Lucide Vue Next |
| Toasts | Vue Sonner |
| Utilities | VueUse, clsx, class-variance-authority |

## Setup

```bash
yarn install
npx nuxt prepare
yarn dev
```

App runs at http://localhost:3000

## Project Structure

```
frontend/
├── app.vue                     Root component
├── nuxt.config.ts              Nuxt config (Tailwind, proxy, SSR)
├── assets/css/main.css         Tailwind v4 theme (CSS variables, colors)
├── lib/utils.ts                cn() utility (clsx + tailwind-merge)
│
├── components/
│   ├── ui/                     shadcn-vue primitives (auto-imported, no prefix)
│   │   ├── Button.vue          CVA variants: default/destructive/outline/secondary/ghost/link
│   │   ├── Card.vue            Container card
│   │   ├── CardHeader.vue      Card header section
│   │   ├── CardTitle.vue       Card title text
│   │   ├── CardDescription.vue Card subtitle text
│   │   ├── CardContent.vue     Card body section
│   │   ├── Badge.vue           CVA variants: default/secondary/outline/destructive
│   │   ├── Skeleton.vue        Animated loading placeholder
│   │   └── Input.vue           Styled input with v-model
│   └── layout/
│       └── AppSidebar.vue      Collapsible sidebar with Lucide icons
│
├── layouts/
│   └── default.vue             Sidebar + main content area
│
├── pages/                      File-based routing
│   ├── index.vue               Dashboard
│   ├── projects/index.vue      Projects list
│   ├── credits/index.vue       Credits list
│   ├── methodologies/index.vue Methodologies list
│   ├── organizations/index.vue Organizations list
│   ├── analytics/index.vue     Analytics overview
│   ├── search.vue              Full-text search
│   └── status.vue              Sync status dashboard
│
├── composables/                TanStack Query hooks (add as needed)
├── plugins/
│   └── tanstack-query.ts       TanStack Query setup with SSR hydration
└── types/                      TypeScript interfaces
```

## UI Component Patterns

### shadcn-vue Convention

All UI components in `components/ui/` follow the shadcn-vue pattern:
- Use `cn()` from `~/lib/utils` for class merging
- Use `class-variance-authority` (CVA) for variant props
- Accept a `class` prop for consumer overrides
- Tailwind utility classes only — no scoped CSS

```vue
<!-- Usage example -->
<Card>
    <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Subtitle</CardDescription>
    </CardHeader>
    <CardContent>
        Content here
    </CardContent>
</Card>

<Button variant="outline" size="sm">Click</Button>
<Badge variant="secondary">Label</Badge>
```

### Adding New shadcn-vue Components

To add more shadcn-vue components (Dialog, Table, Popover, etc.):

1. Create the `.vue` file in `components/ui/`
2. Follow the CVA pattern from existing components
3. Use Reka UI for headless behavior where needed
4. Components are auto-imported (no manual registration)

Reference: https://www.shadcn-vue.com/docs/components

### Tailwind v4 Theme

Colors are defined as CSS variables in `assets/css/main.css` using `@theme inline`. The green primary color scheme is designed for sustainability branding.

Key color tokens: `primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `sidebar`, `chart-1` through `chart-5`.

### Layout

The app uses a **sidebar layout**:
- Collapsible sidebar on the left (16rem expanded, 3.5rem collapsed)
- Main content area fills remaining width
- Sidebar state persists via `useState` (shared across pages)

## API Proxy

In development, `/api/v1/**` requests are proxied to the backend at `http://localhost:3030`. Configure in `nuxt.config.ts` under `routeRules`.

## Adding Pages

Nuxt uses file-based routing. To add a new page:

```
pages/
  projects/
    index.vue         → /projects
    [id].vue          → /projects/:id
```

## Adding Composables

TanStack Query composables go in `composables/`:

```typescript
// composables/useProjects.ts
import { useQuery } from '@tanstack/vue-query';

export const useProjects = (filters: Ref<Record<string, any>>) =>
    useQuery({
        queryKey: ['projects', filters],
        queryFn: () => $fetch('/api/v1/projects', { params: filters.value }),
        staleTime: 30_000,
    });
```

Nuxt auto-imports composables — no manual import needed in pages.

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start dev server (port 3000) |
| `yarn build` | Build for production |
| `yarn preview` | Preview production build |
