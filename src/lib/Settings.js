import { DirectoryPicker } from "./DirectoryPicker.js";
import { setPatreonTier, getPatreonTiers, BAD_DIRS, getPatreonValidity, getCampaignId } from "../muncher/utils.js";
import DDBMuncher from "../muncher/ddb.js";
import { getCobalt, setCobalt, moveCobaltToLocal, moveCobaltToSettings, checkCobalt } from "./Secrets.js";
import logger from "../logger.js";
import SETTINGS from "../settings.js";

const POPUPS = {
  json: null,
  web: null,
};

function renderPopup(type, url) {
  if (POPUPS[type] && !POPUPS[type].close) {
    POPUPS[type].focus();
    POPUPS[type].location.href = url;
  } else {
    const ratio = window.innerWidth / window.innerHeight;
    const width = Math.round(window.innerWidth * 0.5);
    const height = Math.round(window.innerWidth * 0.5 * ratio);
    POPUPS[type] = window.open(
      url,
      "ddb_sheet_popup",
      `resizeable,scrollbars,location=no,width=${width},height=${height},toolbar=1`
    );
  }
  return true;
}

export function isSetupComplete(needsCobalt = true) {
  const uploadDir = game.settings.get(SETTINGS.MODULE_ID, "image-upload-directory");
  const dataDirSet = !BAD_DIRS.includes(uploadDir);
  const cobalt = getCobalt() != "";
  const setupComplete = dataDirSet && (cobalt || !needsCobalt);
  return setupComplete;
}

async function linkToPatreon() {

  const proxy = game.settings.get(SETTINGS.MODULE_ID, "api-endpoint");
  const patreonId = "oXQUxnRAbV6mq2DXlsXY2uDYQpU-Ea2ds0G_5hIdi0Bou33ZRJgvV8Ub3zsEQcHp";
  const patreonAuthUrl = `${proxy}/patreon/auth`;
  const patreonScopes = encodeURI("identity identity[email]");

  const socketOptions = {
    transports: ['websocket', 'polling', 'flashsocket'],
    // reconnection: false,
    // reconnectionAttempts: 10,
  };
  const socket = io(`${proxy}/`, socketOptions);

  socket.on("connect", () => {
    logger.debug("DDB Muncher socketID", socket.id);
    const serverDetails = {
      id: socket.id,
      world: game.world.data.title,
      userId: game.userId,
    };
    socket.emit("register", serverDetails);

  });

  socket.on('registered', (data) => {
    logger.info(`Foundry instance registered with DDB Muncher Proxy`);
    logger.debug(data);
    renderPopup("web", `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${patreonId}&redirect_uri=${patreonAuthUrl}&state=${data.userHash}&scope=${patreonScopes}`);
  });

  socket.on('auth', (data) => {
    logger.debug(`Response from auth socket!`, data);

    POPUPS["web"].close();

    game.settings.set(SETTINGS.MODULE_ID, "beta-key", data.key);
    game.settings.set(SETTINGS.MODULE_ID, "patreon-user", data.email);
    game.settings.set(SETTINGS.MODULE_ID, "patreon-tier", data.tier);

    $('#ddb-patreon-user').text(data.email);
    $('#ddb-patreon-tier').text(data.tier);
    $('#ddb-patreon-valid').text("True");
    $('#ddb-beta-key').val(data.key);

    socket.disconnect();
  });

  socket.on('error', (data) => {
    logger.error(`Error Response from socket!`, data);
    socket.disconnect();
  });
}

function getDDBCampaigns(cobalt = null) {
  const cobaltCookie = cobalt ? cobalt : getCobalt();
  const parsingApi = game.settings.get(SETTINGS.MODULE_ID, "api-endpoint");
  const betaKey = game.settings.get(SETTINGS.MODULE_ID, "beta-key");
  const body = { cobalt: cobaltCookie, betaKey: betaKey };

  return new Promise((resolve, reject) => {
    fetch(`${parsingApi}/proxy/campaigns`, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body), // body data type must match "Content-Type" header
    })
      .then((response) => response.json())
      .then((data) => resolve(data.data))
      .catch((error) => {
        logger.error(`Cobalt cookie check error`);
        logger.error(error);
        logger.error(error.stack);
        reject(error);
      });
  });

}

