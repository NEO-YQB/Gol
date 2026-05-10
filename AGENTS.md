# Repository Guidelines

## Project Structure & Module Organization
This repository is a Node.js monorepo using npm workspaces.
- `apps/backend`: NestJS API, DTOs, services, and backend tests in `apps/backend/test`.
- `apps/admin-panel`: Vite + React admin UI.
- `apps/vendor-panel`: Vite + React vendor UI.
- `apps/storefront`: Next.js customer-facing storefront.
- `packages/frontend-core`: shared UI shell, theme, and reusable frontend components.
- `packages/database`: Prisma-related database assets and seed scripts.

Keep feature code close to its workspace. Shared UI belongs in `packages/frontend-core`, not duplicated across panels.

## Build, Test, and Development Commands
Run commands from the repository root unless noted.
- `npm install`: install all workspace dependencies.
- `npm run dev:backend`: start the NestJS API in watch mode.
- `npm run dev:admin`: run the admin panel locally.
- `npm run dev:vendor`: run the vendor panel locally.
- `npm run dev:storefront`: run the storefront on port `3001`.
- `npm run dev:all`: run backend + all frontends together.
- `npm run build`: build every workspace.
- `npm run test -w apps/backend`: run backend Jest tests.
- `npm run test:e2e -w apps/backend`: run backend end-to-end tests.

## Coding Style & Naming Conventions
Use TypeScript throughout. Match the existing style of the workspace you edit.
- React components: `PascalCase` files and exports, e.g. `LoginPage.tsx`.
- Helpers, hooks, and session/api modules: `camelCase` names in `lib/`.
- Prefer small, route-focused page files under `src/pages/`.
- Reuse `packages/frontend-core/src/styles/theme.css` for tokens and shared visual rules.
- Run `npm run lint -w apps/admin-panel` or the equivalent workspace lint command before handing off UI work.

## Testing Guidelines
Backend coverage uses Jest and Supertest. Follow existing backend naming:
- unit/integration specs: `*.spec.ts`
- e2e config: `apps/backend/test/jest-e2e.json`

Frontend work currently relies on build and manual verification. At minimum, confirm changed workspaces build successfully with `npm run build --workspace=<workspace>`.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit style, for example:
- `feat(admin-panel): deepen orders, support, and content workspaces`
- `fix(vendor-panel): remove unused overview import`

Keep commits scoped to one workspace or concern. Pull requests should include: a short summary, affected workspaces, env/config changes, linked issues if available, and screenshots for UI updates.

## Security & Configuration Tips
Use workspace-specific env vars and never hardcode production URLs.
- Frontend API base: `VITE_API_BASE_URL`
- Backend CORS allowlist: `CORS_ORIGINS`

For deployed UIs, verify API paths include the backend global prefix (`/v1`).

## Coolify & Docker
- Each frontend workspace uses its own `Dockerfile`; set the build context to the repository root in Coolify.
- For panel deployments, define `VITE_API_BASE_URL` with the full API base such as `https://api.masterdebug.com/v1`.
- Keep backend `CORS_ORIGINS` aligned with deployed panel domains, for example `https://panel.masterdebug.com,https://vendor.masterdebug.com`.
