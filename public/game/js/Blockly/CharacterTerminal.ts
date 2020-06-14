import { Terminal } from "xterm";
import "xterm/css/xterm.css";

import CST from "../CST";
import GameWindow from "../ui/GameWindow";
import TerminalCommands from "./TerminalCommands";

export default class CharacterTerminal {
  private terminal: Terminal;
  private terminalWindow: GameWindow;

  private readonly CURSOR_TEXT = "$ ";
  private readonly PROMPT_TEXT = `\r\n${this.CURSOR_TEXT}`;

  private currentTerminalRow: number;
  private actorKey: string = "";

  // Size percentages for the screen positioning
  private windowWidthPercentage: number;
  private windowHeightPercentage: number;
  private windowParentWidthPercentage: number;
  private windowParentHeightPercentage: number;

  public commandsHandler: TerminalCommands;

  public get lineWidth() {
    return this.terminal.cols;
  }

  // Receives the actor's key
  constructor(actorKey: string) {
    this.terminal = new Terminal();
    this.terminal.open(document.body);

    // The div window "containing" the terminal
    this.terminalWindow = new GameWindow();
    this.registerWindowResizing();
    this.runTerminal(actorKey);

    this.commandsHandler = new TerminalCommands(this);

    this.terminal.element.style.display = "none";

    this.terminalWindow.on(CST.WINDOW.CLOSE_EVENT, () => {
      this.close();
    });
  }

  private processCommand(command: string) {
    this.commandsHandler.handleCommand(command);
  }

  // First message and start listening for key strokes
  private runTerminal(actorKey: string) {
    this.currentTerminalRow = 0;

    this.printLine(
      `Hello from ${this.coloredText(
        actorKey,
        CST.TERMINAL.COLORS.CYAN
      )}'s terminal!`
    );

    this.printLine(
      "Here you can see any code that's being run for this character,",
      CST.TERMINAL.COLORS.MAGENTA
    );
    this.printLine(
      "any code output and you can type and run commands.",
      CST.TERMINAL.COLORS.MAGENTA
    );
    this.printLine(
      "Write 'help' for more details!",
      CST.TERMINAL.COLORS.MAGENTA
    );
    this.prompt();

    if (this.actorKey) {
      return;
    }

    this.actorKey = actorKey;

    this.terminal.onKey(this.processKeyStroke);
    this.terminal.attachCustomKeyEventHandler(this.processSpecialKeys);
  }

  // Add ansi codes around a text
  // colorCode from CST.TERMINAL.COLORS
  public coloredText(text: string, colorCode: string): string {
    return `${CST.TERMINAL.ESCAPE.START}${colorCode}${text}${CST.TERMINAL.ESCAPE.END}`;
  }

  // New line and prompt symbol
  public prompt(): this {
    this.terminal.write(this.PROMPT_TEXT);

    this.currentTerminalRow++;

    return this;
  }

  // Print a line of text to the console and color it if needed
  public printLine(line: string, color?: string): this {
    this.clearRow(this.terminal.cols);

    // Remove any ending whitespace and trim the line so it fits on the line
    let processedLine = line.trimRight();

    // Split the line on multiple lines if it exceeds the line size
    let splitSize = this.terminal.cols - 3;
    for (let i = 0; i < processedLine.length / splitSize; i++) {
      let splitStr = processedLine.substr(i * splitSize, splitSize);

      this.terminal.write(color ? this.coloredText(splitStr, color) : splitStr);
      this.prompt();
    }

    return this;
  }

  /**
   * Handle copy / paste keystrokes
   */
  private processSpecialKeys = (e: KeyboardEvent) => {
    if (!e.ctrlKey || !navigator.clipboard || e.type !== "keydown") {
      return true;
    }

    if (e.key.toLowerCase() === "v") {
      e.stopPropagation();

      // TODO: sanitize PASTED TEXT
      navigator.clipboard.readText().then(clipText => {
        let pastedText = clipText
          .trimLeft()
          .trimRight()
          .substr(
            0,
            this.terminal.cols - this.getCurrentLine().trimRight().length
          )
          .replace(/[\r\n\t]+/, "");

        this.terminal.write(pastedText);
      });

      return false;
    } else if (e.key.toLowerCase() === "c") {
      e.stopPropagation();

      let selection = this.terminal.getSelection();
      navigator.clipboard.writeText(selection);

      return false;
    }

    return true;
  };

