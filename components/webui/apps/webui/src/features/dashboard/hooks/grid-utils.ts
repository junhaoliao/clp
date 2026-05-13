import type {DashboardPanel, GridPos} from "@webui/common/dashboard/types";

const COLUMNS = 12;
const GUTTER = 8;

/** Find the first available position for a new panel */
export function findAvailablePosition(
  panels: DashboardPanel[],
  width: number,
  height: number,
): GridPos {
  if (panels.length === 0) {
    return {x: 0, y: 0, w: width, h: height};
  }

  // Build an occupancy grid
  const occupied = new Set<string>();
  let maxY = 0;

  for (const panel of panels) {
    const {x, y, w, h} = panel.gridPos;
    for (let dy = y; dy < y + h; dy++) {
      for (let dx = x; dx < x + w; dx++) {
        occupied.add(`${dx},${dy}`);
      }
    }
    maxY = Math.max(maxY, y + h);
  }

  // Walk row-by-row, column-by-column
  for (let row = 0; row <= maxY + 10; row++) {
    for (let col = 0; col <= COLUMNS - width; col++) {
      let fits = true;
      for (let dy = row; dy < row + height && fits; dy++) {
        for (let dx = col; dx < col + width && fits; dx++) {
          if (occupied.has(`${dx},${dy}`)) {
            fits = false;
          }
        }
      }
      if (fits) {
        return {x: col, y: row, w: width, h: height};
      }
    }
  }

  // Fallback: place at the bottom
  return {x: 0, y: maxY, w: width, h: height};
}

/** Check if a grid position overlaps with existing panels */
export function hasOverlap(
  panels: DashboardPanel[],
  newPos: GridPos,
  excludePanelId?: string,
): boolean {
  for (const panel of panels) {
    if (panel.id === excludePanelId) continue;
    const a = panel.gridPos;
    const b = newPos;
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
      return true;
    }
  }
  return false;
}

/** Auto-compact panels: remove gaps by moving panels up */
export function autoCompact(panels: DashboardPanel[]): DashboardPanel[] {
  if (panels.length === 0) return panels;

  const sorted = [...panels].sort((a, b) => a.gridPos.y - b.gridPos.y || a.gridPos.x - b.gridPos.x);
  const result: DashboardPanel[] = [];

  for (const panel of sorted) {
    let bestY = panel.gridPos.y;

    // Try to move panel up as far as possible
    for (let testY = 0; testY < panel.gridPos.y; testY++) {
      const testPos = {...panel.gridPos, y: testY};
      const occupied = result.some((p) => {
        const a = p.gridPos;
        const b = testPos;
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      });
      if (!occupied) {
        bestY = testY;
        break;
      }
    }

    result.push({
      ...panel,
      gridPos: {...panel.gridPos, y: bestY},
    });
  }

  return result;
}

/** Snap pixel delta to grid column/row delta */
export function snapDeltaToGrid(
  deltaX: number,
  deltaY: number,
  cellWidth: number,
  cellHeight: number,
): {dx: number; dy: number} {
  return {
    dx: Math.round(deltaX / (cellWidth + GUTTER)),
    dy: Math.round(deltaY / (cellHeight + GUTTER)),
  };
}

/** Clamp a grid position for drag: preserves w/h, clamps x/y. */
export function clampGridPosForDrag(pos: GridPos): GridPos {
  const w = Math.max(1, pos.w);
  const h = Math.max(1, pos.h);
  return {
    x: Math.max(0, Math.min(COLUMNS - w, pos.x)),
    y: Math.max(0, pos.y),
    w,
    h,
  };
}

/** Clamp a grid position for resize: preserves x/y, clamps w/h. */
export function clampGridPosForResize(pos: GridPos): GridPos {
  const x = Math.max(0, Math.min(COLUMNS - 1, pos.x));
  const y = Math.max(0, pos.y);
  return {
    x,
    y,
    w: Math.max(1, Math.min(COLUMNS - x, pos.w)),
    h: Math.max(1, pos.h),
  };
}

export {COLUMNS, GUTTER};
