import * as THREE from 'three'

/** Block ids. 0 is air. */
export enum Block {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Sand = 4,
  Log = 5,
  Leaves = 6,
  Planks = 7,
  Bedrock = 8,
}

/** Tiles in the texture atlas, laid out on a 4x4 grid of 16px tiles. */
const TILE_PX = 16
const ATLAS_COLS = 4
const ATLAS_ROWS = 4

const T_GRASS_TOP = 0
const T_GRASS_SIDE = 1
const T_DIRT = 2
const T_STONE = 3
const T_SAND = 4
const T_LOG_SIDE = 5
const T_LOG_TOP = 6
const T_LEAVES = 7
const T_PLANKS = 8
const T_BEDROCK = 9

/** Atlas tile per block, in face order: +x, -x, +y (top), -y (bottom), +z, -z. */
const BLOCK_TILES: Record<number, [number, number, number, number, number, number]> = {
  [Block.Grass]: [T_GRASS_SIDE, T_GRASS_SIDE, T_GRASS_TOP, T_DIRT, T_GRASS_SIDE, T_GRASS_SIDE],
  [Block.Dirt]: [T_DIRT, T_DIRT, T_DIRT, T_DIRT, T_DIRT, T_DIRT],
  [Block.Stone]: [T_STONE, T_STONE, T_STONE, T_STONE, T_STONE, T_STONE],
  [Block.Sand]: [T_SAND, T_SAND, T_SAND, T_SAND, T_SAND, T_SAND],
  [Block.Log]: [T_LOG_SIDE, T_LOG_SIDE, T_LOG_TOP, T_LOG_TOP, T_LOG_SIDE, T_LOG_SIDE],
  [Block.Leaves]: [T_LEAVES, T_LEAVES, T_LEAVES, T_LEAVES, T_LEAVES, T_LEAVES],
  [Block.Planks]: [T_PLANKS, T_PLANKS, T_PLANKS, T_PLANKS, T_PLANKS, T_PLANKS],
  [Block.Bedrock]: [T_BEDROCK, T_BEDROCK, T_BEDROCK, T_BEDROCK, T_BEDROCK, T_BEDROCK],
}

/** Block order in the hotbar. Bedrock is not obtainable. */
export const HOTBAR: Block[] = [
  Block.Grass,
  Block.Dirt,
  Block.Stone,
  Block.Sand,
  Block.Log,
  Block.Leaves,
  Block.Planks,
]

export const BLOCK_NAMES: Record<number, string> = {
  [Block.Grass]: 'Grass',
  [Block.Dirt]: 'Dirt',
  [Block.Stone]: 'Stone',
  [Block.Sand]: 'Sand',
  [Block.Log]: 'Log',
  [Block.Leaves]: 'Leaves',
  [Block.Planks]: 'Planks',
  [Block.Bedrock]: 'Bedrock',
}

/** Rough UI swatch color per block, for the hotbar. */
export const BLOCK_COLORS: Record<number, string> = {
  [Block.Grass]: '#6aaa40',
  [Block.Dirt]: '#866043',
  [Block.Stone]: '#7d7d7d',
  [Block.Sand]: '#dacea0',
  [Block.Log]: '#665132',
  [Block.Leaves]: '#326928',
  [Block.Planks]: '#9c7f4e',
  [Block.Bedrock]: '#3c3c3c',
}

