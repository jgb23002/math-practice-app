# Math Practice App

A browser-based math practice application for children ages 7–12, built with React,
TypeScript, and Vite. Requirements and the development checklist are in
[`docs/Specification.md`](docs/Specification.md) and [`docs/TODO.md`](docs/TODO.md).

## Current scope

Phase 1 establishes the development tools, shared domain types, project folders,
and a minimal application shell. Practice features, routing, persistence, and the
shared page layout are planned for later phases.

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
├── app/                    # Minimal shell and its component test
├── components/
│   ├── common/
│   ├── layout/
│   ├── practice/
│   └── statistics/
├── hooks/
├── pages/
├── services/
├── test/                   # Shared test setup
├── types/                  # Questions, sessions, mistakes, statistics, settings
├── utils/
├── index.css
└── main.tsx
```

Empty feature folders contain `.gitkeep` placeholders. No future-phase components
or services are implemented yet.

## Shared types

- `question.ts`: operations, difficulty levels, question sources, and questions.
- `session.ts`: session length, practice attempts, and practice sessions.
- `mistake.ts`: mistake patterns and mastery progress.
- `statistics.ts`: overall, operation, and difficulty totals.
- `settings.ts`: application preferences, practice defaults, and mastery threshold.

Attempts retain both the selected answer and the self-reported result. These types
describe data contracts; runtime validation, persistence, and settings defaults
will be implemented in their respective phases.
