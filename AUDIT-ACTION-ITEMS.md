# Site Audit - Immediate Action Items

This document provides specific, actionable steps to implement the recommendations from the site audit.

---

## Quick Wins (< 1 hour)

### 1. Use Minified Assets ⚡
**Impact:** Medium | **Effort:** Low | **Priority:** HIGH

Update `index.html` to use minified versions of CSS and JavaScript:

**Current:**
```html
<link rel="stylesheet" type="text/css" href="css/style.css" />
...
<script src="JS/script.js"></script>
```

**Change to:**
```html
<link rel="stylesheet" type="text/css" href="css/style.min.css" />
...
<script src="JS/script.min.js"></script>
```

**Expected benefit:** Reduced file sizes, faster page load

---

### 2. Add Explicit Charset Meta Tag 📝
**Impact:** Low | **Effort:** Low | **Priority:** MEDIUM

Add this line in the `<head>` section, before other meta tags:

```html
<meta charset="UTF-8">
```

**Expected benefit:** Explicit encoding declaration, better browser compatibility

---

### 3. Add Social Media Meta Tags 📱
**Impact:** Medium | **Effort:** Low | **Priority:** MEDIUM

Add these tags in the `<head>` section for better social sharing:

```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://simonlowes.com/">
<meta property="og:title" content="Simon Lowes - Alternative Rock Musician">
<meta property="og:description" content="Discover and listen to the music of Simon Lowes on Spotify, Apple Music, YouTube Music, and SoundCloud.">
<meta property="og:image" content="https://simonlowes.com/IMG_2705.jpeg">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://simonlowes.com/">
<meta property="twitter:title" content="Simon Lowes - Alternative Rock Musician">
<meta property="twitter:description" content="Discover and listen to the music of Simon Lowes on Spotify, Apple Music, YouTube Music, and SoundCloud.">
<meta property="twitter:image" content="https://simonlowes.com/IMG_2705.jpeg">
```

**Expected benefit:** Better preview cards on social media platforms

---

### 4. Add Canonical URL 🔗
**Impact:** Low | **Effort:** Low | **Priority:** MEDIUM

Add this in the `<head>` section:

```html
<link rel="canonical" href="https://simonlowes.com/">
```

**Expected benefit:** Prevents duplicate content issues with search engines

---

### 5. Add Resource Hints 🚀
**Impact:** Medium | **Effort:** Low | **Priority:** HIGH

Add these in the `<head>` section, before stylesheet links:

```html
<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://simonlowes.posthaven.com">
<link rel="preconnect" href="https://img.icons8.com">
<link rel="dns-prefetch" href="https://www.google-analytics.com">
```

**Expected benefit:** Faster loading of external resources

---

## Medium Effort Tasks (1-3 hours)

### 6. Update Sitemap 🗺️
**Impact:** Low | **Effort:** Low | **Priority:** LOW

Update `sitemap.xml` with current date:

**Current:**
```xml
<lastmod>2023-07-16</lastmod>
```

**Change to:**
```xml
<lastmod>2025-12-09</lastmod>
```

**Expected benefit:** Search engines know the site is actively maintained

---

### 7. Optimize Canvas Animation Performance 🎨
**Impact:** High | **Effort:** Medium | **Priority:** HIGH

Add visibility change listener to pause animation when tab is not active:

Add this code at the end of `JS/script.js`:

```javascript
// Pause animation when tab is not visible to save resources
var animationRunning = true;

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    animationRunning = false;
  } else {
    animationRunning = true;
    requestAnimationFrame(draw);
  }
});

// Modify the draw function to check if animation should run
// Change the last line of draw() from:
// requestAnimationFrame(draw);
// To:
if (animationRunning) {
  requestAnimationFrame(draw);
}
```

**Expected benefit:** Reduced CPU usage, better battery life on mobile, improved TTI

---

### 8. Add Lazy Loading to Iframe 📺
**Impact:** Medium | **Effort:** Low | **Priority:** MEDIUM

Update the iframe tag in `index.html`:

**Current:**
```html
<iframe
  id="blog-iframe"
  title="Simon Lowes Music Blog - Latest Updates and News"
  src="https://simonlowes.posthaven.com"
  loading="lazy"
></iframe>
```

Already has `loading="lazy"` ✅ - No action needed!

---

## Hosting/Server Configuration (Requires hosting provider access)

### 9. Configure Security Headers 🔒
**Impact:** High | **Effort:** Medium | **Priority:** HIGH

Add these HTTP headers via your hosting provider's configuration:

#### For GitHub Pages
Create `.htaccess` file (if supported) or configure via repository settings.

