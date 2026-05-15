import type { ControlsState } from "./types";

const initialControls = (): ControlsState => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  bark: false,
  sprint: false,
});

export class Controls {
  state = initialControls();
  private pressed = new Set<string>();
  private onKeyDown = (event: KeyboardEvent) => this.setKey(event, true);
  private onKeyUp = (event: KeyboardEvent) => this.setKey(event, false);

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  reset() {
    this.pressed.clear();
    this.state = initialControls();
  }

  consumeJump() {
    const value = this.state.jump;
    this.state.jump = false;
    return value;
  }

  consumeBark() {
    const value = this.state.bark;
    this.state.bark = false;
    return value;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private setKey(event: KeyboardEvent, isDown: boolean) {
    const code = event.code.toLowerCase();
    const key = event.key.toLowerCase();

    if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(code)) {
      event.preventDefault();
    }

    if (isDown) {
      if (this.pressed.has(code)) return;
      this.pressed.add(code);
    } else {
      this.pressed.delete(code);
    }

    if (code === "keyw" || code === "arrowup") this.state.forward = isDown;
    if (code === "keys" || code === "arrowdown") this.state.backward = isDown;
    if (code === "keya" || code === "arrowleft") this.state.left = isDown;
    if (code === "keyd" || code === "arrowright") this.state.right = isDown;
    if (code === "space" && isDown) this.state.jump = true;
    if (code === "keyb" && isDown) this.state.bark = true;
    if (code === "shiftleft" || code === "shiftright" || code === "keyz") this.state.sprint = isDown;

    if (key === "b" && isDown) this.state.bark = true;
    if (key === "z") this.state.sprint = isDown;
  }
}