async function checkCobaltCookie(value) {
  const cookieStatus = await checkCobalt("", value);
  if (value !== "" && !cookieStatus.success) {
    $('#munching-task-setup').text(`Your Cobalt Cookie is invalid, please check that you pasted the right information.`);
    $('#ddb-importer-settings').css("height", "auto");
    throw new Error(`Your Cobalt Cookie is invalid, please check that you pasted the right information.`);
  }
  return cookieStatus;
}

async function refreshCampaigns(cobalt = null) {
  await checkCobaltCookie(cobalt);
  CONFIG.DDBI.CAMPAIGNS = await getDDBCampaigns(cobalt);
  return CONFIG.DDBI.CAMPAIGNS;
}

export async function getAvailableCampaigns() {
  if (CONFIG.DDBI.CAMPAIGNS) return CONFIG.DDBI.CAMPAIGNS;
  const campaignId = getCampaignId();
  // eslint-disable-next-line require-atomic-updates
  CONFIG.DDBI.CAMPAIGNS = await getDDBCampaigns();

  if (!CONFIG.DDBI.CAMPAIGNS) return [];

  CONFIG.DDBI.CAMPAIGNS.forEach((campaign) => {
    const selected = campaign.id == campaignId;
    campaign.selected = selected;
  });
  return CONFIG.DDBI.CAMPAIGNS;
}

async function setCobaltCookie(value, local) {
  await checkCobaltCookie(value);
  await setCobalt(value);
  await game.settings.set(SETTINGS.MODULE_ID, "cobalt-cookie-local", local);
  const runCookieMigrate = local != game.settings.get(SETTINGS.MODULE_ID, "cobalt-cookie-local");
  if (runCookieMigrate && local) {
    moveCobaltToLocal();
  } else if (runCookieMigrate && !local) {
    moveCobaltToSettings();
  }

}

export class DDBKeyChange extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "ddb-importer-key-change";
    options.template = "modules/ddb-importer/handlebars/key-change.hbs";
    options.width = 500;
    return options;
  }

  get title() { // eslint-disable-line class-methods-use-this
    // improve localisation
    // game.i18n.localize("")
    return "DDB Importer Key Expiry";
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("#patreon-button").click(async (event) => {
      event.preventDefault();
      linkToPatreon();
    });
  }

  /** @override */
  async getData() { // eslint-disable-line class-methods-use-this
    const key = game.settings.get(SETTINGS.MODULE_ID, "beta-key");
    const setupConfig = {
      "beta-key": key,
    };
    const patreonUser = game.settings.get(SETTINGS.MODULE_ID, "patreon-user");
    const check = await getPatreonValidity(key);

    return {
      success: (check && check.success) ? check.success : false,
      message: (check && check.message) ? check.message : "Unable to check patreon key status",
      setupConfig: setupConfig,
      patreonLinked: patreonUser && patreonUser != "",
      patreonUser: patreonUser,
    };
  }

  /** @override */
  // eslint-disable-next-line no-unused-vars
  async _updateObject(event, formData) { // eslint-disable-line class-methods-use-this
    event.preventDefault();
    const currentKey = game.settings.get(SETTINGS.MODULE_ID, "beta-key");
    if (currentKey !== formData['beta-key']) {
      await game.settings.set(SETTINGS.MODULE_ID, "beta-key", formData['beta-key']);
      await setPatreonTier();
    }

    const callMuncher = game.settings.get(SETTINGS.MODULE_ID, "settings-call-muncher");

    if (callMuncher) {
      game.settings.set(SETTINGS.MODULE_ID, "settings-call-muncher", false);
      new DDBMuncher().render(true);
    }

  }
}

export async function isValidKey() {
  let validKey = false;

  const key = game.settings.get(SETTINGS.MODULE_ID, "beta-key");
  if (key === "") {
    validKey = true;
  } else {
    const check = await getPatreonValidity(key);
    if (check.success && check.data) {
      validKey = true;
    } else {
      validKey = false;
      game.settings.set(SETTINGS.MODULE_ID, "settings-call-muncher", true);
      new DDBKeyChange().render(true);
    }
  }
  return validKey;
}

export class DDBCookie extends FormApplication {

  constructor(options, actor = null, localCobalt = false) {
    super(options);
    this.localCobalt = localCobalt;
    this.actor = actor;
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "ddb-importer-cobalt-change";
    options.template = "modules/ddb-importer/handlebars/cobalt.hbs";
    options.width = 500;
    return options;
  }

