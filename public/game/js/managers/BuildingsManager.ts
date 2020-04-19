import Manager from "./Manager";
import CST from "../CST";
import LoaderInjector, {
  LoadingInjectedManager,
  FramesMap
} from "./LoaderInjector";
import BuildingObject from "../gameObjects/BuildingObject";
import IsoScene from "../IsoPlugin/IsoScene";

import BuildingTypes, { BuildNames } from "../../../common/BuildingTypes";
import { BuildingPlacement } from "../../../common/MessageTypes";
import GameManager from "../online/GameManager";

export default class BuildingsManager extends Manager
  implements LoadingInjectedManager {
  // the frames of the buildings indexed by their identifier i.e. "residential", etcetera..
  buildingFrames: FramesMap = {};

  // Will be injected by the LoaderInjector class
  loadResources: (load: Phaser.Loader.LoaderPlugin) => void;
  getTextureKey: () => string;

  // The buildings currently awaiting the server's aknowledgement
  // Indexed by [y][x] coords
  private buildsAwaitingSv: {
    [yPos: number]: { [xPos: number]: BuildingObject };
  } = {};

  /**
   *
   * Create a building of @param buildingType provided type
   */
  public create(gameScene: IsoScene, buildingType: BuildNames): BuildingObject {
    // get the details of this specific building => frame, texture and localTiles of the grid
    let buildingFrame = this.buildingFrames[buildingType];
    let textureKey = this.getTextureKey();

    let { localTileX, localTileY } = BuildingTypes[buildingType].localPos;

    return new BuildingObject(
      gameScene,
      buildingType,
      textureKey,
      buildingFrame,
      localTileX,
      localTileY
    );
  }

  /**
   * @param building The building that got placed on the client-side
   * Let the server know and await its aknowledgement
   */
  public onBuildingPlaced(building: BuildingObject) {
    if (!this.buildsAwaitingSv[building.tileY]) {
      this.buildsAwaitingSv[building.tileY] = {};
    }

    // Map the building awaiting confirmation from the server until it comes
    this.buildsAwaitingSv[building.tileY][building.tileX] = building;

    GameManager.getInstance().messengers.buildings.buildingPlacementMessage({
      // The name of the building used to identify it in the building types
      buildingType: building.buildingType,
      // The tile position of this building
      position: {
        x: building.tileX,
        y: building.tileY
      },
      // The last time this building produced resources (were collected)
      lastProdTime: building.lastProdTime
    });
  }

  /**
   * Functions handling the response from the server
   * @param buildingInfo the status of the resources after resolving request
   *  and the position of the building that should have been placed on the map
   *  (tile coordinates) used to identify the building in the buildsAwaitingSv Map
   */
  public onPlacementAllowed(
    buildingInfo: BuildingPlacement.ResourcesAfterPlacement
  ) {
    console.log("BUILDING ALLOWED");
    console.log(buildingInfo);

    this.onBuildingAcknowledged(buildingInfo);
  }

  /**
   * Functions handling the response from the server
   * @param buildingInfo the status of the resources after resolving request
   *  and the position of the building that should have been placed on the map
   *  (tile coordinates) used to identify the building in the buildsAwaitingSv Map
   */
  public onPlacementDenied(
    buildingInfo: BuildingPlacement.ResourcesAfterPlacement
  ) {
    console.log("BUILDING DENIED");
    console.log(buildingInfo);

    this.onBuildingAcknowledged(buildingInfo);
  }

  /**
   * Functions handling the response from the server
   * @param buildingInfo the status of the resources after resolving request
   *  and the position of the building that should have been placed on the map
   *  (tile coordinates) used to identify the building in the buildsAwaitingSv Map
   */
  private onBuildingAcknowledged(
    buildingInfo: BuildingPlacement.ResourcesAfterPlacement
  ) {
    delete this.buildsAwaitingSv[buildingInfo.buildingPosition.y][
      buildingInfo.buildingPosition.x
    ];
  }

  async preload(load: Phaser.Loader.LoaderPlugin) {
    LoaderInjector.Inject(this, this.buildingFrames, CST.BUILDINGS)(load);
  }

  public static getInstance() {
    return super.getInstance() as BuildingsManager;
  }
}

Manager.subscribeToLoadingPhase(BuildingsManager);
