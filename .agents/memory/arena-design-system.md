---
name: ARENA/HYROX design system (Viber)
description: How the ARENA restyle tokens are wired and the foundation-vs-subagent class pitfall
---

# ARENA design system wiring

The Viber site uses an ARENA/HYROX "fitness-racing" theme. Tokens live in `client/src/index.css`
(`--ink-900..--ink-000` cool near-black ramp, `--accent` volt-yellow via oklch, `--pos/--neg/--warn`),
mapped to Tailwind in `tailwind.config.ts` and to shadcn CSS vars in index.css `:root`.

**Key split (do not collapse):**
- shadcn `accent` is mapped to `--accent-shadcn` (a DARK ink-800 hover surface), NOT the bright accent.
- The bright volt accent is `primary` / `.btn-primary` / `var(--accent)`. Use `text-primary`/`bg-primary`
  for the yellow, never `text-accent`/`bg-accent` (those are shadcn's subtle hover surface used by ui/ primitives).

**Why:** ARENA semantics say "accent = bright", but shadcn primitives expect "accent = subtle surface".
Keeping shadcn `accent` dark lets dropdown/menu hovers stay correct while pages use `primary` for the highlight.

# Pitfall: foundation must define every utility BEFORE subagents use them

When a restyle is fan-out across file-partitioned DESIGN subagents, they freely emit utility classes
(`text-ink-300`, `bg-pos/10`, `btn-sm`, `btn-lg`, `body-l`, custom `.arena-wrap/.arena-grid/.arena-stack`,
`duration-400`) that Tailwind/CSS silently drops if undefined — the page still renders, just wrong/flat, so
it's invisible without an architect pass or a grep audit.

**How to apply:** after any token-driven fan-out restyle, grep used classes against what's actually defined
in `tailwind.config.ts` + index.css. Define the full `ink` scale + `pos/neg/warn` as real Tailwind colors
(hex, so `/opacity` modifiers work) and add any `.btn-sm/.btn-lg/.body-l/.arena-*` component utilities.
`duration-400` is not a default Tailwind step — use `duration-[400ms]`.
