import * as THREE from 'three'
import { Block, HOTBAR, createAtlasTexture } from './blocks'
import { CHUNK, World, WORLD_CHUNKS, WORLD_SIZE } from './world'

export interface GameCallbacks {
  onLockChange: (locked: boolean) => void
  onSelect: (index: number) => void
}

interface RayHit {
  x: number
  y: number
  z: number
  nx: number
  ny: number
  nz: number
}

const EYE = 1.62
const HALF_W = 0.3
const PLAYER_H = 1.8
const GRAVITY = 28
const JUMP_V = 8.6
const SPEED = 4.5
const REACH = 6
const EPS = 1e-3

export class Game {
  private readonly canvas: HTMLCanvasElement
  private readonly cb: GameCallbacks
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly world = new World()
  private readonly chunks = new Map<string, THREE.Mesh>()
  private readonly material: THREE.MeshBasicMaterial
  private readonly highlight: THREE.LineSegments

  private readonly pos = new THREE.Vector3()
  private readonly vel = new THREE.Vector3()
  private yaw = Math.PI
  private pitch = 0
  private onGround = false
  private selected = 0
  private locked = false
  private readonly keys = new Set<string>()
  private raf = 0
  private last = performance.now()

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.canvas = canvas
    this.cb = cb
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 400)
    const sky = new THREE.Color(0x87ceeb)
    this.scene.background = sky
    this.scene.fog = new THREE.Fog(sky, 50, 140)

    this.world.generate((Math.random() * 0x7fffffff) | 0)
    this.material = new THREE.MeshBasicMaterial({
      map: createAtlasTexture(),
      vertexColors: true,
    })
    for (let cx = 0; cx < WORLD_CHUNKS; cx++) {
      for (let cz = 0; cz < WORLD_CHUNKS; cz++) this.rebuildChunk(cx, cz)
    }

    const c = WORLD_SIZE / 2
    this.pos.set(c + 0.5, this.world.surfaceY(c, c), c + 0.5)

    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    )
    this.highlight.visible = false
    this.scene.add(this.highlight)

    window.addEventListener('resize', this.onResize)
    document.addEventListener('pointerlockchange', this.onLockChangeDoc)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('wheel', this.onWheel)
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    canvas.addEventListener('contextmenu', this.onContextMenu)

    this.onResize()
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('pointerlockchange', this.onLockChangeDoc)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    for (const mesh of this.chunks.values()) mesh.geometry.dispose()
    this.chunks.clear()
    this.highlight.geometry.dispose()
    ;(this.highlight.material as THREE.Material).dispose()
    this.material.map?.dispose()
    this.material.dispose()
    this.renderer.dispose()
  }

  /** Request pointer lock; browsers may reject if called too soon after Esc. */
  lock(): void {
    const result = this.canvas.requestPointerLock() as unknown
    if (result instanceof Promise) result.catch(() => {})
  }

  private frame = (now: number): void => {
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min((now - this.last) / 1000, 0.05)
    this.last = now
    if (this.locked) this.step(dt)
    this.updateHighlight()
    this.renderer.render(this.scene, this.camera)
  }

  // --- input ---

  private onLockChangeDoc = (): void => {
    this.locked = document.pointerLockElement === this.canvas
    if (!this.locked) this.keys.clear()
    this.cb.onLockChange(this.locked)
  }

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return
    this.yaw -= e.movementX * 0.0022
    this.pitch -= e.movementY * 0.0022
    const limit = Math.PI / 2 - 0.01
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch))
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.locked) return
    if (e.button === 0) this.breakBlock()
    else if (e.button === 2) this.placeBlock()
  }

  private onWheel = (e: WheelEvent): void => {
    if (!this.locked) return
    const dir = e.deltaY > 0 ? 1 : -1
    this.selected = (this.selected + dir + HOTBAR.length) % HOTBAR.length
    this.cb.onSelect(this.selected)
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.locked) return
    this.keys.add(e.code)
    if (e.code === 'Space') e.preventDefault()
    const m = /^Digit([1-9])$/.exec(e.code)
    if (m) {
      const i = Number(m[1]) - 1
      if (i < HOTBAR.length) {
        this.selected = i
        this.cb.onSelect(i)
      }
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
  }

  private onBlur = (): void => {
    this.keys.clear()
  }

  private onContextMenu = (e: Event): void => {
    e.preventDefault()
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
  }

  // --- simulation ---

  private step(dt: number): void {
    const f = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0)
    const s = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0)
    if (f !== 0 || s !== 0) {
      const len = Math.hypot(f, s)
      const fn = f / len
      const sn = s / len
      const sin = Math.sin(this.yaw)
      const cos = Math.cos(this.yaw)
      // camera forward = (-sin, -cos), right = (cos, -sin)
      this.vel.x = (-sin * fn + cos * sn) * SPEED
      this.vel.z = (-cos * fn - sin * sn) * SPEED
    } else {
      this.vel.x = 0
      this.vel.z = 0
    }

    if (this.keys.has('Space') && this.onGround) this.vel.y = JUMP_V
    this.vel.y = Math.max(this.vel.y - GRAVITY * dt, -40)

    this.onGround = false
    this.moveAxis(0, this.vel.x * dt)
    this.moveAxis(2, this.vel.z * dt)
    this.moveAxis(1, this.vel.y * dt)

    this.camera.position.set(this.pos.x, this.pos.y + EYE, this.pos.z)
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
  }

  /** Move along one axis, then push the player out of any solid cell entered. */
  private moveAxis(axis: 0 | 1 | 2, amount: number): void {
    if (amount === 0) return
    this.pos.setComponent(axis, this.pos.getComponent(axis) + amount)
    const p = this.pos
    const x0 = Math.floor(p.x - HALF_W)
    const x1 = Math.floor(p.x + HALF_W - 1e-9)
    const y0 = Math.floor(p.y)
    const y1 = Math.floor(p.y + PLAYER_H - 1e-9)
    const z0 = Math.floor(p.z - HALF_W)
    const z1 = Math.floor(p.z + HALF_W - 1e-9)

    let clamped = false
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (!this.world.isSolid(x, y, z)) continue
          let cand: number
          if (axis === 0) cand = amount > 0 ? x - HALF_W - EPS : x + 1 + HALF_W + EPS
          else if (axis === 1) cand = amount > 0 ? y - PLAYER_H - EPS : y + 1 + EPS
          else cand = amount > 0 ? z - HALF_W - EPS : z + 1 + HALF_W + EPS
          p.setComponent(
            axis,
            amount > 0 ? Math.min(p.getComponent(axis), cand) : Math.max(p.getComponent(axis), cand),
          )
          clamped = true
        }
      }
    }
    if (clamped) {
      this.vel.setComponent(axis, 0)
      if (axis === 1 && amount < 0) this.onGround = true
    }
  }

  /** Voxel DDA raycast (Amanatides & Woo) from the camera. */
  private raycastBlock(): RayHit | null {
    const origin = this.camera.position
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    let x = Math.floor(origin.x)
    let y = Math.floor(origin.y)
    let z = Math.floor(origin.z)
    const stepX = dir.x > 0 ? 1 : -1
    const stepY = dir.y > 0 ? 1 : -1
    const stepZ = dir.z > 0 ? 1 : -1
    const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity
    const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity
    const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity
    let tMaxX =
      dir.x !== 0 ? (dir.x > 0 ? x + 1 - origin.x : origin.x - x) / Math.abs(dir.x) : Infinity
    let tMaxY =
      dir.y !== 0 ? (dir.y > 0 ? y + 1 - origin.y : origin.y - y) / Math.abs(dir.y) : Infinity
    let tMaxZ =
      dir.z !== 0 ? (dir.z > 0 ? z + 1 - origin.z : origin.z - z) / Math.abs(dir.z) : Infinity

    let nx = 0
    let ny = 0
    let nz = 0
    let t = 0
    while (t <= REACH) {
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX
        t = tMaxX
        tMaxX += tDeltaX
        nx = -stepX
        ny = 0
        nz = 0
      } else if (tMaxY < tMaxZ) {
        y += stepY
        t = tMaxY
        tMaxY += tDeltaY
        nx = 0
        ny = -stepY
        nz = 0
      } else {
        z += stepZ
        t = tMaxZ
        tMaxZ += tDeltaZ
        nx = 0
        ny = 0
        nz = -stepZ
      }
      if (t > REACH) break
      if (this.world.get(x, y, z) !== Block.Air) return { x, y, z, nx, ny, nz }
    }
    return null
  }

  private updateHighlight(): void {
    if (!this.locked) {
      this.highlight.visible = false
      return
    }
    const hit = this.raycastBlock()
    this.highlight.visible = hit !== null
    if (hit) this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)
  }

  // --- block editing ---

  private breakBlock(): void {
    const hit = this.raycastBlock()
    if (!hit || this.world.get(hit.x, hit.y, hit.z) === Block.Bedrock) return
    this.world.set(hit.x, hit.y, hit.z, Block.Air)
    this.rebuildAround(hit.x, hit.z)
  }

  private placeBlock(): void {
    const hit = this.raycastBlock()
    if (!hit) return
    const x = hit.x + hit.nx
    const y = hit.y + hit.ny
    const z = hit.z + hit.nz
    if (!this.world.inBounds(x, y, z)) return
    if (this.world.get(x, y, z) !== Block.Air) return
    if (this.intersectsPlayer(x, y, z)) return
    this.world.set(x, y, z, HOTBAR[this.selected])
    this.rebuildAround(x, z)
  }

  private intersectsPlayer(x: number, y: number, z: number): boolean {
    const p = this.pos
    return (
      p.x - HALF_W < x + 1 &&
      p.x + HALF_W > x &&
      p.y < y + 1 &&
      p.y + PLAYER_H > y &&
      p.z - HALF_W < z + 1 &&
      p.z + HALF_W > z
    )
  }

  /** Rebuild the chunk containing (x, z) and bordering chunks if on an edge. */
  private rebuildAround(x: number, z: number): void {
    const cx = Math.floor(x / CHUNK)
    const cz = Math.floor(z / CHUNK)
    this.rebuildChunk(cx, cz)
    if (x % CHUNK === 0) this.rebuildChunk(cx - 1, cz)
    if (x % CHUNK === CHUNK - 1) this.rebuildChunk(cx + 1, cz)
    if (z % CHUNK === 0) this.rebuildChunk(cx, cz - 1)
    if (z % CHUNK === CHUNK - 1) this.rebuildChunk(cx, cz + 1)
  }

  private rebuildChunk(cx: number, cz: number): void {
    if (cx < 0 || cx >= WORLD_CHUNKS || cz < 0 || cz >= WORLD_CHUNKS) return
    const key = `${cx},${cz}`
    const geometry = this.world.buildChunkGeometry(cx, cz)
    const mesh = this.chunks.get(key)
    if (mesh) {
      mesh.geometry.dispose()
      if (geometry) {
        mesh.geometry = geometry
      } else {
        this.scene.remove(mesh)
        this.chunks.delete(key)
      }
    } else if (geometry) {
      const m = new THREE.Mesh(geometry, this.material)
      m.matrixAutoUpdate = false
      this.scene.add(m)
      this.chunks.set(key, m)
    }
  }
}
