# Local Preset Format

OpenReveal local presets are JSON files exported from the performer console. They are browser-local handoff files, not backend accounts or hosted routine packs.

## File Shape

```json
{
  "schema": "openreveal.effect-preset.v1",
  "kind": "custom_text",
  "label": "Imported prediction",
  "input": {
    "body": "Imported from a JSON preset."
  }
}
```

## Fields

- `schema`: must be `openreveal.effect-preset.v1`.
- `kind`: must match a registered effect kind.
- `label`: optional human-readable label.
- `input`: performer form values for the effect. The server still validates these values when the performer arms the reveal.

## Boundaries

- Presets do not store spectator data.
- Presets do not bypass server-side validation.
- Presets should contain original text or clearly licensed content.
- Presets should not include third-party UI copy, protected branding, or external assets unless the license is documented.
