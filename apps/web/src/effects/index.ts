import { registerCelebrityWebEffect } from "./celebrity.js";
import { registerCustomTextWebEffect } from "./custom-text.js";
import { registerLocationWebEffect } from "./location.js";

export function registerBuiltInWebEffects() {
  registerLocationWebEffect();
  registerCelebrityWebEffect();
  registerCustomTextWebEffect();
}

export { webEffects } from "./contracts.js";
