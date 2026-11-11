# Personal Website (Hugo)

Contributor runbook for this repo.

The site uses the `hugo-story` theme with local overrides for layout, navigation, SEO, and styling. Content is mostly data-driven from `content/` and `data/`.

## Quickstart

Prerequisites:
- Hugo (the extended build is not required; the stylesheet is plain CSS)
- `rg` (ripgrep) for local validation scripts

Run locally:

```bash
hugo server
```

Build production output:

```bash
hugo --panicOnWarning --minify
```

Create a new post:

```bash
hugo new post/my-new-post.md
```

## Project Structure

- `config.toml`: site config, metadata, social links, theme settings, custom SCSS registration.
- `content/`: page and post content.
- `data/`: homepage and list datasets (`banner.yml`, `gallery.yml`, `projects.yml`, `resume.toml`, etc.).
- `layouts/`: local template overrides and custom page layouts.
- `assets/css/site.css`: the complete site stylesheet, plain CSS with no Sass step (theme CSS is not loaded).
- `scripts/`: prepublish and regression checks.
- `themes/hugo-story/`: upstream theme source.

## Editing Guide

Homepage and navigation:
- `layouts/index.html`: homepage section composition.
- `layouts/partials/site-nav.html`: sticky nav and mobile menu toggle.
- `data/banner.yml`: hero copy and images.
- `layouts/partials/featured-posts.html`: featured writing section.
- `data/gallery.yml`: homepage projects gallery section.

Pages:
- `content/about.md`: about page content.
- `content/projects.md` + `layouts/_default/links.html`: projects page content/template.
- `content/resume.md` + `layouts/resume/single.html` + `data/resume.toml`: resume page content/template/data.

Posts:
- `content/post/*.md`: full writing archive.
- Set `featured: true` in post front matter to show a post in homepage featured writing.
- Set valid `cover` and `description` in front matter.

Canonical projects source:
- Keep projects in `data/projects.yml` for the full projects page.

## Blog Comments (Disqus)

Comments use Hugo's built-in Disqus template and the `wiso` shortname in `[services.disqus]`. Set `comments: false` in a post's front matter to hide comments.

## Theme and Approach Notes

- Theme base: `hugo-story` supplies only `baseof.html` and the Hugo plumbing. Its CSS, jQuery bundle and FontAwesome are no longer loaded (`layouts/partials/scripts.html` is intentionally empty).
- Styling: `assets/css/site.css` is the whole stylesheet. Tokens live on `:root` with a dark-mode override; display type is Fira Sans Extra Condensed, reading type Literata, code Fira Code.
- Homepage hero: `layouts/partials/featured-posts.html` draws the three newest `featured: true` posts as a space-time (message) diagram, ending with an email reply.
- Relaunch direction:
  - split CTA emphasis (writing first, consulting/contact secondary),
  - curated featured posts on homepage while keeping full archive on `/post/`,
  - dedicated non-blog UX for `/projects/`, `/resume/`, `/privacy/`, and `/imprint/`.

## Prepublish Checks

Run before publishing:

```bash
./scripts/prepublish-check.sh
```

This script verifies:
- production build succeeds,
- no placeholder/missing post covers,
- no missing project media references,
- critical pages are generated and non-empty,
- basic metadata formatting sanity checks.

Fast regression check:

```bash
./scripts/check-link-targets.sh
```

Mobile menu behavior (requires Node.js; builds into a temporary directory):

```bash
node scripts/check-mobile-nav.cjs
```
