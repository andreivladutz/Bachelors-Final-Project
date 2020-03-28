import ACTORS_CST from "../ACTORS_CST";
import Actor, { ActorConfig } from "../gameObjects/Actor";

import Manager from "./Manager";

// Singleton class handling the loading of the actor resources
export default class ActorsManager extends Manager {
  // all actors in this scene
  sceneActors: Actor[] = [];
  // currently selected Actor
  selectedActor: Actor = null;

  // when an actor gets selected, the actorsManager should be informed
  public onActorSelected(actor: Actor) {
    // there is another actor selected, deselect him
    if (this.selectedActor && this.selectedActor !== actor) {
      this.selectedActor.toggleSelected();
    }

    this.selectedActor = actor;
  }

  public onActorDeselected(actor: Actor) {
    if (this.selectedActor === actor) {
      this.selectedActor = null;
    }
  }

  // called in the preload() method of LoadingScene
  // loads all the resources needed for the actors
  async preload(load: Phaser.Loader.LoaderPlugin) {
    this.loadResources(load);
  }

  private loadResources(load: Phaser.Loader.LoaderPlugin) {
    // ACTORS_OBJECT is made out of the rest of the keys on ACTORS_CST that are the keys of our ACTORS
    let { resourcePrefix, basePath, ...ACTORS_OBJECT } = ACTORS_CST;

    load.setPrefix(resourcePrefix);
    load.setPath(basePath);

    // load the json multiatlas for each actor
    for (let actorKey in ACTORS_OBJECT) {
      // the object having the multiatlas path and the anims details
      let actorObject = ACTORS_OBJECT[actorKey] as any;

      if (!(typeof actorObject === "object" && "multiatlas" in actorObject)) {
        continue;
      }

      load.multiatlas(actorKey, actorObject.multiatlas);
    }

    // clear the prefix and the path
    load.setPrefix();
    load.setPath();
  }

  public static getInstance(): ActorsManager {
    return super.getInstance() as ActorsManager;
  }
}

Manager.subscribeToLoadingPhase(ActorsManager);
