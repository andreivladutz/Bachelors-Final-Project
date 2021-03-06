import GameInstance from "../GameInstance";

// The common base class for all Managers: BuildingsManager, CharactersManager, etc.
export default abstract class GameObjectsManager {
  protected gameInstanceParent: GameInstance;

  protected get islandDoc() {
    return this.gameInstanceParent.currIslandDocument;
  }
  protected get userDoc() {
    return this.gameInstanceParent.user;
  }
  protected get sender() {
    return this.gameInstanceParent.sender;
  }
  // Get the resources on the game object of this user
  protected get resourcesDoc() {
    return this.userDoc.game.resources;
  }

  constructor(gameInstance: GameInstance) {
    this.gameInstanceParent = gameInstance;
  }

  // This has to be called every time a socket reconnection is detected
  // So the GameObjects Managers listen for events on the new socket
  public abstract initListeners(): void;
}