#### For Netlify
Create `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://img.icons8.com data:; frame-src https://simonlowes.posthaven.com; connect-src 'self' https://www.google-analytics.com"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

#### For Apache
Add to `.htaccess`:

```apache
<IfModule mod_headers.c>
  Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://img.icons8.com data:; frame-src https://simonlowes.posthaven.com; connect-src 'self' https://www.google-analytics.com"
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>
```

**Expected benefit:** Significantly improved security posture

---

## Repository Cleanup

### 10. Remove Unused Images 🧹
**Impact:** Low | **Effort:** Low | **Priority:** MEDIUM

The following images in the `images/` directory are not referenced anywhere:

- `images/IMG_0407.JPG` (6.1 MB)
- `images/IMG_0404.jpeg` (3.3 MB)
- `images/IMG_0432.jpeg` (1.3 MB)
- `images/IMG_1709.jpeg` (172 KB)

**Total savings:** 10.9 MB

Command to remove:
```bash
cd images
rm IMG_0407.JPG IMG_0404.jpeg IMG_0432.jpeg IMG_1709.jpeg
```

**Note:** If these images are needed for blog posts or future use, consider moving them to a separate storage solution (Cloudinary, AWS S3, etc.) rather than keeping them in the repository.

**Expected benefit:** Cleaner repository, faster git operations

---

## Audio Optimization (Optional)

### 11. Optimize Audio File 🎵
**Impact:** Medium | **Effort:** Medium | **Priority:** MEDIUM

Current: `neverthere.mp3` is 3.0 MB

Options:
1. **Compress to lower bitrate** (recommended: 128-160 kbps for music)
2. **Provide multiple formats** (MP3, OGG, AAC) for better browser compatibility
3. **Consider streaming** if file is long

Using FFmpeg to optimize:
```bash
# Compress to 128kbps (good quality for web)
ffmpeg -i neverthere.mp3 -codec:a libmp3lame -b:a 128k neverthere-optimized.mp3

# Create OGG version for better compression
ffmpeg -i neverthere.mp3 -codec:a libvorbis -b:a 128k neverthere.ogg

# Create AAC version
ffmpeg -i neverthere.mp3 -codec:a aac -b:a 128k neverthere.m4a
```

Then update HTML to use multiple sources:
```html
<audio id="myAudio" preload="metadata">
  <source src="neverthere.m4a" type="audio/mp4">
  <source src="neverthere.ogg" type="audio/ogg">
  <source src="neverthere.mp3" type="audio/mpeg">
  Your browser does not support the audio element.
</audio>
```

**Expected benefit:** Faster audio loading, reduced bandwidth usage

---

## Testing Checklist

After implementing changes, test:

- [ ] Page loads correctly on desktop
- [ ] Page loads correctly on mobile
- [ ] All links work (especially social media links)
- [ ] Audio player functions properly
- [ ] Canvas animation runs smoothly
- [ ] No console errors in browser DevTools
- [ ] Run Lighthouse audit again to verify improvements
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test accessibility with screen reader (optional but recommended)

---

## Metrics to Track

After implementing changes, expected improvements:

| Metric | Before | Target After |
|--------|--------|--------------|
| Performance Score | 69/100 | 75-80/100 |
| Time to Interactive | 7.2s | < 5s |
| Total Blocking Time | 2,340ms | < 600ms |
| Page Load Time | ~1.4s | < 1s |
| Security Score | 96/100 | 100/100 |

---

## Long-term Recommendations

### Consider for Future Updates:

1. **Self-host social media icons** instead of using Icons8 CDN
   - Download SVG versions of icons
   - Create an icon sprite or use inline SVG

2. **Implement monitoring**
   - Set up Google Search Console
   - Add uptime monitoring (UptimeRobot, Pingdom, etc.)
   - Track Core Web Vitals with Google Analytics or similar

3. **Progressive Web App (PWA)**
   - Add manifest.json
   - Implement service worker for offline access
   - Add install prompt for mobile users

4. **Content updates**
   - Regularly update blog content via Posthaven
   - Keep social media links current
   - Update sitemap when content changes

---

## Priority Order for Implementation

If you can only do a few things, do these in order:

1. ✅ Add resource hints (5 minutes)
2. ✅ Use minified assets (5 minutes)
3. ✅ Add social media meta tags (10 minutes)
4. ✅ Add canonical URL (2 minutes)
5. ✅ Optimize canvas animation (30 minutes)
6. 🔒 Configure security headers (30-60 minutes, hosting dependent)
7. 🧹 Remove unused images (5 minutes)

**Total estimated time for priorities 1-5: ~1 hour**

---

**Document created:** December 9, 2025  
**Based on:** Comprehensive Site Audit Report  
**Review date:** After implementation or in 30 days
