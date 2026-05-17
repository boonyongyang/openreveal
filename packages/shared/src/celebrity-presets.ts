export const CELEBRITY_PRESET_LICENSE = "factual-name-only";

export interface CelebrityPreset {
  id: string;
  name: string;
  subtitle: string;
  sourceLabel: string;
  license: typeof CELEBRITY_PRESET_LICENSE;
  licenseNote: string;
}

export const celebrityPresets = [
  {
    id: "michelle-yeoh",
    name: "Michelle Yeoh",
    subtitle: "Actor",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  },
  {
    id: "taylor-swift",
    name: "Taylor Swift",
    subtitle: "Musician",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  },
  {
    id: "dwayne-johnson",
    name: "Dwayne Johnson",
    subtitle: "Actor",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  },
  {
    id: "adele",
    name: "Adele",
    subtitle: "Musician",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  },
  {
    id: "keanu-reeves",
    name: "Keanu Reeves",
    subtitle: "Actor",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  },
  {
    id: "beyonce",
    name: "Beyonce",
    subtitle: "Musician",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  },
  {
    id: "tom-cruise",
    name: "Tom Cruise",
    subtitle: "Actor",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  },
  {
    id: "rihanna",
    name: "Rihanna",
    subtitle: "Musician",
    sourceLabel: "OpenReveal manual curation",
    license: CELEBRITY_PRESET_LICENSE,
    licenseNote: "Factual name-only preset with original category text; no biography, image, or third-party copy bundled."
  }
] as const satisfies readonly CelebrityPreset[];
