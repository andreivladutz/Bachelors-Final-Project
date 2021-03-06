import UIComponents from "../UIComponentsFactory";
import UIComponent from "../uiUtils/UIComponent";
import UIScene from "../../scenes/UIScene";
import CST from "../../CST";

import Image = Phaser.GameObjects.Image;
import Pointer = Phaser.Input.Pointer;
import EventData = Phaser.Types.Input.EventData;

// static UI element that just prevents propagating events
export class UIImage extends Image {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    scene.add.existing(this);

    this.enableInput();
  }

  protected enableInput() {
    this.setInteractive()
      .on("pointermove", preventAndCallbackHandler())
      .on("pointerdown", preventAndCallbackHandler());
  }
}

// button identifier
export default class ButtonImage<T extends UIComponent> extends UIImage {
  // a reference to the parent UI
  parentUI: T;
  btnName: string;

  // default behaviour is to tint the button
  onHover() {
    this.setTint(CST.UI.BUTTONS.TINT_COLOR);
  }

  // default behaviour is to clear the tint
  onHoverEnd() {
    this.setTint();
  }

  onTap: () => void;

  constructor(
    scene: UIScene,
    parentUI: T,
    x: number,
    y: number,
    texture: string,
    btnName: string,
    frame?: string | number
  ) {
    super(
      scene,
      x,
      y,
      texture,
      frame ? frame : UIComponents.getInstance().buttonsFrames[btnName]
    );

    this.parentUI = parentUI;
    this.btnName = btnName;
  }

  protected enableInput() {
    this.setInteractive()
      .on("pointerover", preventAndCallbackHandler(this, "onHover"))
      .on("pointerout", preventAndCallbackHandler(this, "onHoverEnd"))
      .on("pointerdown", preventAndCallbackHandler(this, "onTap"));
  }
}

// function to be used to prevent events from propagating underneath
function preventAndCallbackHandler(
  context?: ButtonImage<UIComponent>,
  cbName?: string
) {
  // just ignore the localX and localY
  return (pointer: Pointer, _2: any, _3: any, event: EventData) => {
    let gameCanvas = context?.parentUI.uiScene.game.canvas;
    // Check if the event is targeted straight on the canvas
    if (
      cbName === "onTap" &&
      gameCanvas &&
      pointer.event.target !== gameCanvas
    ) {
      return;
    }

    if (context && cbName && typeof context[cbName] === "function") {
      context[cbName].call(context);
    }

    event && event.stopPropagation();
  };
}