  get title() { // eslint-disable-line class-methods-use-this
    // improve localisation
    // game.i18n.localize("")
    return "DDB Importer Cobalt Cookie";
  }

  /** @override */
  async getData() {
    const keyPostFix = this.localCobalt && this.actor ? this.actor.id : null;
    const cobalt = getCobalt(keyPostFix);
    const cobaltStatus = cobalt == "" ? { success: true } : await checkCobalt();
    const expired = !cobaltStatus.success;

    return {
      expired: expired,
      cobaltCookie: cobalt,
      localCobalt: this.localCobalt && this.actor,
      actor: this.actor,
    };
  }

  /** @override */
  async _updateObject(event, formData) {
    event.preventDefault();
    const keyPostFix = this.localCobalt && this.actor ? this.actor.id : null;
    await setCobalt(formData['cobalt-cookie'], keyPostFix);

    const cobaltStatus = await checkCobalt();
    if (!cobaltStatus.success) {
      new DDBCookie().render(true);
    } else {
      const callMuncher = game.settings.get(SETTINGS.MODULE_ID, "settings-call-muncher");

      if (callMuncher) {
        game.settings.set(SETTINGS.MODULE_ID, "settings-call-muncher", false);
        new DDBMuncher().render(true);
      }
    }
  }
}


// eslint-disable-next-line no-unused-vars
Hooks.on("renderDDBSetup", (app, html, user) => {
  DirectoryPicker.processHtml(html);
});

// eslint-disable-next-line no-unused-vars
Hooks.on("renderma", (app, html, user) => {
  DirectoryPicker.processHtml(html);
});

