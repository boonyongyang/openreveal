# Routine Pack Licensing

Routine packs are future collections of presets, scripts, reveal templates, or assets. They are separate from the AGPL-3.0 source-code license unless explicitly stated.

Local preset import/export uses the versioned JSON shape documented in [preset-format.md](preset-format.md). These files are still content artifacts: keep text original or licensed, and do not include protected UI copy or unlicensed assets.

## What Can Ship By Default

Allowed without extra review:

- Original text written for OpenReveal.
- Manually entered local presets with no copied descriptions.
- Official deep links generated from performer input.
- Public-domain or permissively licensed assets with clear attribution.

Not allowed without review:

- Celebrity or venue photos scraped from the web.
- Copied search result layouts or snippets.
- Third-party logos, marks, icons, or product names used as UI branding.
- Licensed routine text from commercial magic products.
- User-uploaded assets without storage, moderation, and takedown rules.

## Required Metadata

Every preset or asset pack should include:

```json
{
  "id": "example-pack",
  "name": "Example Pack",
  "author": "Author Name",
  "license": "CC-BY-4.0",
  "sourceUrl": "https://example.com/source",
  "notes": "Original text. No third-party images."
}
```

For individual items, include source metadata when the content is derived from third-party data.

## Review Checklist

- [ ] Is every text field original or clearly licensed?
- [ ] Are all assets licensed for redistribution?
- [ ] Is attribution included where required?
- [ ] Does the pack avoid third-party UI cloning?
- [ ] Does the pack avoid protected product names in product-facing UI?
- [ ] Does the pack avoid collecting private spectator data?
- [ ] Is the license compatible with open-source distribution?
- [ ] Is there a takedown path for hosted instances?

## Recommended Licenses

For original routine-pack content:

- CC0 for public-domain style sample data.
- CC-BY-4.0 when attribution should be preserved.
- AGPL-3.0-only only when the pack is code and intended to follow the source license.

Avoid ambiguous labels such as "free to use" without a real license.

## Celebrity Presets

Text-only celebrity names are acceptable as user-entered or simple preset labels. The bundled v1 celebrity presets are factual name-only labels with original category text and explicit `factual-name-only` metadata in shared code. Do not ship celebrity images in v1. If future packs add source URLs or richer metadata, prefer authoritative public profiles and keep descriptions original.

## Image Reveals

Image reveals remain out of scope until the project has:

- upload/storage rules
- asset license metadata
- size/type validation
- moderation or takedown process for hosted instances
- privacy notes for uploaded media
