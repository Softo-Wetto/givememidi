import assert from "node:assert/strict";
import test from "node:test";
import { advancePointerDrag, beginPointerDrag } from "./pointer-drag.ts";

test("a stationary pointer remains a normal click", () => {
  const started = beginPointerDrag(120);
  const result = advancePointerDrag(started, 124);

  assert.equal(result.dragged, false);
  assert.equal(result.capturePointer, false);
});

test("crossing the movement threshold starts a drag", () => {
  const started = beginPointerDrag(120);
  const result = advancePointerDrag(started, 127);

  assert.equal(result.dragged, true);
  assert.equal(result.capturePointer, true);
});

test("an active drag stays a drag when the pointer moves back", () => {
  const started = beginPointerDrag(120);
  const dragging = advancePointerDrag(started, 140);
  const result = advancePointerDrag(dragging.state, 121);

  assert.equal(result.dragged, true);
  assert.equal(result.capturePointer, false);
});