/** A deterministic RNG so the textures look the same every load. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
): void {
  ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
  ctx.fillRect(x, y, 1, 1)
}

function shade(c: [number, number, number], k: number): [number, number, number] {
  return [
    Math.min(255, c[0] * k),
    Math.min(255, c[1] * k),
    Math.min(255, c[2] * k),
  ]
}

function noiseTile(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  base: [number, number, number],
  jitter: number,
  rand: () => number,
): void {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const c = shade(base, 1 + (rand() * 2 - 1) * jitter)
      px(ctx, ox + x, oy + y, c[0], c[1], c[2])
    }
  }
}

function drawAtlas(ctx: CanvasRenderingContext2D): void {
  const rand = mulberry32(1337)
  const at = (tile: number): [number, number] => [
    (tile % ATLAS_COLS) * TILE_PX,
    Math.floor(tile / ATLAS_COLS) * TILE_PX,
  ]

  // grass top
  let [ox, oy] = at(T_GRASS_TOP)
  noiseTile(ctx, ox, oy, [106, 170, 64], 0.09, rand)

  // grass side: dirt with a ragged grass fringe on top
  ;[ox, oy] = at(T_GRASS_SIDE)
  noiseTile(ctx, ox, oy, [134, 96, 67], 0.1, rand)
  for (let x = 0; x < TILE_PX; x++) {
    const depth = 2 + Math.floor(rand() * 3)
    for (let y = 0; y < depth; y++) {
      const c = shade([106, 170, 64], 1 + (rand() * 2 - 1) * 0.09)
      px(ctx, ox + x, oy + y, c[0], c[1], c[2])
    }
    const c = shade([87, 140, 52], 1 + (rand() * 2 - 1) * 0.09)
    px(ctx, ox + x, oy + depth, c[0], c[1], c[2])
  }

  // dirt
  ;[ox, oy] = at(T_DIRT)
  noiseTile(ctx, ox, oy, [134, 96, 67], 0.11, rand)

  // stone
  ;[ox, oy] = at(T_STONE)
  noiseTile(ctx, ox, oy, [125, 125, 125], 0.08, rand)

  // sand
  ;[ox, oy] = at(T_SAND)
  noiseTile(ctx, ox, oy, [218, 206, 160], 0.06, rand)

  // log side: vertical bark ridges
  ;[ox, oy] = at(T_LOG_SIDE)
  for (let x = 0; x < TILE_PX; x++) {
    const ridge = 1 + (rand() * 2 - 1) * 0.18
    for (let y = 0; y < TILE_PX; y++) {
      const c = shade([102, 81, 50], ridge * (1 + (rand() * 2 - 1) * 0.05))
      px(ctx, ox + x, oy + y, c[0], c[1], c[2])
    }
  }

  // log top: growth rings
  ;[ox, oy] = at(T_LOG_TOP)
  noiseTile(ctx, ox, oy, [154, 127, 85], 0.06, rand)
  ctx.strokeStyle = 'rgb(102,81,50)'
  ctx.lineWidth = 1
  for (const inset of [2, 5, 7]) {
    ctx.strokeRect(ox + inset + 0.5, oy + inset + 0.5, TILE_PX - 2 * inset - 1, TILE_PX - 2 * inset - 1)
  }

  // leaves
  ;[ox, oy] = at(T_LEAVES)
  noiseTile(ctx, ox, oy, [50, 105, 32], 0.16, rand)

  // planks: horizontal boards with seams
  ;[ox, oy] = at(T_PLANKS)
  for (let board = 0; board < 4; board++) {
    const tone = 1 + (rand() * 2 - 1) * 0.07
    const seamX = 1 + Math.floor(rand() * (TILE_PX - 2))
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const seam = y === 0 || x === seamX
        const c = shade(seam ? [110, 88, 55] : [156, 127, 78], tone * (1 + (rand() * 2 - 1) * 0.04))
        px(ctx, ox + x, oy + board * 4 + y, c[0], c[1], c[2])
      }
    }
  }

  // bedrock
  ;[ox, oy] = at(T_BEDROCK)
  noiseTile(ctx, ox, oy, [60, 60, 60], 0.4, rand)
}

export function createAtlasTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_COLS * TILE_PX
  canvas.height = ATLAS_ROWS * TILE_PX
  const ctx = canvas.getContext('2d')!
  drawAtlas(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** Cube face table: corner offsets (CCW seen from outside) and per-corner UVs. */
interface FaceDef {
  dir: [number, number, number]
  corners: { pos: [number, number, number]; uv: [number, number] }[]
  shade: number
}

export const FACES: FaceDef[] = [
  {
    // +x
    dir: [1, 0, 0],
    shade: 0.72,
    corners: [
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] },
      { pos: [1, 0, 0], uv: [1, 0] },
    ],
  },
  {
    // -x
    dir: [-1, 0, 0],
    shade: 0.72,
    corners: [
      { pos: [0, 1, 0], uv: [0, 1] },
      { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [0, 0, 1], uv: [1, 0] },
    ],
  },
  {
    // +y (top)
    dir: [0, 1, 0],
    shade: 1.0,
    corners: [
      { pos: [0, 1, 1], uv: [1, 1] },
      { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 0] },
    ],
  },
  {
    // -y (bottom)
    dir: [0, -1, 0],
    shade: 0.5,
    corners: [
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] },
      { pos: [0, 0, 0], uv: [0, 1] },
    ],
  },
  {
    // +z
    dir: [0, 0, 1],
    shade: 0.86,
    corners: [
      { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 1, 1], uv: [0, 1] },
      { pos: [1, 1, 1], uv: [1, 1] },
    ],
  },
  {
    // -z
    dir: [0, 0, -1],
    shade: 0.86,
    corners: [
      { pos: [1, 0, 0], uv: [0, 0] },
      { pos: [0, 0, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 1] },
    ],
  },
]

/** Map an atlas tile + 0..1 corner UV to final atlas UVs, with a half-texel inset. */
export function tileUV(tile: number, u: number, v: number): [number, number] {
  const col = tile % ATLAS_COLS
  const row = Math.floor(tile / ATLAS_COLS)
  const atlasW = ATLAS_COLS * TILE_PX
  const atlasH = ATLAS_ROWS * TILE_PX
  // face v grows up, canvas y grows down: sample the tile inverted in y
  const uPx = col * TILE_PX + 0.5 + u * (TILE_PX - 1)
  const vPx = row * TILE_PX + 0.5 + (1 - v) * (TILE_PX - 1)
  // canvas y grows down, texture v grows up (CanvasTexture flips)
  return [uPx / atlasW, 1 - vPx / atlasH]
}

/** Tile index of one face of a block. face indexes into FACES. */
export function blockFaceTile(block: number, face: number): number {
  return BLOCK_TILES[block][face]
}
