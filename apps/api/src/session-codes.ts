import { randomInt } from "node:crypto";

import { SESSION_CODE_ALPHABET, SESSION_CODE_LENGTH } from "@openreveal/shared";

export function createSessionCode() {
  let code = "";
  for (let index = 0; index < SESSION_CODE_LENGTH; index += 1) {
    code += SESSION_CODE_ALPHABET.charAt(randomInt(SESSION_CODE_ALPHABET.length));
  }
  return code;
}
