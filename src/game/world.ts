import * as THREE from 'three'
import { Block, FACES, blockFaceTile, tileUV } from './blocks'

export const CHUNK = 16
export const WORLD_CHUNKS = 8
export const WORLD_SIZE = CHUNK * WORLD_CHUNKS // 128 x 128 blocks
export const WORLD_HEIGHT = 64

/** Deterministic 2D hash in [0, 1). */
function hash2(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1) ^ Math.imul(seed, 0x9e3779b9)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Smooth value noise in [0, 1]. */
function valueNoise(x: number, z: number, seed: number): number {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const tx = smooth(x - xi)
  const tz = smooth(z - zi)
  const a = hash2(xi, zi, seed)
  const b = hash2(xi + 1, zi, seed)
  const c = hash2(xi, zi + 1, seed)
  const d = hash2(xi + 1, zi + 1, seed)
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz)
}

/** Four octaves of value noise in [0, 1]. */
function fbm(x: number, z: number, seed: number): number {
  let v = 0
  let amp = 1
  let freq = 1
  let total = 0
  for (let o = 0; o < 4; o++) {
    v += valueNoise(x * freq, z * freq, seed + o * 101) * amp
    total += amp
    amp *= 0.5
    freq *= 2
  }
  return v / total
}

export class World {
  data = new Uint8Array(WORLD_SIZE * WORLD_HEIGHT * WORLD_SIZE)

  private idx(x: number, y: number, z: number): number {
    return (y * WORLD_SIZE + z) * WORLD_SIZE + x
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < WORLD_SIZE && y >= 0 && y < WORLD_HEIGHT && z >= 0 && z < WORLD_SIZE
  }

  /** Block id at a cell; air when out of bounds (so world-edge faces render). */
  get(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return Block.Air
    return this.data[this.idx(x, y, z)]
  }

  /** Collision query: outside the world horizontally and below it are solid walls. */
  isSolid(x: number, y: number, z: number): boolean {
    if (y < 0) return true
    if (y >= WORLD_HEIGHT) return false
    if (x < 0 || x >= WORLD_SIZE || z < 0 || z >= WORLD_SIZE) return true
    return this.data[this.idx(x, y, z)] !== Block.Air
  }

  set(x: number, y: number, z: number, block: number): void {
    if (!this.inBounds(x, y, z)) return
    this.data[this.idx(x, y, z)] = block
  }

  /** First free y above the ground at (x, z); scans from the top. */
  surfaceY(x: number, z: number): number {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      if (this.get(x, y, z) !== Block.Air) return y + 1
    }
    return 0
  }

  generate(seed: number): void {
    for (let z = 0; z < WORLD_SIZE; z++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        const h = Math.max(2, Math.floor(8 + fbm(x / 48, z / 48, seed) * 26))
        const sandy = h <= 13
        this.set(x, 0, z, Block.Bedrock)
        for (let y = 1; y <= h; y++) {
          if (y === h) this.set(x, y, z, sandy ? Block.Sand : Block.Grass)
          else if (y >= h - 3) this.set(x, y, z, sandy ? Block.Sand : Block.Dirt)
          else this.set(x, y, z, Block.Stone)
        }
      }
    }
    this.plantTrees(seed)
  }

  private plantTrees(seed: number): void {
    const MARGIN = 2
    for (let z = MARGIN; z < WORLD_SIZE - MARGIN; z++) {
      for (let x = MARGIN; x < WORLD_SIZE - MARGIN; x++) {
        if (hash2(x, z, seed + 999) >= 0.006) continue
        const h = this.surfaceY(x, z) - 1
        if (this.get(x, h, z) !== Block.Grass) continue
        if (h + 7 >= WORLD_HEIGHT) continue
        const trunk = 4 + Math.floor(hash2(x, z, seed + 55) * 3) // 4..6
        const top = h + trunk
        // leaf blob: two 5x5 layers, a 3x3 layer, and a cap cross
        for (let dy = -2; dy <= 1; dy++) {
          const r = dy < 0 ? 2 : 1
          for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
              if (dy < 0 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue // ragged corners
              if (dy === 1 && Math.abs(dx) + Math.abs(dz) > 1) continue // plus-shaped cap
              const lx = x + dx
              const ly = top + dy
              const lz = z + dz
              if (this.get(lx, ly, lz) === Block.Air) this.set(lx, ly, lz, Block.Leaves)
            }
          }
        }
        for (let y = h + 1; y <= top; y++) this.set(x, y, z, Block.Log)
      }
    }
  }

  /** Visible-face mesh for one chunk column. Returns null for an empty chunk. */
  buildChunkGeometry(cx: number, cz: number): THREE.BufferGeometry | null {
    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const x0 = cx * CHUNK
    const z0 = cz * CHUNK

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = z0; z < z0 + CHUNK; z++) {
        for (let x = x0; x < x0 + CHUNK; x++) {
          const block = this.get(x, y, z)
          if (block === Block.Air) continue
          for (let f = 0; f < FACES.length; f++) {
            const face = FACES[f]
            const [dx, dy, dz] = face.dir
            if (this.get(x + dx, y + dy, z + dz) !== Block.Air) continue
            const tile = blockFaceTile(block, f)
            const base = positions.length / 3
            for (const corner of face.corners) {
              positions.push(x + corner.pos[0], y + corner.pos[1], z + corner.pos[2])
              const [u, v] = tileUV(tile, corner.uv[0], corner.uv[1])
              uvs.push(u, v)
              colors.push(face.shade, face.shade, face.shade)
            }
            indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3)
          }
        }
      }
    }

    if (positions.length === 0) return null
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
    return geometry
  }
}
