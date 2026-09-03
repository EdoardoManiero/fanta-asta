# Asta Classic — design system

The rule that keeps this system alive: **any value not in this document is a bug.**
A colour that isn't in the palette, a size that falls between two type steps, a
radius off the scale, a second shadow — each is a drift back toward generic
defaults. `tailwind.config.js` enforces most of it by *replacing* Tailwind's
`colors`, `fontSize`, `borderRadius` and `boxShadow` rather than extending them,
so off-system values don't compile.

## Direction

Asta Classic is a **live auction desk**, not a landing page. Ten people sit in one
room bidding real credits against a countdown that runs out in twenty seconds.
Everything that matters is a number changing under a clock, on a screen someone is
scanning under pressure. So the design is a **sports-desk terminal**: dense,
tabular, monospaced where the numbers live, quiet everywhere else, with exactly one
loud colour reserved for the thing you press.

Two deliberate choices follow from that:

**No green.** "Football → pitch green" is the reflex, and the app was built on it —
a green page, green borders, green text, green buttons. When the theme is green,
green can't *mean* anything. Here the ground is warm graphite and green is demoted
to a single job: available / connected / yours.

**Gazzetta pink for action.** Italian fantacalcio runs on the *listone* — the dense
price list printed on Gazzetta dello Sport's pink newsprint. That pink is the
native colour of Italian football statistics to exactly this audience, it is
unmistakably a *do-this* signal against warm graphite, and it is the opposite of
the football-green reflex. It appears only as a fill, only on the primary action.

## Colour

Every text token clears **WCAG AA (4.5:1)** on every surface it is allowed to
appear on. Verified numerically, not by eye.

### Surfaces
| Token | Value | Use |
|---|---|---|
| `ground` | `#100f0d` | page, sticky bars, input wells |
| `surface` | `#1a1815` | panels |
| `surface-2` | `#24211d` | inset content, table headers, selected row |
| `surface-3` | `#302c27` | hover |
| `line` | `#3a352f` | hairline borders, table rules |
| `line-strong` | `#4d463e` | control borders, scrollbar, faint placeholders |

### Ink
| Token | Value | Min contrast (on `surface-3`, the worst case) |
|---|---|---|
| `ink` | `#f2ede6` | 11.90:1 |
| `ink-2` | `#bcb3a6` | 6.69:1 |
| `ink-3` | `#a1978a` | 4.82:1 |

### Semantic — each colour means exactly one thing
| Token | Value | Means | Form |
|---|---|---|---|
| `live` | `#e8536c` | the primary action | **fill only** (`#f06a80` hover, `#d33e57` active) |
| `warn` | `#e8a33d` | attention: closing timer, admin, target star | text / border |
| `free` | `#6fbe92` | available · connected · yours | text / 1.5px dot |
| `danger` | `#e5806f` | destructive | **outline only, never a fill** |

`live` is always a fill and `danger` is always an outline, so the two reds can
never be confused at a glance — which matters when "Offri" and "Reset asta" sit on
the same screen. `live` as *text* is only permitted on `ground` / `surface`
(4.96:1); on `surface-2` it falls to 4.49:1 and is not used.

### Categorical — player roles
`role-P #dfae4d` · `role-D #7fb0e6` · `role-C #6fbe92` · `role-A #ee8270`

Rendered **only as outlined chips** (border + text), never filled, so a role marker
is formally distinct from the filled action colour. All clear 5.3:1 on every surface.

### Sequential — stat heat map
A single-hue blue ramp, six steps (`#184f95 → #cde2fb`), in `StatHeatmap.jsx`.
Blue is the one hue with no semantic job in this app, which is exactly why the
ranking scale gets it. Monotone in lightness, each step paired with the ink that
reaches ≥4.5:1 on it, dark end still separating from `surface-2` at 1.98:1.
Colour is a *secondary* encoding — the real value is always printed on the tile.

`scrim` is `rgba(9,8,7,0.8)`. There is no pure black and no pure white in the app.

## Type

Three faces, one job each — a display/body/data pairing, not one font doing
everything:

- **Archivo** — display: wordmark, player names, headings. A grotesque with
  broadcast-scoreboard sturdiness.
- **IBM Plex Sans** — body and UI. Built for dense technical interfaces.
- **IBM Plex Mono** — every number (`.num`). Same superfamily as the body face, so
  budgets and bids share metrics and align. `font-variant-numeric: tabular-nums`
  is set globally so digits don't jitter as the timer ticks.

### Scale — every step, with its line-height
| Step | Size / LH | Use |
|---|---|---|
| `2xs` | 11px / 1.45 | labels, table headers, micro-meta (**floor — nothing smaller**) |
| `xs` | 13px / 1.5 | secondary meta, chips, bid bar |
| `sm` | 14px / 1.55 | table body, controls, buttons |
| `base` | 16px / 1.6 | prose |
| `md` | 19px / 1.4 | modal titles, section headings |
| `lg` | 24px / 1.3 | page headings |
| `xl` | 32px / 1.15 | player name on the block |
| `2xl` | 46px / 1.02 | current bid, countdown — the two numbers that decide the room |

Body line-height never drops below 1.5. Prose is capped with `max-w-prose`.

Section labels use `.label` — 11px, semibold, `ink-3`. Weight and colour do the
work; **no uppercase, no wide tracking.**

## Shape, depth, motion

**Radius: `3px`. One value.** The only exception is `rounded-full`, for things that
are actually circles (avatars, status dots).

**Depth:** a tone step *or* a hairline — never both plus a shadow. `.panel` is
`surface` + hairline; nested content is `.panel-inset`, which is a tone step with
**no border**, so cards never sprout borders inside borders. There is exactly one
shadow in the system, `shadow-overlay`, and it is only for things that genuinely
float: modals and the search dropdown. No `backdrop-blur` — sticky bars are opaque
`ground`, which reads better anyway.

**Motion:** colour transitions only, 75–100ms, on `color`/`background`/`border`.
Nothing pulses, bounces, marquees, or scales on hover.

**Focus:** every `.btn` has a visible `focus-visible` ring in `live` with a 2px
`ground` offset. The app previously had no focus styles at all.

## Spacing rhythm

Eight steps, in Tailwind units: **0.5 · 1 · 2 · 3 · 4 · 6 · 9 · 14**
(2 · 4 · 8 · 12 · 16 · 24 · 36 · 56 px). Related, varied, not one value repeated.
Container padding is never below `2` (8px); panels use `4`–`5`.

## Component classes

Defined in `src/index.css`. Reach for these before writing utility soup — a
one-off cluster of utilities that re-implements one of these is drift.

| Class | Purpose |
|---|---|
| `.panel` | a surface with a hairline |
| `.panel-inset` | nested content: tone step, no border |
| `.label` | section / field label |
| `.num` | any number |
| `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-danger` / `.btn-quiet` / `.btn-sm` | all buttons |
| `.field` + `.field-sm` | all inputs and selects |
| `.chip` | tags, notes, source pills |
| `.tbl` + `.tbl-rows` | the two data tables |

## Craft floor

Non-negotiable, and all checkable:

- Contrast ≥ 4.5:1 body, ≥ 3:1 large. No exceptions in the palette above.
- No text below 11px; body 14–16px.
- Body line-height 1.5–1.7; prose ≤ ~80 characters.
- Container padding ≥ 8px; body text never flush to the viewport edge.
- No justified text, no all-caps passages, no skipped heading levels.
- Nothing clipped, nothing overflowing the body horizontally, no console errors.
