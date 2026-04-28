## Goal

The "Explore the islands" tiles on the homepage (`InteractiveSelector`) currently use generic Unsplash stock photos (palm trees, abstract beaches). Replace them with photo-realistic, location-accurate cover images for each of the 5 islands:

- **Havelock (Swaraj Dweep)** — Radhanagar Beach white sand & turquoise water
- **Neil Island (Shaheed Dweep)** — Natural Bridge / Bharatpur reefs
- **Port Blair** — Cellular Jail & harbour skyline
- **Diglipur** — Ross & Smith twin islands sandbar
- **Baratang** — Limestone caves entrance / mangrove creek

## Approach

Generate one high-quality landscape image per island using the **Nano Banana Pro** model (`google/gemini-3-pro-image-preview`) for true-to-place editorial quality. Save each as a static asset bundled with the app — no runtime AI calls, no storage bucket needed (these are fixed marketing images).

```text
src/assets/islands/
  havelock-radhanagar.jpg
  neil-natural-bridge.jpg
  port-blair-cellular-jail.jpg
  diglipur-ross-smith.jpg
  baratang-limestone-caves.jpg
```

Then update `src/components/ui/interactive-selector.tsx` to import these assets and use them in `defaultOptions[].image` instead of the Unsplash URLs. The existing `SmartImage` fallback chain stays intact (Unsplash kept as a fallback only).

## Steps

1. **Generate 5 island images** via a one-off script using Lovable AI Gateway (`google/gemini-3-pro-image-preview`, modalities `["image","text"]`), with cinematic editorial prompts that explicitly name the landmark, time of day, and "no text/watermark". Save the base64 PNGs into `src/assets/islands/`.
2. **QA each generated image** by inspection — re-prompt any that look off-brand or geographically wrong (e.g. snowy mountains, wrong architecture).
3. **Update `interactive-selector.tsx`**:
   - Add `import havelockImg from "@/assets/islands/havelock-radhanagar.jpg"` (and 4 more).
   - Swap each `defaultOptions[i].image` to the imported asset.
   - Keep one Unsplash URL as `fallbacks` in `<SmartImage />` for safety.
4. **Verify** in the running preview that all 5 tiles show the new images and lazy-load correctly.

## Technical notes

- Vite bundles imported `.jpg` assets with hashed filenames + correct `Content-Type`, so `SmartImage` (which is just an `<img>` wrapper) handles them natively.
- Image dimensions: target ~1600×1000 (landscape) at JPG q=82 — large enough for the active expanded tile, small enough to keep page weight modest.
- No DB / RLS / edge-function changes. No new dependencies.
- Memory: this design choice (real photos, not stock) is worth saving as a project rule so future tiles/cards follow the same convention.

## Out of scope

- Changing the tile layout, copy, or interaction.
- Generating images for other surfaces (blog, listings, hero) — this plan only covers the 5 island tiles on the homepage.
- Wiring an admin UI to swap these images later.
