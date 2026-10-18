export const HOOK = {
  cellSize: 3, cadenceMax: 4, distinctMin: 3, repeatLimit: 2,
  cells: [[0, 2, 4], [0, 1, 3], [0, 3, 4], [0, 2, 3], [0, 4, 2], [0, 3, 1]],
  endings: [0, 2, 4], passing: [-1, 0, 1],
  rhythms: [[0, 4, 8, 12, 16, 20], [0, 3, 7, 12, 15, 20], [0, 2, 7, 12, 14, 21], [0, 5, 8, 12, 17, 20]],
} as const;
