# Angular + Material Boilerplate Setup (Music-Bingo Style)

This file is a reusable recipe to create a project with the same setup/style as this repo.

## 1) Reusable Prompt For AI Agent

Copy this prompt into a coding agent when you want a fresh project scaffold:

```md
Create a new Angular app using the latest stable Angular (no next/rc builds), standalone components, SCSS, and Angular Material (M3), with PWA/service-worker support, ESLint flat config, Husky + lint-staged, and a strict local validation workflow.

Requirements:

- Stack:
  - Latest stable Angular + Angular CLI
  - Angular Material + CDK
  - Angular Service Worker (PWA)
  - Signals-friendly architecture
  - SCSS styling
  - ESLint flat config using `@eslint/js`, `typescript-eslint`, and `angular-eslint`
  - `husky` + `lint-staged` pre-commit lint on staged `*.ts` and `*.html`
- Scripts in `package.json`:
  - `start`, `build`, `watch`, `test`, `lint`, `lint:staged`, `collect`, `validate`, `prepare`
  - `validate` must run `npm run lint && npm run build`
- Static data workflow:
  - Keep input files under `sources/`
  - Build must copy `sources/default.xml` to `/sources/default.xml`
  - Build must copy `sources/album-covers/**/*` to `/album-covers/**/*`
- Runtime path strategy:
  - Resolve XML/assets from `document.baseURI` so local dev and GitHub Pages both work
- Service worker strategy:
  - Prefetch app shell assets
  - Lazy-cache `/sources/default.xml`
  - Lazy-cache `/album-covers/**`
- Tooling:
  - `tsx`, `dotenv`, `@xmldom/xmldom`, `@types/node`
  - Shared parser logic usable in browser and Node script
- Conventions:
  - Angular standalone, skip test file generation for new schematics
  - Material 3 token-first styling (`--mat-sys-*`)
  - Keep UI mobile-first and virtual-scroll-friendly
- AI agent governance:
  - Create `AGENTS.md` with architecture, workflow, and validation rules
  - AGENTS maintenance rules must explicitly require:
    1. `npm run lint`
    2. `npm run build`
  - Mention pre-commit hook behavior (`husky` + `lint-staged`)

Deliverables:
1. All config/files created and wired.
2. `AGENTS.md` included.
3. `README.md` with setup/run/collect/deploy notes.
4. Run `npm run lint` and `npm run build` and report results.
```

## 2) Manual Setup Commands

Run in PowerShell (or your shell equivalent):

```bash
npx @angular/cli@latest new music-bingo --standalone --routing --style=scss --package-manager=npm --ssr=false --skip-tests
cd music-bingo

npx ng add @angular/material
npx ng add @angular/pwa --project music-bingo
npx ng add angular-eslint --skip-confirmation

npm install lz-string
npm install -D @types/lz-string @types/node @xmldom/xmldom dotenv tsx husky lint-staged prettier
```

Then ensure `package.json` scripts look like this:

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "lint": "ng lint",
    "lint:staged": "lint-staged",
    "collect": "tsx scripts/collect-album-covers.ts",
    "validate": "npm run lint && npm run build",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,html}": "eslint --max-warnings=0"
  }
}
```

Set up Husky pre-commit:

```bash
npm run prepare
```

Create `.husky/pre-commit`:

```sh
#!/usr/bin/env sh
npm run lint:staged
```

## 3) Required Config Pattern

### `eslint.config.js`

```js
// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
```

### `angular.json` (key points)

- `cli.schematicCollections`: include `angular-eslint`
- `projects.<name>.schematics`: set `skipTests: true` for generated artifacts
- `build.options.assets`: include
  - `public/**/*`
  - `sources/default.xml` -> output `sources`
  - `sources/album-covers/**/*` -> output `album-covers`
- `build.configurations.production`:
  - `"serviceWorker": "ngsw-config.json"`
  - set `baseHref` for GitHub Pages (for example `"/music-bingo/"`)
- `architect.lint.builder`: `@angular-eslint/builder:lint`

### `ngsw-config.json` (key points)

- Prefetch app shell (`index`, JS/CSS, manifests, favicon, icons)
- Lazy cache `/sources/default.xml`
- Lazy cache `/album-covers/**`
- Optional `dataGroups` for runtime APIs/fonts

### `tsconfig.scripts.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "noEmit": true
  },
  "include": ["scripts/**/*.ts", "src/shared/**/*.ts", "src/app/models/**/*.ts"]
}
```

## 4) AGENTS.md Template (Static Prompt Rules)

Use this as the baseline content for `AGENTS.md` and replace placeholders:

```md
# <Project Name> - AI Agent Context

## Overview

<1-2 paragraph product + architecture summary>

## Agent Maintenance Rules

- Keep this file synchronized with architecture/tooling changes.
- After changes, run both quality gates locally:
  1. `npm run lint`
  2. `npm run build`
- Pre-commit hook (`husky` + `lint-staged`) lints staged `*.ts` and `*.html`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Latest stable Angular (standalone components) |
| UI | Angular Material (M3) |
| Styling | SCSS + `--mat-sys-*` tokens |
| State | Angular Signals |
| PWA | Angular Service Worker (`@angular/service-worker`) |
| Linting | ESLint flat config + `angular-eslint` |
| Deployment | GitHub Actions -> GitHub Pages |

## Project Structure

```text
<project>/
|- scripts/
|- sources/
|  |- default.xml
|  `- album-covers/
|- src/
|  |- app/
|  `- shared/
|- angular.json
|- ngsw-config.json
|- eslint.config.js
|- tsconfig.scripts.json
|- package.json
`- README.md
```

## Architecture Notes

- Shared parser/domain logic should be reusable in browser + Node scripts.
- Static assets must resolve from `document.baseURI`.
- Service worker:
  - app shell prefetched
  - large/static data cached lazily
  - media assets cached lazily

## Build, Validate, Collect

```bash
npm ci
npx ng serve
npm run lint
npm run build
npm run validate
npm run collect
```

## Styling Conventions

- Prefer Material 3 system tokens (`--mat-sys-*`), avoid hardcoded colors.
- Keep controls lightweight and performant.
- Preserve mobile-first layout and virtual-scroll performance where applicable.

## Gotchas

- Virtual scroll requires stable height + `itemSize`.
- External APIs may have partial data; include fallback logic.
- Keep filename conventions deterministic for asset lookup.
```

## 5) Definition Of Done For This Boilerplate

- `npm run lint` passes.
- `npm run build` passes.
- `AGENTS.md` and `README.md` are aligned with the actual architecture.
- `sources/` asset copying and runtime path behavior are verified.
- Pre-commit linting works on staged TS/HTML files.
