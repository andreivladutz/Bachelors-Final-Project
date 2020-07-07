import $ from "jquery";
import "bootstrap/js/dist/modal";
import CST from "../../../CST";
import GameWindow from "../../GameWindow";

const MODAL = CST.UI.BOOTSTRAP_MODAL;

export default class Dialog {
  private static instance = null;
  private dialogWindow: GameWindow;

  private constructor() {
    this.dialogWindow = new GameWindow();

    $(() => {
      this.initModal($(`#${MODAL.ID}`));
    });

    this.dialogWindow.on(
      CST.WINDOW.DEBOUNCED_RESIZE_EVENT,
      this.resizeDialog,
      this
    );

    this.dialogWindow.on(CST.WINDOW.CLOSE_EVENT, () => {
      this.close();
    });
  }

  public show(title: string, content: string) {
    $(() => {
      this.dialogWindow.openWindow();
      this.dialogWindow.on(CST.WINDOW.OPEN_ANIM_EVENT, () => {
        let el = $(`#${MODAL.ID}`);

        el.modal("show");
        el.find(MODAL.TITLE_SELECTOR).text(title);
        el.find(MODAL.CONTENT_SELECTOR).html(content);

        this.resizeDialog();
      });
    });
  }

  public close() {
    $(() => {
      this.dialogWindow.closeWindow();
      $(`#${MODAL.ID}`).modal("hide");
    });
  }

  private resizeDialog() {
    $(() => {
      let { width, height } = this.dialogWindow.getPixelSize(
        CST.TERMINAL.TERMINAL_RATIO.WIDTH,
        CST.TERMINAL.TERMINAL_RATIO.HEIGHT
      );

      let modalElement = document.getElementsByClassName(
        MODAL.CONTENT_CLASS
      )[0] as HTMLDivElement;

      let modalParentEl = document.getElementsByClassName(
        MODAL.DIALOG_CLASS
      )[0] as HTMLDivElement;

      modalParentEl.style.maxWidth = `${width}px`;
      modalElement.style.width = `${width}px`;
      modalElement.style.height = `${height}px`;
    });
  }

  private initModal(jQObj: JQuery<HTMLElement>) {
    jQObj
      .modal({
        backdrop: "static",
        show: false
      })
      .on("hidden.bs.modal", () => {
        this.close();
      })
      // Make the backdrop transparent so we don't really see it but we can use its functionality
      .on("shown.bs.modal", () => {
        let backdrops = document.body.getElementsByClassName(
          MODAL.BACKDROP_CLASS
        );

        for (let backdrop of Array.from(backdrops)) {
          if (backdrop.classList.contains(MODAL.BACKDROP_SHOWN_CLASS)) {
            (backdrop as HTMLDivElement).style.opacity = "0.01";
          }
        }
      })
      .on("hidePrevented.bs.modal", () => {
        this.close();
      });
  }

  public static getInstance(): Dialog {
    if (!this.instance) {
      this.instance = new Dialog();
    }

    return this.instance;
  }
}
