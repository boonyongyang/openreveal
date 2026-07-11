# OpenReveal Design System

## Visual Theme

OpenReveal is a live stage cue rendered for the web. The public landing uses a committed plum-black, paper-lilac, and signal-coral palette to create a sense of anticipation. The performer console feels like an illuminated control deck in a dim venue. The spectator surface is deliberately brand-free and almost silent.

## Color

Use OKLCH tokens. Do not use pure black, pure white, gradient text, or default blue SaaS accents.

| Role | Token direction | Use |
| --- | --- | --- |
| Night | deep plum-black | performer background, landing hero |
| Paper | cool paper-lilac | public reading surfaces |
| Signal | high-contrast coral | primary actions, live moments, focus |
| Aurora | pale orchid | supporting highlights and soft gradients |
| Live | green-teal | connected and delivered status only |
| Warning | warm amber | preparation and pending state |

## Typography

Use a deliberately humanist system sans stack: `Avenir Next`, `Segoe UI`, `Helvetica Neue`, then system fallbacks. The voice comes from weight, spacing, and scale rather than a novelty display font.

- Public headings: tight but readable, fluid `clamp()` scale, strong line-length control.
- Product headings: fixed rem scale for predictable density.
- Body text: 16px minimum, 1.5 to 1.65 line height, 65ch maximum measure.
- Labels: short, letter-spaced, sentence case or restrained uppercase.
- Codes and status: tabular numerals.

## Layout

- Public landing: asymmetric, image-led narrative with a visible sequence from session to reveal.
- Performer console: two-column control deck on desktop; single logical stream on mobile.
- Spectator: one centered action or one quiet waiting surface. No navigation.
- Avoid nested cards. Use panels only where they group a live task or state.

## Components

- Primary action: solid signal-coral fill with dark ink, explicit verb label.
- Quiet action: transparent surface with a precise border.
- Status: compact pill plus a color-independent label.
- Inputs: visible labels, high contrast, 44px minimum touch size.
- Session code: large, grouped, tabular numerals with deliberate tracking.

## Motion

- Use `cubic-bezier(0.16, 1, 0.3, 1)` for entrances and emphasis.
- Keep feedback below 180ms; page atmosphere below 700ms.
- Animate opacity, transforms, and bounded filters only.
- Respect `prefers-reduced-motion` by disabling non-essential movement.

## Route Intent

| Route | Tone | Goal |
| --- | --- | --- |
| `/about` | expressive, explanatory | explain and invite performers |
| `/console` | dark, precise, operational | create and control a live session |
| `/` and `/j` | minimal, neutral | join with a session code |
| `/r/:code` | brand-free, quiet | wait and receive a reveal |
| `/privacy`, `/report` | direct, legible | explain the safety boundary |
