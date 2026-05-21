# Agent RWA Vault — Design System

> Reference inspiration: [crotafi.org/dashboard/rwa](https://crotafi.org/dashboard/rwa).
> Adapted for our scope: ERC-4626 vault + autonomous TS agent rebalancer on Base Sepolia.
> Aesthetic: **technical, restrained, institutional** — engineering console / compliance terminal.

---

## 1. Brand identity

- **Product code**: `F-001 · unaudited demo`
- **Codename**: `agent · vault`
- **Voice**: lowercase functional labels (`registry`, `allocations`, `activity`, `intent log`).
- **Tone**: lab / ops / control room. No marketing language.

## 2. Color tokens (light mode primary)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F7F6F1` | Page background (warm off-white) |
| `--bg-elevated` | `#FAFAF7` | Sidebar, footer status bar |
| `--surface` | `#FFFFFF` | Card surface |
| `--surface-muted` | `#FBFAF6` | Inner panels, input wells |
| `--border` | `#D8D6CC` | Card borders, dividers |
| `--border-strong` | `#000000` | Selected row, active button |
| `--text` | `#050505` | Primary text |
| `--text-muted` | `#5F666A` | Secondary text |
| `--text-subtle` | `#8A8A82` | Tertiary text, slugs, microcopy |
| `--accent` | `#B6F42C` | Lime — brand highlight, "live" pip, status enabled bar |
| `--danger` | `#B23A2F` | Blocked, paused, error |
| `--warning` | `#B77B1E` | Medium risk, expired |
| `--info` | `#1E5BB7` | Pending tx, wagmi connected |
| `--success` | `#2F8C4A` | Success tx, allocation hit target |
| `--risk-low` | `#A86A12` | Risk badge text |
| `--risk-med` | `#B77B1E` | Risk badge text |
| `--risk-high` | `#B23A2F` | Risk badge text |

Dark mode is **out of scope for v0** to keep velocity. Tokens are CSS variables so dark mode is a one-file flip later.

## 3. Typography

- **Sans**: `Inter` via `next/font/google` (var: `--font-sans`)
- **Mono**: `JetBrains Mono` via `next/font/google` (var: `--font-mono`) — for addresses, hashes, bps, deadline epoch, intent slugs

| Role | Size | Weight | Tracking | Case |
|---|---|---|---|---|
| Hero | 40 / 48 px | 700 | -0.02em | lowercase |
| Section heading (h2 / card title) | 16 px | 500 | normal | lowercase |
| Microlabel | 11 px | 500 | 0.08em | UPPERCASE |
| Body | 14 px | 400 | normal | sentence |
| Stat value | 22 px | 600 | -0.01em | mono if numeric |
| Slug / address | 12 px | 400 | normal | mono |

## 4. Spacing & radius

- Base unit: `4px`. Tokens: `xs=4 sm=8 md=12 lg=16 xl=24 2xl=32 3xl=48`
- Card padding: `lg` outer, `md` inner rows
- Border radius: `4px` for badges, `6px` for buttons/inputs, `8px` for cards
- Borders: always `1px solid var(--border)`. No drop shadows (or subtle `0 1px 0 rgba(0,0,0,0.02)` only).

## 5. Layout

- **Sidebar** fixed-width `224px`. Collapses on `<lg` to a top hamburger.
- **Content** max-width `1280px`, padding `24px`.
- **KPI strip** above hero: 3 mini cards in a row.
- **Main grid** below: `grid-cols-1 lg:grid-cols-3` with cards spanning 1 or 2 columns.
- **Footer ops strip** sticky at bottom of content (not fixed to viewport): 4-up mini metrics.

## 6. Components

### Card

```
┌──────────────────────────────────┐
│ [icon] heading           [BADGE] │
├──────────────────────────────────┤
│ content                          │
└──────────────────────────────────┘
```

- 1px border, 8px radius, white surface, lg padding
- Decorative `+` glyphs at the four corners (≈8px from edge, `text-subtle`, 10px size)
- Header row: 16px lucide icon (1.5 stroke) left of lowercase title, status badge right, thin divider below header

### Badge

- Square-ish radius `4px`, padding `4px 8px`, 11px UPPERCASE 0.08em, `1px solid` matching color, transparent fill.
- Variants: `enabled` (text + border accent green), `blocked` (danger red), `empty` / `fresh` / `ready` (subtle gray), `low` / `medium` / `high` (risk colors).

### Button

- Primary: black fill `#000`, white text, 6px radius, 40-44px height, optional left icon.
- Secondary: white fill, 1px border, black text. Active state = black fill.
- Tertiary / ghost: text only, no border, hover surface-muted.

### Input

- 40px height, 1px border, 6px radius, surface-muted bg on focus, mono font for amounts.
- Numeric inputs: tabular figures, suffix label (`USDC`, `bps`).

### Sidebar nav item

- 32px row height, 12px left padding, 14px lucide icon + 14px label.
- Active: black left bar `2px` + bold text. Inactive: muted text.

## 7. Page: `/` (dashboard root, no landing)

```
┌─ sidebar ─────────────┬─────────────────────────────────────────────┐
│ crota-style header    │  ← back   F-001 · UNAUDITED DEMO            │
│ • Overview (active)   │  agent rwa vault                            │
│ • Vault               │  ┌── tvl ─┐ ┌── shares ─┐ ┌── agent ──┐    │
│ • Allocations         │  │ 2,340  │ │ 2,340     │ │ heartbeat │    │
│ • Activity            │  │ USDC   │ │ shares    │ │  4m ago   │    │
│ • Strategy            │  └────────┘ └───────────┘ └───────────┘    │
│ • Settings            │  ┌─ deposit ─┐ ┌─ withdraw ──┐ ┌─ alloc ─┐ │
│                       │  │ form      │ │ form        │ │ donut + │ │
│                       │  │           │ │             │ │ rows    │ │
│                       │  └───────────┘ └─────────────┘ └─────────┘ │
│                       │  ┌─ activity feed ─────┐ ┌─ intent log ──┐ │
│                       │  │ list of decisions   │ │ next nonce,   │ │
│                       │  │                     │ │ deadline, hash│ │
│                       │  └─────────────────────┘ └───────────────┘ │
│                       │  ┌─ ops strip ───────────────────────────┐ │
│                       │  │ vault │ agent │ network │ last tx     │ │
│                       │  └───────────────────────────────────────┘ │
│ wallet connect button │                                             │
│ settings link         │                                             │
└───────────────────────┴─────────────────────────────────────────────┘
```

Cards (3-col grid on `lg`):
1. **deposit** — USDC amount input + Approve→Deposit primary
2. **withdraw** — share-or-asset toggle + Withdraw primary
3. **allocations** — donut + per-asset bps rows + agent target (read-only, agent owns this)
4. **activity feed** — last 20 agent decisions (nonce, ts, status, basescan link)
5. **intent log** — next nonce, current intent hash, deadline countdown
6. **safety** — pause status, emergency withdraw (owner-only, hidden if not owner)

Footer ops strip: 4 mini metric cards — vault status, agent heartbeat, network (`base-sepolia`), latest rebalance tx.

## 8. Tech & libraries

- **Tailwind CSS v4** (CSS-first config) with custom theme tokens.
- **next/font/google** for Inter + JetBrains Mono.
- **lucide-react** for icons (matches the line-icon look).
- **recharts** for the allocation donut. Avoid ApexCharts/Plotly — too heavy.
- Optional: **shadcn/ui** primitives (Button, Input, Tooltip) — only the ones we use, copied into `web/components/ui/`.

## 9. Routes

- `/` → dashboard (no landing). User said: landing is built separately later.
- `/api/decisions` → already exists.

## 10. Out of scope for v0

- Dark mode (tokens prepared, flip later).
- Mobile hamburger nav (sidebar will hide below `lg` and a top bar with logo + connect appears — minimum viable).
- Real charts library — donut only.
- Animations beyond 150ms hover/press transitions.

## 11. Anti-patterns to avoid

- Emoji icons (we use lucide).
- Drop shadows (border + flat surface only).
- Marketing copy (always functional / lowercase / status-driven).
- Mixing pill (`rounded-full`) and rectangle (`rounded`) badges — pick one and stay consistent (we pick `rounded-[4px]`).
- Color as the only signal (always pair color with icon or label).
