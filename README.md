# 👨🏻‍💻Rining Wu's Pages

Personal site at <https://wurining.com/>, statically generated with Astro.
React handles theme switching and search; shadcn/ui-style components use the
existing PaperMod styles. MathJax and pseudocode.js render mathematics and algorithms.

## Local development

Use Node.js 24 LTS (minimum 22.12.0) and npm. Dependencies are pinned in
`package.json` and `package-lock.json`.

```sh
npm ci
npm run dev
```

Astro serves development pages at <http://localhost:4321/>.

```sh
npm run check
npm run build
npm run preview
```

`check` checks Astro and TypeScript; `build` generates the static site in `dist/`.
`preview` serves the built site locally. Generated output is ignored by Git.

## Content and static assets

- `src/content/`: publication Markdown and search/archive page metadata. Drafts,
  future publications, and expired publications are excluded from generated pages.
- `src/lib/`: content rendering, site settings, and feed generation.
- `src/pages/`: static pages, RSS, search index, sitemap, and robots.
- `src/components/`, `src/layouts/`, `src/styles/`: presentation and interactions.
- `public/`: favicons, publication figures, pseudocode assets, and custom domain.

Publication Markdown supports the existing `figure` and `pre` shortcodes. Main
content is generated into HTML and can be read without JavaScript.

## Deployment

GitHub Pages uses **GitHub Actions** as its publishing source. The custom domain
is `wurining.com`, with root base path `/`. `.github/workflows/astro.yaml` installs
locked dependencies on Node.js 24, then runs `npm run check` and `npm run build`.

Pushes to `codex/**` branches and pull requests targeting `main` only check and build.
Only a **push to `main`** uploads the Pages artifact and runs production deployment.
A manually dispatched workflow also only checks and builds.
No server, database, backend, or deployment secret is required for this static site.

Keep private credentials and private drafts outside this public repository.
Local `.env` files are ignored; browser HTML and JavaScript remain public.

## References

- [Astro GitHub Pages deployment](https://docs.astro.build/en/guides/deploy/github/)
- [Astro React integration](https://docs.astro.build/en/guides/integrations-guide/react/)
- [shadcn/ui Astro setup](https://ui.shadcn.com/docs/installation/astro)
- [PaperMod](https://github.com/adityatelange/hugo-PaperMod)
- [MathJax](https://www.mathjax.org/)
- [pseudocode.js](https://github.com/SaswatPadhi/pseudocode.js)
