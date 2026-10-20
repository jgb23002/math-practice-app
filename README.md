# Math Practice App

A browser-based math practice application for children ages 7–12, built with React,
TypeScript, and Vite. Requirements and the development checklist are in
[`docs/Specification.md`](docs/Specification.md) and [`docs/TODO.md`](docs/TODO.md).

## Current scope

Phases 1 and 2 establish the development tools, shared domain types, responsive
application layout, home page, and client-side routing. Practice, statistics, and
settings pages currently show friendly placeholders. Practice logic and
persistence are planned for later phases.

## Setup

Use a Node.js version supported by the `engines` field in `package.json`.
The setup has been verified with Node.js 24.14.1 and npm 11.11.0.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Use Ctrl+C to stop the development server.

## Verification

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Other commands:

- `npm run lint:fix`: fix automatically resolvable lint issues.
- `npm run format`: format source and configuration files.
- `npm run test:watch`: rerun tests as files change.
- `npm run preview`: serve the production build after `npm run build`.

ESLint checks JavaScript, TypeScript, React hooks, and Fast Refresh exports.
Prettier handles formatting; the supplied assignment documents retain their
original formatting. Vitest shares the Vite configuration and uses jsdom for
React Testing Library tests. DOM matchers and cleanup are configured in
`src/test/setup.ts`.

## Source structure

```text
src/
├── app/                    # Application shell, routes, and navigation tests
├── components/
│   ├── common/
│   ├── layout/
│   ├── practice/
│   └── statistics/
├── hooks/                  # Page-title updates
├── pages/                  # Home, feature placeholders, and fallback page
├── services/
├── test/                   # Shared test setup
├── types/                  # Questions, sessions, mistakes, statistics, settings
├── utils/
├── index.css
└── main.tsx
```

Empty feature folders contain `.gitkeep` placeholders. Arithmetic generation,
session state, settings controls, and statistics calculations are not implemented
yet.

## Routes and navigation

React Router's `BrowserRouter` wraps the application in `src/main.tsx`.
`src/app/AppRoutes.tsx` defines the following routes:

| Route               | Page                                      |
| ------------------- | ----------------------------------------- |
| `/`                 | Home                                      |
| `/practice/setup`   | Practice setup placeholder                |
| `/practice/session` | Practice session placeholder              |
| `/practice/summary` | Session summary placeholder               |
| `/statistics`       | Statistics placeholder                    |
| `/settings`         | Settings placeholder                      |
| Any unmatched path  | Friendly fallback with a return-home link |

Navigation actions use real links styled as large buttons, so browser history and
standard keyboard interaction work. The layout includes a skip link, visible
focus indicators, active-page navigation, route-change focus management, and page
titles. CSS decorations are hidden from assistive technology and transitions
respect reduced-motion preferences.

Vite's development and preview servers support direct route visits. When deploying
later, configure the static host to serve `index.html` for application routes so
that refreshing a nested route works.

The component tests cover all six routes, home actions, active navigation,
keyboard navigation, page titles, focus changes, and unknown-route recovery.

## Shared types

- `question.ts`: operations, difficulty levels, question sources, and questions.
- `session.ts`: session length, practice attempts, and practice sessions.
- `mistake.ts`: mistake patterns and mastery progress.
- `statistics.ts`: overall, operation, and difficulty totals.
- `settings.ts`: application preferences, practice defaults, and mastery threshold.

Attempts retain both the selected answer and the self-reported result. These types
describe data contracts; runtime validation, persistence, and settings defaults
will be implemented in their respective phases.
