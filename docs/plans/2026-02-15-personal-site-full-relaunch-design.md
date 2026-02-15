# Personal Site Full Relaunch Design (Hugo)

Date: 2026-02-15
Audience priority: Senior engineers/tech leads > potential clients/consulting leads
Primary CTA model: Split CTA (blog first, consulting secondary)
Content strategy: Keep all posts, feature selected posts on homepage
Timeline: 2+ weeks

## 1. Goals
- Relaunch the site as a publish-ready personal brand and technical blog.
- Serve two primary audiences with clear hierarchy:
  - Primary: senior engineers/tech leads
  - Secondary: potential clients/consulting leads
- Improve conversion and credibility without sacrificing technical depth.

## 2. Information Architecture

### Homepage (`/`)
Purpose: conversion-oriented landing page, not a full archive.
Sections:
1. Hero
- Hybrid authority + outcomes messaging.
- Primary CTA: Read writing.
- Secondary CTA: Contact for consulting.

2. Proof / What I Build
- Concrete statements around reliability, scale, and distributed systems outcomes.

3. Featured Writing
- Curated subset of posts only.
- Full archive remains on `/post/`.

4. Featured Projects
- Curated 4-6 projects with concise impact-oriented copy.

5. Contact / Consulting block
- Clear collaboration invitation and contact path.

### Writing archive (`/post/`)
- Full list of posts with proper metadata and covers.

### Projects (`/projects/`)
- Dedicated page with complete project list (no empty state).
- Not a duplicate of homepage cards; can include richer context.

### Static pages
- `/resume/`, `/privacy/`, `/imprint/` use non-blog page UX.

### Navigation priority
- Home, Writing, Projects, Resume, Contact.

## 3. Content Strategy

### Featured content model
- Keep all posts published in `/post/`.
- Add explicit front matter flag for curated homepage posts:
  - `featured: true`

### Post metadata normalization
Each post should have:
- `description`
- valid `cover` path (no missing assets)
- clean tags
- no placeholder summary text

### Projects model
- Maintain one canonical projects dataset in `data/`.
- Render subsets from that canonical source for homepage and projects page.

### Messaging structure
Hero copy format:
- line 1: authority/domain
- line 2: outcome proposition
- CTA pair: writing primary, consulting secondary

## 4. Template and UX Architecture (Hugo)

### Template split by content type
- Keep blog posts in `layouts/_default/single.html`.
- Add generic static-page template:
  - `layouts/_default/page.html`
- Add dedicated resume layout:
  - e.g. `layouts/resume/single.html` (or equivalent via front matter mapping)

### Remove blog-specific chrome from non-blog pages
- No reading-time badges on legal/resume pages.
- No "Back to Blog" on legal/resume pages.
- Optional neutral breadcrumb/back navigation.

### Data coupling cleanup
- Eliminate brittle dependency on removed data files.
- Ensure `/projects/` always reads from canonical projects data.

### Mobile navigation
- Keep sticky top nav.
- Add mobile menu toggle (current mobile hides nav links).

### CSS architecture
- Ensure custom SCSS is compiled through Hugo pipeline.
- Move inline per-template style blocks into asset-pipeline styles.

## 5. Hugo-Specific Implementation Model

### Content/data source of truth
- Posts: front matter + content files.
- Projects: one canonical data file in `data/`.

### Minimal override strategy
- Prefer local overrides in `layouts/partials/` and layout files.
- Avoid deep theme forking unless required.

### Build safety checks (publish gate)
Required before publish:
- `hugo --panicOnWarning --minify`
- broken asset check for `cover`/project media paths
- critical page checks:
  - `/`
  - `/post/`
  - `/projects/`
  - `/resume/`
  - `/privacy/`
  - `/imprint/`

### SEO and feeds
- Keep Hugo-generated canonical/sitemap/RSS.
- Normalize front matter fields to produce clean metadata output.

## 6. Relaunch Approach
Recommended approach: parallel tracks.

Track A: Content and positioning
- Hero messaging, proof points, CTA copy
- Featured writing/project curation
- Metadata normalization and summary cleanup

Track B: UX and technical foundation
- Layout split (blog vs static/resume)
- Data-source consolidation for projects
- asset/path fixes and CSS pipeline integration
- mobile nav behavior and accessibility checks

Integration cadence:
- Weekly integration into staging branch, with publish-gate checks.

## 7. Non-goals for this relaunch
- Full CMS migration
- Multi-language rollout
- Major backend/platform changes beyond Hugo templates/content/data

## 8. Success Criteria
- No empty core pages (especially `/projects/`).
- No broken critical images/assets in homepage and archives.
- Clear split-CTA journey from homepage.
- Non-blog pages have appropriate UX and metadata treatment.
- Build and publish checks pass cleanly.
