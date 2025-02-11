import { generateATLChange } from "../effects.js";
import { baseSpellEffect, spellEffectModules } from "../specialSpells.js";
import { loadMacroFile, generateMacroChange, generateItemMacroFlag } from "../macros.js";

export async function crownofStarsEffect(document) {
  let effect = baseSpellEffect(document, document.name);

  if (spellEffectModules().atlInstalled) {
    effect.changes.push(generateATLChange("ATL.dimLight", CONST.ACTIVE_EFFECT_MODES.UPGRADE, '60'));
    effect.changes.push(generateATLChange("ATL.brightLight", CONST.ACTIVE_EFFECT_MODES.UPGRADE, '30'));
  }
  setProperty(effect, "flags.dae.selfTarget", true);

  const itemMacroText = await loadMacroFile("spell", "crownofStars.js");
  document.flags["itemacro"] = generateItemMacroFlag(document, itemMacroText);
  effect.changes.push(generateMacroChange("@spellLevel"));
  document.data.damage = { parts: [], versatile: "", value: "" };
  document.data['target']['type'] = "self";
  document.data.range = { value: null, units: "self", long: null };
  document.data.actionType = "other";
  document.effects.push(effect);

  return document;
}
