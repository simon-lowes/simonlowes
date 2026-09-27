---
name: new-post
description: Create or edit a blog post on simonlowes.com as a designed MDX page (or plain Markdown), with images, audio, video and embeds, then verify and open a PR. Use when Simon asks for a new post, an update to a post, or to publish something on the blog.
argument-hint: <title or a short brief for the post>
---

# New blog post

Posts are files in `src/content/blog/`. There is no CMS: the post is written here, checked
with the site's own tooling, and shipped through a PR like any other change. The brief is
`$ARGUMENTS`; if it is empty, ask what the post is about, then proceed.

## 1. Gather what the post needs

Ask only for what is missing and cannot be inferred:

- **Title** and, if it matters, the **date** (defaults to today, UTC).
- **The words**: Simon's text as given, or a brief to write from. Keep his voice: plain,
  direct, first person, no marketing gloss. Do not invent facts about releases, dates or gigs.
- **Media**: images (Simon uploads them, or names files already in `public/images/`), audio
  or video (large files live on Cloudflare R2 at `https://media.simonlowes.com/...`; small
  clips can go in `public/audio/`), YouTube ids, Bandcamp embed URLs.
- **Design intent**: does it want to be a plain note (`.md`) or a designed page (`.mdx`)?
  Default to `.mdx` when there is any media or more than a few paragraphs.

## 2. Write the file

- Path: `src/content/blog/<slug>.mdx` (or `.md`). Slug: lowercase, hyphens, ASCII, short,
  stable; it becomes `/blog/<slug>/`.
- Front matter (schema in `src/content.config.ts`):

  ```yaml
  ---
  title: "..."
  date: "YYYY-MM-DD"
  description: "One or two sentences for the list page and search results."
  draft: false # true keeps it out of the build until it is ready
  heroImage: /images/blog/<slug>/hero.jpg # optional, shown up to 400px tall
  heroImageAlt: "..." # required if heroImage is set
  ---
  ```

  The `media` array (video / audio / image groups rendered below the body) still works but
  designed posts place media inline with components instead.

- Components, imported at the top of an `.mdx` file from `../../components/post/`:

  | Component                       | Use                                                                                                                                                   |
  | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `<Lead>`                        | The opening paragraph, set larger. One per post, first.                                                                                               |
  | `<Callout title tone>`          | Glass aside; `tone` is `cyan` (default) or `magenta`.                                                                                                 |
  | `<Reveal delay>`                | Fades and lifts its content in on scroll; stagger siblings with `delay` in ms. Respects reduced motion.                                               |
  | `<Figure src alt caption wide>` | Image with caption; `wide` bleeds past the column on desktop.                                                                                         |
  | `<Track src title note>`        | Self-hosted audio clip in a glass card, streamed on demand.                                                                                           |
  | `<Embed kind id title poster>`  | Click-to-load YouTube (`kind="youtube"`, video id) or Bandcamp (`kind="bandcamp"`, full EmbeddedPlayer URL). Nothing third-party loads until clicked. |

  `src/content/blog/post-kit.mdx` is a permanent draft that uses every component; copy from it.
  Post-specific styling or animation beyond these goes in a new component under
  `src/components/post/` (scoped `<style>`, `astro:page-load` re-binding for scripts, a
  `prefers-reduced-motion` path), not inline in the post.

- Images: put them in `public/images/blog/<slug>/`, sized for the web (WebP or JPEG, no
  wider than 1600px, under ~300 KB each), with real `alt` text. Do not commit audio or video
  over a few MB; those go to R2 and are referenced by URL.

## 3. Verify

```bash
npm run lint && npm run format:check && npm test
npm run build            # MDX and front matter errors surface here
npx astro preview        # then open http://localhost:4321/blog/<slug>/
```

Render the post headless at 390px and 1280px (Playwright with
`executablePath: "/opt/pw-browsers/chromium"`) and look at the screenshots: heading, media
and callouts must fit the column with nothing clipped. Run `npm run test:e2e` if any
component or layout changed.

## 4. Ship

Branch `post/<slug>`, one commit `content: add post "<title>"` (or `update post`), push,
open a PR with the checklist filled in, watch CI. Merging to `main` publishes; Dokploy
currently needs a manual redeploy afterwards (see CLAUDE.md, Deployment Build).
