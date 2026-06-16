# QUEST ✦ — Brand kit

The visual system behind Quest, in one folder. Use it so every slide, doc, and screen
looks like the same product.

## What's here

| File | What it is |
|---|---|
| `brand-guidelines.html` | The visual reference — logo, color, type, components, slide rules, voice. **Open this first.** |
| `slide-template.html` | An on-brand 16:9 deck starter. Copy it to make a deck. |
| `tokens.css` | All design tokens as CSS variables + drop-in helper classes. `@import` or `<link>` it. |
| `tokens.json` | The same tokens as data, for any tool/script. |
| `logo.svg` | QUEST✦ wordmark (web-font based). |
| `logo-quest.png` · `logo-quest-dark.png` | Rasterized wordmark, light · dark — for GitHub/README & anywhere web fonts don't load. |
| `logo-mark.svg` | The ✦ sparkle alone, as a vector path — favicon, bullet, app-icon seed. |

## The non-negotiables

- **Logo:** `QUEST` in ink + `✦` in VNG orange, Space Grotesk Bold. On dark, QUEST goes white; the ✦ stays orange.
- **Primary color:** VNG orange `#f1592b`. **Signature accent:** the green→blue gradient `#10b981 → #0068ff`.
- **Type:** Space Grotesk (display) + Inter (body).
- **Theme:** light background with a soft radial wash; dark ink surface (`#0d1320 → #1b2738`) for section dividers.
- **Restraint:** one gradient accent per view; content-first; no decorative chips/pills that just restate.

## Make a slide deck

1. Copy `slide-template.html` to a new name.
2. Duplicate a `<section class="slide">` block and edit the text — it's built on a fixed 1920×1080 stage that scales to any screen.
3. Navigate with → / Space / click (← to go back).

To present or hand off, export it to PDF (see below) or open it full-screen in a browser.

## Fonts

Load both from Google Fonts (already wired into every file here):

```
https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap
```

For PowerPoint/Keynote: install **Space Grotesk** and **Inter** locally, or export slides to PDF/PNG.

## Source of truth

These tokens mirror the live product design system in **`src/pages/ui.ts`**. If the product UI
changes, update `tokens.css` / `tokens.json` here to match.

## Regenerate the PDF

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="brand-guidelines.pdf" \
  "file://$PWD/brand-guidelines.html"   # run from this brand/ folder
```
