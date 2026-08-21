export type PointerDragState = {
  startX: number;
  dragged: boolean;
};

export function beginPointerDrag(startX: number): PointerDragState {
  return { startX, dragged: false };
}

export function advancePointerDrag(
  state: PointerDragState,
  currentX: number,
  threshold = 6
) {
  const dragged = state.dragged || Math.abs(currentX - state.startX) > threshold;

  return {
    state: { ...state, dragged },
    dragged,
    capturePointer: dragged && !state.dragged,
  };
}
