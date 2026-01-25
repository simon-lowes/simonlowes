# Simon Lowes Website - CLAUDE.md

## Project Overview

Official website for Simon Lowes, an alternative rock musician, singer-songwriter, and guitarist.

**Live site:** https://simonlowes.com
**Repo:** https://github.com/simon-lowes/simonlowes

## Tech Stack

- **Framework:** Astro (static site generator)
- **3D Graphics:** Three.js (starfield background with parallax)
- **Animations:** GSAP
- **Hosting:** Vercel (auto-deploys from main branch)
- **Domain:** GoDaddy (DNS managed there)

## Hosting & Domain Setup (Completed Jan 2026)

### Vercel

- Domain `simonlowes.com` and `www.simonlowes.com` connected
- Auto-deploys on push to `main`

### GoDaddy DNS Records

| Type  | Name | Value                                |
| ----- | ---- | ------------------------------------ |
| A     | @    | 216.150.1.1                          |
| CNAME | www  | 0fb12ad6a4c28e43.vercel-dns-016.com  |
| MX    | @    | mx1.simplelogin.co (priority 10)     |
| MX    | @    | mx2.simplelogin.co (priority 20)     |
| TXT   | @    | google-site-verification=...         |
| TXT   | @    | sl-verification=... (SimpleLogin)    |
| TXT   | @    | openai-domain-verification=... (AEO) |

### Email

- SimpleLogin for email forwarding (MX records preserved)

## SEO & AEO (Answer Engine Optimization)

### Verified/Claimed

- **Google Search Console** - verified with new Google account (Jan 2026)
- **Bing Webmaster Tools** - imported from Google Search Console
- **OpenAI** - domain verification TXT record in place

### AEO Files

- `/public/llms.txt` - structured site info for AI crawlers

### Pending

- **Google Knowledge Panel** - someone else managing (likely old Google account), needs to be reclaimed later

## Site Features

- Three.js animated starfield background with 3 parallax layers
- Glass-morphism UI design with cyan accent (#00d4ff)
- Integrated audio player (featuring "Never There")
- Blog using Astro content collections
- Mobile responsive with reduced motion support
- Social links: Spotify, Apple Music, YouTube Music, Bandcamp, YouTube, Instagram

## Music Platforms

- Spotify: https://open.spotify.com/artist/1E8slBJPNvUSPpRIh3xtkI
- Apple Music: https://music.apple.com/gb/artist/simon-lowes/1351008298
- YouTube Music: https://music.youtube.com/channel/UCI4xshiWQrOu_27TPmW9A2g
- Bandcamp: https://simonlowes.bandcamp.com
- YouTube: https://www.youtube.com/simonlowesmusic
- Instagram: https://www.instagram.com/simonlowesmusic/

## Development

```bash
npm install      # Install dependencies
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Notes

- Pushing to `main` triggers Vercel auto-deploy
- The starfield uses reduced particle count on mobile for performance
- Respects `prefers-reduced-motion` accessibility setting
