# cv.xlsft.com

Nuxt 4 CV site. CMS: Clarity (GROQ). UI: Nuxt UI + Tailwind v4. Package manager: pnpm.

Checks that must stay at zero errors and zero warnings: `pnpm lint` (stylelint + eslint) and `pnpm typecheck` (vue-tsc).

## Structure

```
app/
├── components/
│   ├── assistant/   # AI chat: Assistant (modal), AssistantCat, one component per tool block
│   ├── common/      # reusable, no business logic: Highlight, Modal, TSV, Image, Contact
│   ├── experience/  # Experience, ExperienceItem
│   ├── gallery/     # Gallery (modal), GalleryPreview, GalleryThumbnails
│   ├── layout/      # Header, Footer, Section, Seo, Logo
│   ├── profile/     # Profile (fastfetch-style)
│   ├── project/     # blocks of the project page: Readme, About, Screenshots
│   ├── projects/    # Projects (terminal filter), Grid, Item, Deck
│   └── og/          # OG image templates (names required by nuxt-og-image)
├── lib/             # plain modules, not auto-imported (logo geometry)
├── pages/           # route components live here, not in components/
└── stores/<name>/{const,store,types,index}.ts   # cms, assistant, projects
server/
├── api/ routes/ plugins/
├── static/          # static data (icons)
└── utils/           # use* factories
deploy/
├── docker-compose.yaml
├── Dockerfile
└── config/searxng.yml
```

Folders are site entities, not component types. File names are short, ideally one word, prefixed by the folder: `projects/ProjectsGrid.vue`.

## Components

`<script setup lang="ts">`, declarations in this order: imports and types, props/emits/models, composables and stores, template refs, data, state, methods, computed, init (watchers, hooks).

- Type everything with generics: `defineProps<{…}>()` (with `withDefaults` when needed), `defineEmits<{…}>()`, `defineModel<T>()`. Every `ref`, `computed`, `useTemplateRef`, `useAsyncData`, `useState` has an explicit type argument. Never runtime `PropType` props.
- UI state lives in one `const state = ref<{…}>()`. Flags and strings are optional and start absent: `ref<{ open?: boolean }>({})`, never `false`/`''`; switching off sets `undefined`. Numbers with real meaning (index, scale) are explicit.
- Methods live in `const methods = {…}`, nested by meaning (`methods.zoom.at()`). A single method may be a named function.
- A computed used once belongs in the template, not in setup.
- The only empty value is `undefined`. CMS `null` is converted in the store.
- `await` directly in `<script setup>` when data is needed for render. `onMounted` only for DOM work.
- No `<style>` blocks. Tailwind classes only; repeated patterns are `@utility` in `assets/css/theme.css`.
- No arbitrary values (`text-[15px]`, `grid-cols-[…]`, `[--x:y]`, `text-(--var)`). Use the theme scale or a theme token from `assets/css/theme.css` (`text-terminal`, `text-compact`, `text-2xs`, `*-ch`, `*-gutter`, `w-key*`, `grid-cols-photo|fetch|conf|pair|head|skills|tags`, `grid-rows-open|closed`, colors `comment`, `line`, `dim`, `top-header`, `min-h-viewport`). Selector-based styling is an `@utility` there (`bg-grid`, `bg-lines`, `tile-lines`, `tile-place`, `tuck`, `stagger`, `fetch-rows`, `md-*`, `terminal-link`). Any arbitrary value that is truly required must be approved by the owner first.
- No non-canonical Tailwind classes (IntelliSense `suggestCanonicalClasses` must be clean).
- No "super components": split anything that renders several unrelated things.
- No workarounds stacked on top of a component. If a component lacks a feature, extend it (add a slot, prop or token) instead of wrapping it.
- Comments only where the code is genuinely unclear.
- Pseudo terminal highlighting only through `CommonHighlight`: `\0` + color char starts a token, `{href}` right after the color char makes it a link (`\0d{/ru#projects}~/projects/`). Colors: o d c p i w e s.

## Data

Shared UI state of several sibling components lives in a stateful store (`stores/projects` holds the terminal filter for `ProjectsPrompt`, `ProjectsOutput`, `ProjectsTags`, `ProjectsGrid`).

Components never write GROQ. Every query is a named method of `useCmsStore()` (`profile()`, `experience()`, `projects()`, `readme(id)` …); the store's `query` is private. Each block calls its own method; pages only compose blocks.

`stores/cms/cache.ts` makes that cheap: `useAsyncData` keyed by query + params (SSR payload hydrates the client), an instance cache with fresh/stale windows, in-flight dedupe, and batching of queries from the same tick into one GROQ object (`{ "q0": (…), "q1": (…) }`, shared params kept, conflicting ones renamed, split by URL length, a broken query fails alone).

## Server

`server/utils` exports factories only: `const thing = useThing(init); thing.method()`. Anything that is not a factory is not named `use*`.

Configuration comes from `useRuntimeConfig()` only. Defaults live in `nuxt.config.ts`; public values are overridden with `NUXT_PUBLIC_*`, private ones with `NUXT_*`. Dev-only defaults go under `$development`. Never read `process.env` for app settings.

## Deploy

`deploy/docker-compose.yaml` runs app, clarity, postgres and searxng. Secrets come from `deploy/.env` (not committed).