export class DDBSetup extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "ddb-importer-settings";
    options.template = "modules/ddb-importer/handlebars/settings.hbs";
    options.width = 500;
    return options;
  }

  get title() { // eslint-disable-line class-methods-use-this
    // improve localisation
    // game.i18n.localize("")
    return "DDB Importer Settings";
  }

  /** @override */
  async getData() { // eslint-disable-line class-methods-use-this
    const cobalt = getCobalt();
    const isCobalt = cobalt != "";
    const cobaltStatus = await checkCobalt("", cobalt);
    const cobaltLocal = game.settings.get(SETTINGS.MODULE_ID, "cobalt-cookie-local");
    const hasKey = game.settings.get(SETTINGS.MODULE_ID, "beta-key") != "";
    const key = game.settings.get(SETTINGS.MODULE_ID, "beta-key");
    const campaignId = getCampaignId();
    const tier = game.settings.get(SETTINGS.MODULE_ID, "patreon-tier");
    const uploadDir = game.settings.get(SETTINGS.MODULE_ID, "image-upload-directory");
    const otherUploadDir = game.settings.get(SETTINGS.MODULE_ID, "other-image-upload-directory");
    const frameUploadDir = game.settings.get(SETTINGS.MODULE_ID, "frame-image-upload-directory");
    const dataDirSet = !BAD_DIRS.includes(uploadDir) && !BAD_DIRS.includes(otherUploadDir);
    const patreonUser = game.settings.get(SETTINGS.MODULE_ID, "patreon-user");
    const validKeyObject = hasKey ? await getPatreonValidity(key) : false;
    const validKey = validKeyObject && validKeyObject.success && validKeyObject.data;
    const availableCampaigns = isCobalt && cobaltStatus.success ? await getAvailableCampaigns() : [];
    const useWebP = game.settings.get(SETTINGS.MODULE_ID, "use-webp");

    availableCampaigns.forEach((campaign) => {
      const selected = campaign.id == campaignId;
      campaign.selected = selected;
    });

    const setupConfig = {
      "image-upload-directory": uploadDir,
      "other-image-upload-directory": otherUploadDir,
      "frame-image-upload-directory": frameUploadDir,
      "cobalt-cookie": cobalt,
      "available-campaigns": availableCampaigns,
      "campaign-id": campaignId,
      "beta-key": key,
    };

    const setupComplete = dataDirSet && isCobalt;

    return {
      cobalt: isCobalt,
      cobaltLocal,
      setupConfig,
      setupComplete,
      tier,
      patreonLinked: patreonUser && patreonUser != "",
      patreonUser,
      validKey,
      useWebP,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("#patreon-button").click(async (event) => {
      event.preventDefault();
      linkToPatreon();
    });
    html.find("#campaign-button").click(async (event) => {
      event.preventDefault();
      const cookie = html.find("#cobalt-cookie-input");
      const campaigns = await refreshCampaigns(cookie[0].value);
      let campaignList = `<option value="">Select campaign:</option>`;
      campaigns.forEach((campaign) => {
        campaignList += `<option value="${campaign.id}">${campaign.name} (${campaign.dmUsername}) - ${campaign.id}</option>\n`;
      });
      const list = html.find("#campaign-select");
      list[0].innerHTML = campaignList;
    });
    html.find("#check-cobalt-button").click(async (event) => {
      event.preventDefault();
      const cookie = html.find("#cobalt-cookie-input");
      if (cookie[0].value === undefined) throw new Error("undefined");
      const cobaltStatus = await checkCobalt("", cookie[0].value);
      const button = html.find("#check-cobalt-button");
      if (cobaltStatus.success) {
        button[0].innerHTML = "Check Cobalt Cookie - Success!";
      } else {
        button[0].innerHTML = "Check Cobalt Cookie - Failure!";
      }
    });


  }

  /** @override */
  async _updateObject(event, formData) { // eslint-disable-line class-methods-use-this
    event.preventDefault();
    const imageDir = formData['image-upload-directory'];
    const campaignSelect = formData['campaign-select'];
    // console.warn(formData);
    const campaignId = campaignSelect == 0 ? "" : campaignSelect;
    const cobaltCookie = formData['cobalt-cookie'];
    const cobaltCookieLocal = formData['cobalt-cookie-local'];
    const otherImageDir = formData['other-image-upload-directory'];
    const frameImageDir = formData['frame-image-upload-directory'];
    const useWebP = formData['image-use-webp'];
    const currentKey = game.settings.get(SETTINGS.MODULE_ID, "beta-key");

    if (currentKey !== formData['beta-key']) {
      await game.settings.set(SETTINGS.MODULE_ID, "beta-key", formData['beta-key']);
      await setPatreonTier();
    }

    await game.settings.set(SETTINGS.MODULE_ID, "image-upload-directory", imageDir);
    await game.settings.set(SETTINGS.MODULE_ID, "other-image-upload-directory", otherImageDir);
    await game.settings.set(SETTINGS.MODULE_ID, "frame-image-upload-directory", frameImageDir);
    await game.settings.set(SETTINGS.MODULE_ID, "campaign-id", campaignId);
    await game.settings.set(SETTINGS.MODULE_ID, "use-webp", useWebP);

    await setCobaltCookie(cobaltCookie, cobaltCookieLocal);

    const imageDirSet = !BAD_DIRS.includes(imageDir);
    const otherImageDirSet = !BAD_DIRS.includes(otherImageDir);

    const callMuncher = game.settings.get(SETTINGS.MODULE_ID, "settings-call-muncher");

    if (!imageDirSet || !otherImageDirSet || !frameImageDir) {
      $('#munching-task-setup').text(`Please set the image upload directory(s) to something other than the root.`);
      $('#ddb-importer-settings').css("height", "auto");
      throw new Error(`Please set the image upload directory to something other than the root.`);
    } else if (callMuncher && cobaltCookie === "") {
      $('#munching-task-setup').text(`To use Muncher you need to set a Cobalt Cookie value!`);
      $('#ddb-importer-settings').css("height", "auto");
      throw new Error(`To use Muncher you need to set a Cobalt Cookie value!`);
    } else {
      DirectoryPicker.verifyPath(DirectoryPicker.parse(imageDir));
      DirectoryPicker.verifyPath(DirectoryPicker.parse(otherImageDir));
      DirectoryPicker.verifyPath(DirectoryPicker.parse(frameImageDir));

      if (callMuncher) {
        game.settings.set(SETTINGS.MODULE_ID, "settings-call-muncher", false);
        new DDBMuncher().render(true);
      }
    }
  }
}

