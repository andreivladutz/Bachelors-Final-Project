import Manager from "../managers/Manager";
import gameConfig from "../system/gameConfig";
import SocketManager from "./SocketManager";
import { Game } from "../../../common/MessageTypes";
import AnimationHandler from "../../../no_auth/screen_anim/js/AnimationHandler";

import CST from "../CST";
import BuildingsMessenger from "./BuildingsMessenger";
import { IsoScene } from "../IsoPlugin/IsoPlugin";

import Modal from "../ui/Modal";
import createSpinner from "../ui/CreateSpinner";
import CharactersMessenger from "./CharactersMessenger";
import ResourcesMessenger from "./ResourcesMessenger";
import LangFile from "../../../common/Languages/LangFileInterface";
import LangManager from "../../../common/Languages/LangManager";
import UsersMessenger from "./UsersMessenger";

export default class GameManager extends Manager {
  private gameInstance: Phaser.Game;
  private socketManager: SocketManager;
  private animation: AnimationHandler;

  // Boolean set when the game detects it's offline and shows a offline modal
  public isOffline = false;
  private offlineTimeout: any;

  private offlineDialog: Modal;

  // The messengers used to send events to the server
  public messengers: {
    buildings?: BuildingsMessenger;
    characters?: CharactersMessenger;
    resources?: ResourcesMessenger;
    users?: UsersMessenger;
  } = {};

  // The seed generated by the server for this game to use
  public seed: string;

  // The code of the language that has been selected by the user
  public chosenLangCode: string;
  public langFile: LangFile;

  private constructor() {
    super();

    // Create the same page animation as on the login page
    this.animation = new AnimationHandler();

    // Init the socket manager
    this.socketManager = SocketManager.getInstance();

    this.messengers.buildings = new BuildingsMessenger(this.socketManager);
    this.messengers.characters = new CharactersMessenger(this.socketManager);
    this.messengers.resources = new ResourcesMessenger(this.socketManager);
    this.messengers.users = new UsersMessenger(this.socketManager);

    this.offlineTimeout = setTimeout(() => {
      this.showOfflineDialog();
    }, CST.IO.OFFLINE_TIMEOUT);

    // When connected to the server, start listening for the game init event
    this.socketManager.events.once(CST.IO.EVENTS.CONNECT, () => {
      clearTimeout(this.offlineTimeout);
      this.cancelOfflineDialog();

      this.listenForInitEvent();
    });

    // When reconnected to the server, remove the offline dialog
    this.socketManager.events.once(CST.IO.EVENTS.RECONNECT, () => {
      clearTimeout(this.offlineTimeout);
      this.cancelOfflineDialog();
    });
  }

  // On connection or reconnection close the offline dialog
  private cancelOfflineDialog() {
    if (this.isOffline && this.offlineDialog) {
      this.offlineDialog.close();
    }
  }

  // If the game is offline, show a dialog to let the user know
  private showOfflineDialog() {
    this.isOffline = true;

    this.offlineDialog = Modal.getInstance()
      .open({
        enableClose: false,
        title: "You seem to be offline",
        content:
          "The game cannot connect to the server. You need internet connection to play the game."
      })
      .addHTMLElementTo("header", createSpinner(0, -45, 0.1).el, "append");
  }

  // Listen for the init event and expect the initial game config
  // This event will fire MULTIPLE times if connection is lost and another socket is allocated server-side
  private listenForInitEvent() {
    this.socketManager.on(Game.INIT_EVENT, this.gameInit);
  }

  private gameInit = async (initConfig: Game.Config) => {
    // If for some reason, this event fires multiple times
    // and the game is already running, just ignore it
    if (this.gameInstance) {
      // But fire the load event because the game is already loaded
      this.socketManager.emit(Game.LOAD_EVENT);

      return;
    }

    ({
      seed: this.seed,
      resources: this.messengers.resources.initialResources,
      languageCode: this.chosenLangCode
    } = initConfig);
    // Keep the language file of the chosen language
    this.langFile = await LangManager.getInstance().get(this.chosenLangCode);

    this.messengers.buildings.initialBuildings = initConfig.buildings;
    this.gameInstance = new Phaser.Game(gameConfig);

    await this.waitForGameLoad();
    // After loading the game successfully, remove layers and leave only the sky and clouds
    this.animation.leaveOnlySkyLayers().stopAnim();
  };

  // Wait for Game Load to send the gameloaded event to the server
  private waitForGameLoad(): Promise<IsoScene> {
    // Start a coroutine
    return (async () => {
      // Wait until the game starts running
      while (!this.gameInstance.isRunning) {
        await new Promise(resolve => {
          setTimeout(resolve, 0);
        });
      }

      return new Promise((resolve: (value: IsoScene) => void) => {
        // Subscribe to the loadcomplete event on the Loading Scene
        // Once the game loaded successfully, emit an event to the server
        this.gameInstance.scene.keys[CST.SCENES.LOAD].events.once(
          CST.EVENTS.LOAD_SCENE.LOAD_COMPLETE,
          (gameScene: IsoScene) => {
            this.socketManager.emit(Game.LOAD_EVENT);

            resolve(gameScene);
          }
        );
      });
    })();
  }

  public static getInstance(): GameManager {
    return super.getInstance() as GameManager;
  }
}
