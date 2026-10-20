# Math Practice App

A browser-based math practice application for children ages 7–12, built with React,
TypeScript, and Vite. Requirements and the development checklist are in
[`docs/Specification.md`](docs/Specification.md) and [`docs/TODO.md`](docs/TODO.md).

## Current scope

Phases 1–3 establish the development tools, shared domain types, responsive
application layout, home page, routing, and practice configuration. Students can
select math skills, difficulty, and session length, then review their choices on
the session page. Question cards, statistics, and settings controls are planned
for later phases.

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
├── config/                 # Practice options, labels, and descriptions
├── hooks/                  # Page titles and access to practice configuration
├── pages/                  # Home, setup, session plan, placeholders, and fallback
├── services/
├── test/                   # Shared test setup
├── types/                  # Questions, sessions, mistakes, statistics, settings
├── utils/
├── index.css
└── main.tsx
```

Empty feature folders contain `.gitkeep` placeholders. Arithmetic generation,
question/attempt state, settings controls, and statistics calculations are not
implemented yet.

## Routes and navigation

React Router's `BrowserRouter` wraps the application in `src/main.tsx`.
`src/app/AppRoutes.tsx` defines the following routes:

| Route               | Page                                        |
| ------------------- | ------------------------------------------- |
| `/`                 | Home                                        |
| `/practice/setup`   | Practice configuration form                 |
| `/practice/session` | Selected plan and practice-card placeholder |
| `/practice/summary` | Session summary placeholder                 |
| `/statistics`       | Statistics placeholder                      |
| `/settings`         | Settings placeholder                        |
| Any unmatched path  | Friendly fallback with a return-home link   |

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

## Practice configuration

Setup starts with no math skills or difficulty selected, and a default of 10
questions. Students can select individual skills or use Mixed operations to
select all four; selecting Mixed operations again clears all four. Difficulty
and session length use native radio groups, and skills use native checkboxes.
Selected states include checked controls, borders, and text. Keyboard users can
use Tab, Space, and arrow keys to make their choices.

Start Session stays disabled until at least one skill and a difficulty are chosen.
An accompanying status message explains what is needed. Validation also runs
on form submission and at the shared-state boundary.

`AppProvider` stores a validated `PracticeConfiguration` snapshot in React
Context. The session page displays that plan, and returning to setup restores
the choices for editing. Local draft changes do not alter the saved plan until
Start Session is selected again. Configuration is held in memory; refresh
recovery and local-storage persistence belong to later phases.

The configuration model uses a nonempty operations tuple, one of the four
difficulty levels, and a length of 5, 10, 20, or `continuous`. It is separate from
the session-history model. This phase does not generate questions, record
attempts, initialize session counters, or start a continuous question loop.

Tests cover individual/mixed selection, exclusive radio choices, validation,
configuration transfer and restoration, keyboard interaction, and protection
against invalid or externally mutated configuration values.

## Shared types

- `question.ts`: operations, difficulty levels, question sources, and questions.
- `session.ts`: session length, practice attempts, and practice sessions.
- `practiceConfiguration.ts`: validated choices passed from setup to session state.
- `mistake.ts`: mistake patterns and mastery progress.
- `statistics.ts`: overall, operation, and difficulty totals.
- `settings.ts`: application preferences, practice defaults, and mastery threshold.

Attempts retain both the selected answer and the self-reported result. These types
describe data contracts; runtime validation, persistence, and settings defaults
will be implemented in their respective phases.
