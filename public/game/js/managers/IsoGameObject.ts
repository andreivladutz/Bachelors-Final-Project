import IsoSprite from "../IsoPlugin/IsoSprite";
import EnvironmentManager from "./EnvironmentManager";
import MapManager from "./MapManager";
import CST from "../CST";

enum GridColor {
  DO_NOT_DRAW = -1,
  GREEN = CST.COLORS.GREEN,
  RED = CST.COLORS.RED
}

const envManager = EnvironmentManager.getInstance();

export default class IsoGameObject extends IsoSprite {
  tileWidthX: number;
  tileWidthY: number;

  // local tile coords of the origin
  localTileX: number;
  localTileY: number;

  // the graphics used to draw this object's grid
  private gridGraphics: Phaser.GameObjects.Graphics;
  // should we draw the grid? if so this property is a valid number
  // TODO: should default to DO_NOT_DRAW
  private drawingGridColor: GridColor = GridColor.RED;

  // tile coords of this object
  // CAN BE FLOATING POINT NUMBERS!!!
  private tileCoords: Phaser.Geom.Point = new Phaser.Geom.Point();

  // the last drew coordinates of the grid
  lastDrewTileCoords: Phaser.Geom.Point = new Phaser.Geom.Point();

  mapManager: MapManager = MapManager.getInstance();

  // the size of this tile in 3D (unprojected it is a rectangle)
  readonly TILE_SIZE3D = envManager.TILE_HEIGHT;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    z: number,
    texture: string,
    frame?: string | number
  ) {
    super(
      scene,
      tileX * envManager.TILE_HEIGHT,
      tileY * envManager.TILE_HEIGHT,
      z,
      texture,
      frame
    );

    this.addToGridAt(tileX, tileY);

    this.tileCoords.x = tileX;
    this.tileCoords.y = tileY;

    // add myself to the scene
    // set the origin to default to the bottom right corner
    this.scene.add.existing(this.setOrigin(1, 1));

    for (let frameKey in this.texture.frames) {
      // take the first frame key that's different than base
      // so we can set the origin of this game object correctly
      if (
        frameKey !== "__BASE" &&
        this.texture.frames.hasOwnProperty(frameKey) &&
        this.texture.frames[frameKey].pivotX &&
        this.texture.frames[frameKey].pivotY
      ) {
        this.setOrigin(
          this.texture.frames[frameKey].pivotX,
          this.texture.frames[frameKey].pivotY
        );

        break;
      }
    }

    this.computeTileArea();

    // TODO: change this depth logic
    this.gridGraphics = this.scene.add.graphics().setDepth(3);

    // the actors update on preupdate event, the tilemap updates on update event,
    // as the drawing of the tilemap sets the isoBoard's viewRectangle "not dirty"
    // and that means the grid of the actor will not draw anymore
    this.scene.events.on("preupdate", () => {
      this.onSceneUpdate();
    });
  }

  // Add this object to the grid at the provided tile coords
  public addToGridAt(tileX: number, tileY: number): this {
    this.mapManager.addGameObjectToGrid(this, tileX, tileY);
    return this;
  }

  // function called on each scene update event
  public onSceneUpdate() {
    this.drawGrid();
  }

  private drawGrid() {
    if (
      this.drawingGridColor === GridColor.DO_NOT_DRAW ||
      (this.lastDrewTileCoords.x === this.tileX &&
        this.lastDrewTileCoords.y === this.tileY)
    ) {
      return;
    }

    // the tiles occupied by this game object
    // they are relative to the (tileX, tileY) coords of the origin
    let gridTiles = [];

    // how are these tiles positioned relative to the localTileX, localTileY?
    for (let x = 0; x < this.tileWidthX; x++) {
      for (let y = 0; y < this.tileWidthY; y++) {
        let dX = x - this.localTileX,
          dy = y - this.localTileY;

        gridTiles.push({ x: this.tileX + dX, y: this.tileY + dy });
      }
    }

    this.mapManager
      .getIsoBoard()
      .drawTilesOnGrid(
        gridTiles,
        this.drawingGridColor,
        CST.GRID.LINE_WIDTH,
        CST.GRID.FILL_ALPHA,
        this.drawingGridColor,
        this.gridGraphics.clear()
      );

    // remember the last drewn coords so we don't waste by drawing again and again and again
    this.lastDrewTileCoords.x = this.tileX;
    this.lastDrewTileCoords.y = this.tileY;
  }

  // enable grid drawing
  // acceptable values for color param are red or green hexa color
  enableGridDrawing(color: GridColor) {
    this.drawingGridColor = color;
  }

  disableGridDrawing() {
    this.drawingGridColor = GridColor.DO_NOT_DRAW;
  }

  // compute the tile area occupied by this game object
  private computeTileArea() {
    this.tileWidthX = Math.ceil(this.bounds3D.widthX / this.TILE_SIZE3D);
    this.tileWidthY = Math.ceil(this.bounds3D.widthY / this.TILE_SIZE3D);

    this.localTileX = Math.floor(this.tileWidthX * this.originX);
    // localTileY needs the origin with respect to the cube base
    this.localTileY = Math.floor(
      (this.tileWidthY *
        Math.abs(this.originY - this.bounds3D.height / this.height) *
        this.height) /
        this.bounds3D.widthY
    );
  }

  // called internally to get tile coords
  // private computeTileCoords() {
  //   this._project();

  //   ({
  //     x: this.tileCoords.x,
  //     y: this.tileCoords.y
  //   } = this.mapManager.worldToTileCoords(this.x, this.y));
  // }

  get tileX() {
    // this.computeTileCoords();

    return Math.round(this.tileCoords.x);
  }

  get tileY() {
    // this.computeTileCoords();

    return Math.round(this.tileCoords.y);
  }

  public setTilePosition(tileX: number, tileY: number): this {
    this.tileCoords.x = tileX;
    this.tileCoords.y = tileY;

    this.isoX = this.tileCoords.x * this.TILE_SIZE3D;
    this.isoY = this.tileCoords.y * this.TILE_SIZE3D;

    return this;
  }

  // move this game object to worldX worldY position
  public moveToWorldXY(worldX: number, worldY: number): this {
    let tileCoords = this.mapManager.worldToFloatTileCoords(worldX, worldY);

    return this.setTilePosition(tileCoords.x, tileCoords.y);
  }

  // if body debugging is enabled, the body of this object will be drawn
  public enableDebugging() {
    this.mapManager.addToDebuggingObjects(this);
  }
}
