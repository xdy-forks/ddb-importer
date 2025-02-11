import { baseSpellEffect } from "../specialSpells.js";

export function frostbiteEffect(document) {
  let effect = baseSpellEffect(document, document.name);
  effect.changes.push(
    { key: "flags.midi-qol.disadvantage.attack.mwak", value: "1", mode: CONST.ACTIVE_EFFECT_MODES.ADD, priority: 50 },
    { key: "flags.midi-qol.disadvantage.attack.rwak", value: "1", mode: CONST.ACTIVE_EFFECT_MODES.ADD, priority: 50 },
  );
  setProperty(effect, "duration.turns", 1);
  setProperty(effect, "flags.dae.specialDuration", ["1Attack:rwak", "1Attack:mwak"]);
  document.effects.push(effect);

  return document;
}
