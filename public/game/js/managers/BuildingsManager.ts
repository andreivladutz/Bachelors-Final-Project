import Manager from "./Manager";
import CST from "../CST";
import LoaderInjector, {
  LoadingInjectedManager,
  FramesMap,
} from "./LoaderInjector";
import BuildingObject from "../gameObjects/BuildingObject";
import IsoScene from "../IsoPlugin/IsoScene";

import BuildingTypes, { BuildNames } from "../../../common/BuildingTypes";
import { Buildings } from "../../../common/MessageTypes";
import GameManager from "../online/GameManager";

import Group = Phaser.GameObjects.Group;
import BuildingsMessenger from "../online/BuildingsMessenger";
import ResourcesManager from "./ResourcesManager";
import AudioManager from "./AudioManager";
import ActorsManager from "./ActorsManager";

export default class BuildingsManager extends Manager
  implements LoadingInjectedManager {
  // the frames of the buildings indexed by their identifier i.e. "residential", etcetera..
  public buildingFrames: FramesMap = {};

  // * ProdReady event
  public EVENTS = new Phaser.Events.EventEmitter();

  // Will be injected by the LoaderInjector class
  loadResources: (load: Phaser.Loader.LoaderPlugin) => void;
  getTextureKey: () => string;

  // The PopoverObject will be imported dynamically the first time it is used
  // This class is being used by the BuildingObject children
  public PopoverObject: typeof import("../ui/uiObjects/bootstrapObjects/PopoverObject").default;

  public resourcesManager: ResourcesManager;
  public audioManager = AudioManager.getInstance();
  // Keep a reference to all the game building objects
  public sceneBuildings: Group;

  // Keep a reference to the buildings messenger talking to the server
  private buildsMessenger: BuildingsMessenger;
  // The buildings currently awaiting the server's aknowledgement
  // Indexed by [y][x] coords
  private buildsAwaitingSv: {
    [yPos: number]: { [xPos: number]: BuildingObject };
  } = {};

  /**
   *
   * Create a building of @param buildingType provided type
   */
  public create(
    gameScene: IsoScene,
    buildingType: BuildNames,
    tileX?: number,
    tileY?: number
  ): BuildingObject {
    // get the details of this specific building => frame, texture and localTiles of the grid
    let buildingFrame = this.buildingFrames[buildingType];
    let textureKey = this.getTextureKey();

    let { localTileX, localTileY } = BuildingTypes[buildingType].localPos;

    let building = new BuildingObject(
      gameScene,
      buildingType,
      textureKey,
      buildingFrame,
      localTileX,
      localTileY,
      tileX,
      tileY
    );
    this.sceneBuildings.add(building);

    return building;
  }

  /**
   * Return the building with id = @param dbId or @null if nothing is found
   */
  public getBuildingWithId(dbId: string): BuildingObject {
    let foundBuilding: BuildingObject = null;

    this.sceneBuildings.children.iterate((building: BuildingObject) => {
      if (building.dbId === dbId) {
        foundBuilding = building;
      }
    });

    return foundBuilding;
  }

  // Get the builings that have the production ready right now
  public getProdReadyBuildings(): BuildingObject[] {
    let foundBuildings: BuildingObject[] = [];

    this.sceneBuildings.children.iterate((building: BuildingObject) => {
      if (building.isProductionReady) {
        foundBuildings.push(building);
      }
    });

    return foundBuildings;
  }

  private initComponents(gameScene: IsoScene) {
    this.resourcesManager = ResourcesManager.getInstance();
    this.resourcesManager.initResourcesUi(gameScene);

    this.sceneBuildings = new Group(gameScene);

    this.buildsMessenger = GameManager.getInstance().messengers.buildings;

    gameScene.events.on("update", this.onUpdate.bind(this));
  }

  // Update all buildings
  private onUpdate() {
    this.sceneBuildings.children.iterate((building: BuildingObject) => {
      building.update();
    });
  }

  // When the production has finished or has been collected update
  // the interpreters with the new isReady flag state:
  public onProductionReady(building: BuildingObject) {
    ActorsManager.getInstance().updateBuilding(
      building.getInterpreterRepresentation()
    );
    this.resourcesManager.resourcesUi.showProductionReady(building);

    // Emit the production ready event and send the building along with it
    this.EVENTS.emit(CST.EVENTS.BUILDING.PROD_READY, building);
  }

  // This is being called by the collected building with itself as argument
  public onProductionCollected(building: BuildingObject) {
    // When the production has finished or has been collected update
    // the interpreters with the new isReady flag state:
    ActorsManager.getInstance().updateBuilding(
      building.getInterpreterRepresentation()
    );
    // Hide the animated coin
    this.resourcesManager.resourcesUi.hideProductionReady(
      building.productionCoin
    );

    this.audioManager.playUiSound(CST.AUDIO.KEYS.COIN);
  }

  /**
   * Place buildings at the begining of the game
   * @param buildings array of DbBuildingInfo from the server
   */
  public initBuildings(gameScene: IsoScene) {
    this.initComponents(gameScene);

    let buildings = this.buildsMessenger.initialBuildings;

    for (let building of buildings) {
      let { x, y } = building.position;

      let buildingObject = this.create(gameScene, building.buildingType, x, y);
      buildingObject.enableBuildPlacing().placeBuilding(false);
      buildingObject.dbId = building._id;

      buildingObject.lastProdTime = building.lastProdTime;
    }
  }

  // When the scene Actors have been initialised, this handler function gets called
  public onActorsInterpretersInited(actorsManagerInstance: ActorsManager) {
    this.sceneBuildings.children.iterate((buildingObject: BuildingObject) => {
      // Place the building inside the interpreter also
      actorsManagerInstance.onBuildingPlaced(
        buildingObject.getInterpreterRepresentation()
      );
    });
  }

  // Collect the resources produced by a building
  public collectBuilding(building: BuildingObject) {
    // Hide the coin. The coin is being hidden by the building
    // this.onProductionCollected(building);

    // Update the resources and lastProdTime locally until the server responds
    this.resourcesManager.spendCollectResourcesClientSide(
      BuildingTypes[building.buildingType].productionResources,
      false
    );
    building.lastProdTime = Date.now();

    this.buildsMessenger.collectBuildingMessage(building);
  }

  // public onCollectionAccepted(
  //   building: BuildingObject,
  //   resourcesStatus: Buildings.ResourcesAfterCollect
  // ) {
  //   this.onCollectionResolved(building, resourcesStatus);
  // }

  // public onCollectionDenied(
  //   building: BuildingObject,
  //   resourcesStatus: Buildings.ResourcesAfterCollect
  // ) {
  //   this.onCollectionResolved(building, resourcesStatus);
  // }

  // TODO: For now these functions do not differ
  public onCollectionResolved(
    building: BuildingObject,
    resourcesStatus: Buildings.ResourcesAfterCollect
  ) {
    building.lastProdTime = resourcesStatus.lastProdTime;
    this.resourcesManager.setResources(resourcesStatus);
  }

  /** Check if the user has sufficient funds to place @param building */
  public hasSufficientFunds(building: BuildingObject) {
    let buildingCost = BuildingTypes[building.buildingType].buildCost;
    // The spend function return false if there are insufficient funds
    if (
      !this.resourcesManager.spendCollectResourcesClientSide(buildingCost, true)
    ) {
      let lang = GameManager.getInstance().langFile;
      this.resourcesManager.mainUi.toast.showMsg(lang.buildings.noFunds);

      return false;
    }

    return true;
  }

  /**
   * @param building The building that got placed on the client-side
   * Let the server know and await its aknowledgement
   */
  public onBuildingPlaced(building: BuildingObject) {
    this.audioManager.playUiSound(CST.AUDIO.KEYS.BUILD);

    if (!this.buildsAwaitingSv[building.tileY]) {
      this.buildsAwaitingSv[building.tileY] = {};
    }

    // Map the building awaiting confirmation from the server until it comes
    this.buildsAwaitingSv[building.tileY][building.tileX] = building;

    this.buildsMessenger.buildingPlacementMessage({
      // The name of the building used to identify it in the building types
      buildingType: building.buildingType,
      // The tile position of this building
      position: {
        x: building.tileX,
        y: building.tileY,
      },
    });
  }

  /**
   * Functions handling the response from the server
   * @param buildingInfo the status of the resources after resolving request
   *  and the position of the building that should have been placed on the map
   *  (tile coordinates) used to identify the building in the buildsAwaitingSv Map
   */
  public onPlacementAllowed(buildingInfo: Buildings.ResourcesAfterPlacement) {
    console.log("BUILDING ALLOWED");

    // Save the db id on the building for easier retrieval at a later time
    let { x, y } = buildingInfo.buildingPosition;
    let mapBuilding = this.buildsAwaitingSv[y][x];
    mapBuilding.dbId = buildingInfo._id;

    // Send the building to the actors' interpreters
    ActorsManager.getInstance().onBuildingPlaced(
      mapBuilding.getInterpreterRepresentation()
    );

    this.onBuildingAcknowledged(buildingInfo);
  }

  /**
   * Functions handling the response from the server
   * @param buildingInfo the status of the resources after resolving request
   *  and the position of the building that should have been placed on the map
   *  (tile coordinates) used to identify the building in the buildsAwaitingSv Map
   */
  public onPlacementDenied(buildingInfo: Buildings.ResourcesAfterPlacement) {
    console.log("BUILDING DENIED");

    let { x, y } = buildingInfo.buildingPosition;
    this.buildsAwaitingSv[y][x].removeBuilding();

    this.onBuildingAcknowledged(buildingInfo);
  }

  /**
   * Functions handling the response from the server
   * @param buildingInfo the status of the resources after resolving request
   *  and the position of the building that should have been placed on the map
   *  (tile coordinates) used to identify the building in the buildsAwaitingSv Map
   */
  private onBuildingAcknowledged(
    buildingInfo: Buildings.ResourcesAfterPlacement
  ) {
    delete this.buildsAwaitingSv[buildingInfo.buildingPosition.y][
      buildingInfo.buildingPosition.x
    ];

    this.resourcesManager.setResources(buildingInfo);
  }

  async preload(load: Phaser.Loader.LoaderPlugin) {
    LoaderInjector.Inject(this, this.buildingFrames, CST.BUILDINGS)(load);
  }

  public static getInstance() {
    return super.getInstance() as BuildingsManager;
  }
}

Manager.subscribeToLoadingPhase(BuildingsManager);
