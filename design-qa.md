# Design QA — Partner Brands and Home Search Filters

## Comparison target

- Source visual truth: `D:\BT-Badminton\arena-badminton-web\qa-artifacts\reference-partner-brands.png`
- Implementation screenshot: `D:\BT-Badminton\arena-badminton-web\qa-artifacts\home-partner-brands.png`
- Side-by-side comparison: `D:\BT-Badminton\arena-badminton-web\qa-artifacts\partner-brands-comparison.png` (source on the left, implementation on the right)
- Route: `http://localhost:3000/`
- State: Home page, default ก๊วน tab, guest header state, after removing the quick-filter row and replacing Partner Brands text with local logo assets.

## Capture normalization

- Source pixels: 1174 × 675.
- Implementation pixels: 2060 × 1200.
- Implementation CSS viewport: 1565 × 900; browser device pixel ratio: 0.75.
- The comparison composite proportionally resized the implementation capture to 1174 × 675 so the two visual states could be reviewed together. Browser chrome and the guest/profile-header difference were treated as state differences, not fidelity findings for this scoped change.

## Evidence

### Full-view comparison

The pastel/kawaii hero composition, search card placement, Partner Brands strip, and dashboard rhythm remain consistent with the source. The implementation intentionally removes the quick-filter row below the search card, so the Partner Brands strip moves upward into the recovered space. The comparison also shows all six real logo images in the implementation: YONEX, VICTOR, LI-NING, FZ FORZA, ALPSPORT, and VSE.

### Focused region comparison

The focused region is the Partner Brands strip and the area immediately below the search card. This is the only changed visual region, so a separate crop was not required beyond the side-by-side comparison. Browser DOM inspection confirmed `quickFilterRow: false`, `partnerLogos: 6`, `loadedLogos: 6`, and `horizontalOverflow: false` at the desktop viewport. The mobile pass confirmed the same six loaded logos, `quickFilterRow: false`, column layout for the strip, and no page-level horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: Existing Fredoka/Mitr role mapping remains unchanged; Partner Brands label and surrounding UI retain the Arena typography system.
- Spacing and layout rhythm: Brand items were compacted and constrained to a 900px strip so all six marks and the ดูทั้งหมด action remain visible together on desktop. Mobile keeps an internal horizontal brand rail without page overflow.
- Colors and visual tokens: Existing white glass card, lavender label, pastel shadow, and action-pill tokens remain. Brand colors are preserved; VSE uses a navy tile so its light mark remains legible on the white strip.
- Image quality and asset fidelity: Six local assets are used from `public/assets/brands`; vector logos are used where available, with raster source images for the remaining marks. All six assets loaded successfully in the browser and none is represented by text or a CSS drawing.
- Copy and content: `Partner Brands` and `ดูทั้งหมด` remain intact. The removed quick-filter labels no longer appear below the Home search card; detailed filters remain available in the dedicated search pages.

## Comparison history

### Iteration 1 — initial logo placement

- Finding: [P2] The first real-logo placement used a wide `space-around` strip; the final VSE mark could be clipped in the rendered viewport even though its image loaded.
- Fix: Reduced brand item widths and gaps, constrained the desktop brand rail to 900px, and changed distribution to `space-between` while preserving the mobile scroll behavior.
- Post-fix evidence: Fresh desktop browser capture shows all six logos plus `ดูทั้งหมด`; DOM reports six loaded images and no page-level overflow.

### Iteration 2 — final verification

- No actionable P0/P1/P2 findings remain for the requested scope.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Local HTTP checks for Home and all six brand asset URLs: passed with HTTP 200.

## Final result

final result: passed
