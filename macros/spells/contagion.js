const lastArg = args[args.length - 1];
const tokenOrActor = await fromUuid(lastArg.actorUuid);
const targetActor = tokenOrActor.actor ? tokenOrActor.actor : tokenOrActor;

const DAEItem = lastArg.efData.flags.dae.itemData;
const saveData = DAEItem.data.save;

function effectAppliedAndActive(conditionName) {
  return targetActor.data.effects.some(
    (activeEffect) =>
      activeEffect?.data?.flags?.isConvenient &&
      activeEffect?.data?.label == conditionName &&
      !activeEffect?.data?.disabled
  );
}

/**
 * Generates the GM client dialog for selecting final Effect, updates target effect with name, icon and new DAE effects.
 */
async function applyContagion() {
  if (effectAppliedAndActive("Poisoned", targetActor))
    game.dfreds.effectInterface.removeEffect({ effectName: "Poisoned", uuid: targetActor.uuid });

  new Dialog({
    title: "Contagion options",
    content: "<p>Select the effect</p>",
    buttons: {
      one: {
        blinding: "Blinding Sickness",
        callback: async () => {
          let data = {
            changes: [
              {
                key: "flags.midi-qol.disadvantage.ability.check.wis",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.ability.save.wis",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
            ],
            icon: "modules/dfreds-convenient-effects/images/blinded.svg",
            label: "Blinding Sickness",
            _id: lastArg.effectId,
          };
          targetActor.updateEmbeddedDocuments("ActiveEffect", [data]);
        },
      },
      filth: {
        label: "Filth Fever",
        callback: async () => {
          let data = {
            changes: [
              {
                key: "flags.midi-qol.disadvantage.attack.mwak",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.attack.rwak",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.ability.check.str",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.ability.save.str",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
            ],
            label: "Filth Fever",
            _id: lastArg.effectId,
          };
          targetActor.updateEmbeddedDocuments("ActiveEffect", [data]);
        },
      },
      flesh: {
        label: "Flesh Rot",
        callback: async () => {
          let data = {
            changes: [
              {
                key: "flags.midi-qol.disadvantage.ability.check.cha",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "data.traits.dv.all",
                mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
                priority: 20,
                value: "1",
              },
            ],
            icon: "systems/dnd5e/icons/skills/blood_09.jpg",
            label: "Flesh Rot",
            _id: lastArg.effectId,
          };
          targetActor.updateEmbeddedDocuments("ActiveEffect", [data]);
        },
      },
      mindfire: {
        label: "Mindfire",
        callback: async () => {
          let data = {
            changes: [
              {
                key: "flags.midi-qol.disadvantage.ability.check.int",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.ability.save.int",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
            ],
            icon: "icons/svg/daze.svg",
            label: "Mindfire",
            _id: lastArg.effectId,
          };
          targetActor.updateEmbeddedDocuments("ActiveEffect", [data]);
        },
      },
      seizure: {
        label: "Seizure",
        callback: async () => {
          let data = {
            changes: [
              {
                key: "flags.midi-qol.disadvantage.attack.mwak",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.attack.rwak",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.ability.check.dex",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.ability.save.dex",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
            ],
            icon: "icons/svg/paralysis.svg",
            label: "Seizure",
            _id: lastArg.effectId,
          };
          targetActor.updateEmbeddedDocuments("ActiveEffect", [data]);
        },
      },
      slimy: {
        label: "Slimy Doom",
        callback: async () => {
          let data = {
            changes: [
              {
                key: "flags.midi-qol.disadvantage.ability.check.con",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
              {
                key: "flags.midi-qol.disadvantage.ability.save.con",
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                priority: 20,
                value: "1",
              },
            ],
            icon: "systems/dnd5e/icons/skills/blood_05.jpg",
            label: "Slimy Doom",
            _id: lastArg.effecId,
          };
          targetActor.updateEmbeddedDocuments("ActiveEffect", [data]);
        },
      },
    },
  }).render(true);
}

/**
 * Execute contagion effects, update flag counts or remove effect
 *
 * @param {Actor5e} combatant Current combatant to test against
 * @param {Number} save Target DC for save
 */
async function contagionSave() {
  const flag = DAE.getFlag(targetActor, "ContagionSpell");
  const flavor = `${CONFIG.DND5E.abilities["con"]} DC${saveData.dc} ${DAEItem?.name || ""}`;
  const saveRoll = await targetActor.rollAbilitySave("con", { flavor });

  if (saveRoll.total < saveData.dc) {
    if (flag.count === 2) {
      ChatMessage.create({ content: `Contagion on ${targetActor.name} is complete` });
      applyContagion();
    } else {
      const contagionCount = flag.count + 1;
      DAE.setFlag(targetActor, "ContagionSpell", { count: contagionCount });
      console.log(`Contagion increased to ${contagionCount}`);
    }
  } else if (saveRoll.total >= saveData.dc) {
    targetActor.deleteEmbeddedDocuments("ActiveEffect", [lastArg.effectId]);
  }
}

if (args[0] === "on") {
  // Save the hook data for later access.
  DAE.setFlag(targetActor, "ContagionSpell", { count: 0 });
}

if (args[0] === "off") {
  // When off, clean up hooks and flags.
  DAE.unsetFlag(targetActor, "ContagionSpell");
}

if (args[0] === "each") {
  let contagion = lastArg.efData;
  if (contagion.label === "Contagion") contagionSave();
}
