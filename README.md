# Useful sites

A personal index of sites worth keeping. Vite + React + Tailwind, in a pnpm/Turbo
monorepo.

```bash
pnpm install
pnpm dev
```

## Adding a site

The index is plain JSON on disk — no database, no CMS. One file per category in
[`apps/web/src/data/sites/`](apps/web/src/data/sites), picked up automatically by
`import.meta.glob`:

```json
{
  "$schema": "../site-category.schema.json",
  "id": "fonts",
  "label": "Fonts",
  "order": 10,
  "sites": [
    {
      "title": "Fontshare",
      "url": "https://fontshare.com/",
      "note": "One line on why this is worth keeping."
    }
  ]
}
```

`id` is a lowercase slug matching the filename, `label` is the heading shown
above the group, and `order` sorts the categories (lower first, defaults to 100).

To add a category, drop in a new `<slug>.json` — nothing to register. The
`$schema` line gives editors autocomplete and inline validation; the same rules
are enforced at runtime in [`data/sites.ts`](apps/web/src/data/sites.ts), which
also rejects duplicate category ids and duplicate URLs.

## UI components

Components live in `packages/ui` and are imported as `@workspace/ui/components/*`.
Add shadcn components from the repo root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

## Fonts

Satoshi (Indian Type Foundry, [FFL](packages/ui/src/styles/fonts/LICENSE.txt)) is
self-hosted from `packages/ui/src/styles/fonts`. Geist Mono comes from
`@fontsource-variable/geist-mono`.
