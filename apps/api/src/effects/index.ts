import { registerCelebrityEffect } from "./celebrity.js";
import { registerCustomTextEffect } from "./custom-text.js";
import { registerLocationEffect } from "./location.js";

export function registerBuiltInServerEffects() {
  registerLocationEffect();
  registerCelebrityEffect();
  registerCustomTextEffect();
}

export { serverEffects } from "./contracts.js";