  // Handler called when a key event is fired on the terminal
  private processKeyStroke = (e: { key: string; domEvent: KeyboardEvent }) => {
    const printable =
      !e.domEvent.altKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey;

    let term = this.terminal;
    // Terminal buffer, private property
    let privateBuffer = (term as any)._core.buffer;
    let publicBuffer = (term as any).buffer.active;

    if (e.domEvent.key === "Enter") {
      // Get the command from the line on return
      let currentLine: string = this.getCurrentLine().substr(2);

      this.prompt();
      this.processCommand(currentLine.trimRight());

      return;
    } else if (e.domEvent.key === "Escape") {
      this.close();

      return;
    } else if (e.domEvent.key === "Backspace") {
      // Do not delete the prompt
      if (privateBuffer.x > 2) {
        this.backspaceCharacter();
      }
    } else if (printable) {
      // Don t let the user write past the end of the row
      if (this.getCurrentLine().trimRight().length >= this.terminal.cols - 1) {
        return;
      }

      // Write the printable character to the terminal
      term.write(e.key);
    }

    // Don' t let the user navigate past the carret or the last line
    privateBuffer.x = Math.min(
      Math.max(2, privateBuffer.x),
      this.terminal.cols - 1
    );

    if (e.domEvent.key === "ArrowDown") {
      if (privateBuffer.y === this.terminal.rows - 1) {
        return;
      }

      // this.currentTerminalRow++;
      privateBuffer.y--;
    } else if (e.domEvent.key === "ArrowUp") {
      term.writeln("");
    } else if (
      e.domEvent.key === "ArrowRight" &&
      publicBuffer
        .getLine(this.currentTerminalRow)
        .getCell(publicBuffer.cursorX)
        .getChars() === ""
    ) {
      privateBuffer.x = privateBuffer.x - 1;
    }
  };

  // Returns the full current line of the terminal (INCLUDING CURSOR SYMBOL)
  private getCurrentLine(): string {
    return (this.terminal as any).buffer.active
      .getLine(this.currentTerminalRow)
      .translateToString(true);
  }

  // On window resize, clear the current row if the new window has less columns than before
  private clearRow(oldCols: number) {
    for (let i = 1; i < oldCols; i++) {
      this.backspaceCharacter();
    }

    this.terminal.write(this.CURSOR_TEXT);
  }

  // Clear the whole terminal
  public clearTerminal() {
    this.terminal.clear();

    if (this.actorKey) {
      this.runTerminal(this.actorKey);
    }
  }

  private backspaceCharacter() {
    this.terminal.write("\b \b");
  }

  // Resize terminal on window resize, but debounce the resize
  private registerWindowResizing() {
    let debounceTimeout = null;

    window.addEventListener("resize", () => {
      if (debounceTimeout) {
        return;
      }

      debounceTimeout = setTimeout(() => {
        this.repositionTerminalWindow();

        debounceTimeout = null;
      }, CST.TERMINAL.DEBOUNCE_TIME);
    });

    this.repositionTerminalWindow();
  }

  private computeWindowPercentages() {
    // Create and append the div that dictates the terminal size
    let div = document.createElement("div");
    div.classList.add(CST.TERMINAL.CLASS);
    this.terminalWindow.windowContainer.appendChild(div);

    let divParent = div.parentElement;

    let computedStyle = getComputedStyle(div);
    let parentComputedStyle = getComputedStyle(divParent);

    this.windowHeightPercentage = parseInt(
      computedStyle.getPropertyValue("height")
    );
    this.windowWidthPercentage = parseInt(
      computedStyle.getPropertyValue("width")
    );

    this.windowParentWidthPercentage = parseInt(
      parentComputedStyle.getPropertyValue("width")
    );
    this.windowParentHeightPercentage = parseInt(
      parentComputedStyle.getPropertyValue("height")
    );
  }

  // Resize and reposition the terminal window corectly
  private repositionTerminalWindow() {
    if (!this.windowHeightPercentage) {
      this.computeWindowPercentages();
    }
    let bodyStyle = getComputedStyle(document.body);

    let bodyHeight = parseInt(bodyStyle.getPropertyValue("height"));
    let bodyWidth = parseInt(bodyStyle.getPropertyValue("width"));

    let realHeight =
      (this.windowHeightPercentage *
        (this.windowParentHeightPercentage * bodyHeight)) /
      10000;
    let realWidth =
      (this.windowWidthPercentage *
        (this.windowParentWidthPercentage * bodyWidth)) /
      10000;

    this.terminal.element.style.width = realWidth + "px";
    this.terminal.element.style.height = realHeight + "px";

    this.terminal.element.style.left = (bodyWidth - realWidth) / 2 + "px";
    this.terminal.element.style.top = (bodyHeight - realHeight) / 2 + "px";

    let characterSize = (this.terminal as any)._core.viewport._renderService
      ._renderer.dimensions;

    let oldCols = this.terminal.cols;

    this.terminal.resize(
      Math.floor(realWidth / characterSize.actualCellWidth) - 1,
      Math.floor(realHeight / characterSize.actualCellHeight)
    );

    if (this.terminal.cols < oldCols) {
      this.clearTerminal();
    }
  }

  public open(): this {
    this.terminalWindow.openWindow();
    this.terminalWindow.on(CST.WINDOW.OPEN_ANIM_EVENT, () => {
      this.terminal.element.style.display = "";
    });

    return this;
  }

  public close(): this {
    this.terminal.element.style.display = "none";
    this.terminalWindow.closeWindow();

    return this;
  }
}
