import { baseSpellEffect, generateMacroChange, generateMacroFlags } from "../specialSpells.js";

export function enhanceAbilityEffect(document) {
  let effect = baseSpellEffect(document, document.name);
  // MACRO START
  const itemMacroText = `
if (!game.modules.get("advanced-macros")?.active) {
  ui.notifications.error("Please enable the Advanced Macros module");
  return;
}

const lastArg = args[args.length - 1];
const tokenOrActor = await fromUuid(lastArg.actorUuid);
const targetActor = tokenOrActor.actor ? tokenOrActor.actor : tokenOrActor;

async function updateActor(kind) {
  DAE.setFlag(targetActor, 'enhanceAbility', { name: kind });
  const effect = targetActor.effects.find((e) => e.data.label === lastArg.efData.label);
  let changes = [];
  switch (kind) {
    case "bear": {
      changes = [{
        key: "flags.midi-qol.advantage.ability.save.con",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        priority: 20,
        value: "1",
      }];
      ChatMessage.create({ content: \`\${targetActor.name} has advantage on Constitution checks\` });
      const amount = await new Roll("2d6").evaluate({ async: true });
      if (
        !Number.isInteger(targetActor.data.data.attributes.hp.temp) ||
        amount.total > targetActor.data.data.attributes.hp.temp
      ) {
        console.log(\`\${targetActor.name} gains \${amount.total} temp Hp\`, amount);
        ChatMessage.create({ content: \`\${targetActor.name} gains \${amount.total} temp Hp\` });
        await targetActor.update({ "data.attributes.hp.temp": amount.total });
      }
      break;
    }
    case "bull": {
      changes = [{
        key: "flags.dnd5e.powerfulBuild",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        priority: 20,
        value: "1",
      },
      {
        key: "flags.midi-qol.advantage.ability.check.str",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        priority: 20,
        value: "1",
      }];
      ChatMessage.create({ content: \`\${targetActor.name}'s encumbrance is doubled\` });
      ChatMessage.create({ content: \`\${targetActor.name} has advantage on Strength checks\` });
      break;
    }
    case "cat": {
      changes = [{
        key: "flags.midi-qol.advantage.ability.check.dex",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        priority: 20,
        value: "1",
      }];
      ChatMessage.create({
        content: \`\${targetActor.name} doesn't take damage from falling 20 feet or less if it isn't incapacitated.\`,
      });
      ChatMessage.create({ content: \`\${targetActor.name} has advantage on Dexterity checks\` });
      break;
    }
    case "eagle": {
      changes = [{
        key: "flags.midi-qol.advantage.ability.check.cha",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        priority: 20,
        value: "1",
      }];
      ChatMessage.create({ content: \`\${targetActor.name} has advantage on Charisma checks\` });
      break;
    }
    case "fox": {
      changes = [{
        key: "flags.midi-qol.advantage.ability.check.int",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        priority: 20,
        value: "1",
      }];
      ChatMessage.create({ content: \`\${targetActor.name} has advantage on Intelligence checks\` });
      break;
    }
    case "owl": {
      changes = [{
        key: "flags.midi-qol.advantage.ability.check.wis",
        mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
        priority: 20,
        value: "1",
      }];
      ChatMessage.create({ content: \`\${targetActor.name} has advantage on Wisdom checks\` });
      break;
    }
  }
  if (changes.length > 0) {
    console.log(\`Applying \${kind} changes to \${targetActor.name}\`, changes);
    await effect.update({ changes: changes.concat(effect.data.changes) });
  }

}

/**
 * For each target select the effect (GM selection)
 */
if (args[0] === "on") {
  new Dialog({
    title: "Choose Enhance Ability option for " + targetActor.name,
    content: "<p>Choose option</p>",
    buttons: {
      one: {
        label: "Bear's Endurance",
        callback: async () => await updateActor("bear"),
      },
      two: {
        label: "Bull's Strength",
        callback: async () => await updateActor("bull"),
      },
      three: {
        label: "Cat's Grace",
        callback: async () => await updateActor("cat"),
      },
      four: {
        label: "Eagle's Splendor",
        callback: async () => await updateActor("eagle"),
      },
      five: {
        label: "Fox's Cunning",
        callback: async () => await updateActor("fox"),
      },
      six: {
        label: "Owl's Wisdom",
        callback: async () => await updateActor("owl"),
      },
    },
  }).render(true);
}

if (args[0] === "off") {
  const flag = await DAE.getFlag(targetActor, 'enhanceAbility');
  if (flag.name === "bear") {
    await targetActor.update({ "data.attributes.hp.temp": "" });
    await DAE.unsetFlag(targetActor, "eyebiteSpell");
  }
  ChatMessage.create({ content: "Enhance Ability has expired" });
}
`;
  // MACRO STOP
  document.flags["itemacro"] = generateMacroFlags(document, itemMacroText);
  effect.changes.push(generateMacroChange(""));
  document.effects.push(effect);

  return document;
}