function getCompendiumLookups(type, selected) {
  const excludedCompendiumPackages = [
    "dnd5e", "dae", "midiqol", "magicitems", "midi-srd", "dae-srd",
  ];

  const selections = game.packs
    .filter((pack) =>
      pack.documentClass.documentName === type &&
    !excludedCompendiumPackages.includes(pack.metadata.package)
    )
    .reduce((choices, pack) => {
      choices[pack.collection] = {
        label: `[${pack.metadata.package}] ${pack.metadata.label}`,
        selected: pack.collection === selected,
      };
      return choices;
    }, {});

  return selections;
}


export class DDBCompendiumSetup extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "ddb-importer-settings-compendium";
    options.template = "modules/ddb-importer/handlebars/compendium.hbs";
    options.width = 500;
    return options;
  }

  get title() { // eslint-disable-line class-methods-use-this
    // improve localisation
    // game.i18n.localize("")
    return "DDB Importer Compendium Settings";
  }

  /** @override */
  async getData() { // eslint-disable-line class-methods-use-this
    const settings = [
      {
        name: "auto-create-compendium",
        isChecked: game.settings.get(SETTINGS.MODULE_ID, "auto-create-compendium"),
        description: "Create default compendiums if missing?",
        enabled: true,
      },
    ];

    const compendiums = SETTINGS.COMPENDIUMS.map((comp) => ({
      setting: comp.setting,
      name: comp.title,
      current: game.settings.get(SETTINGS.MODULE_ID, comp.setting),
      compendiums: getCompendiumLookups(comp.type, game.settings.get(SETTINGS.MODULE_ID, comp.setting)),
    }));

    return {
      settings,
      compendiums,
    };
  }

  /** @override */
  // eslint-disable-next-line no-unused-vars
  async _updateObject(event, formData) { // eslint-disable-line class-methods-use-this
    event.preventDefault();
    for (const [key, value] of Object.entries(formData)) {
      game.settings.set(SETTINGS.MODULE_ID, key, value);
    }
  }
}


function getGMUsers() {
  const updateUser = game.settings.get(SETTINGS.MODULE_ID, "dynamic-sync-user");

  const gmUsers = game.users
    .filter((user) => user.isGM)
    .reduce((choices, user) => {
      choices.push({
        userId: user.id,
        userName: user.name,
        selected: user.id === updateUser,
      });
      return choices;
    }, []);

  return gmUsers;
}


export class DDBDynamicUpdateSetup extends FormApplication {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "ddb-importer-settings-dynamic-updates";
    options.template = "modules/ddb-importer/handlebars/dynamic-updates.hbs";
    options.width = 500;
    return options;
  }

  get title() { // eslint-disable-line class-methods-use-this
    // improve localisation
    // game.i18n.localize("")
    return "DDB Importer Dynamic Update Settings";
  }

  /** @override */
  async getData() { // eslint-disable-line class-methods-use-this
    const tier = game.settings.get(SETTINGS.MODULE_ID, "patreon-tier");
    const tiers = getPatreonTiers(tier);
    const enabled = tiers.experimentalMid;

    const policySettings = Object.keys(SETTINGS.DEFAULT_SETTINGS.READY.CHARACTER.DYNAMIC_SYNC)
      .map((key) => {
        return {
          name: key,
          isChecked: enabled && game.settings.get(SETTINGS.MODULE_ID, key),
          description: game.i18n.localize(`${SETTINGS.MODULE_ID}.settings.dynamic-sync.${key}`),
          enabled,
        };
      });
    const settings = [
      {
        name: "dynamic-sync",
        isChecked: enabled && game.settings.get(SETTINGS.MODULE_ID, "dynamic-sync"),
        description: game.i18n.localize(`${SETTINGS.MODULE_ID}.settings.dynamic-sync.dynamic-sync`),
        enabled,
      },
    ].concat(policySettings);
    const gmUsers = getGMUsers();

    return {
      settings,
      gmUsers,
    };
  }

  /** @override */
  // eslint-disable-next-line class-methods-use-this
  async _updateObject(event, formData) {
    event.preventDefault();
    const initial = game.settings.get(SETTINGS.MODULE_ID, "dynamic-sync");
    for (const [key, value] of Object.entries(formData)) {
      // eslint-disable-next-line no-await-in-loop
      await game.settings.set(SETTINGS.MODULE_ID, key, value);
    }
    const post = game.settings.get(SETTINGS.MODULE_ID, "dynamic-sync");

    if (initial != post) {
      logger.warn("RELOADING!");
      foundry.utils.debounce(window.location.reload(), 100);
    }
  }
}

