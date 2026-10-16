import { For, createSignal, onCleanup, onMount, type Component } from 'solid-js'
import { Game } from '../game/game'
import { BLOCK_COLORS, BLOCK_NAMES, HOTBAR } from '../game/blocks'

interface GameViewProps {
  onExit: () => void
}

const GameView: Component<GameViewProps> = (props) => {
  let canvas!: HTMLCanvasElement
  const [locked, setLocked] = createSignal(false)
  const [selected, setSelected] = createSignal(0)
  const [started, setStarted] = createSignal(false)
  let game: Game | undefined

  onMount(() => {
    game = new Game(canvas, {
      onLockChange: (v) => {
        setLocked(v)
        if (v) setStarted(true)
      },
      onSelect: setSelected,
    })
    onCleanup(() => game?.dispose())
  })

  return (
    <div class="fixed inset-0 z-50 bg-black">
      <canvas ref={canvas} class="block h-full w-full" />

      {locked() && (
        <>
          <div class="pointer-events-none fixed left-1/2 top-1/2 mix-blend-difference">
            <div class="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white" />
            <div class="absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 bg-white" />
          </div>

          <div class="pointer-events-none fixed bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
            <div class="text-sm font-medium text-white drop-shadow">
              {BLOCK_NAMES[HOTBAR[selected()]]}
            </div>
            <div class="flex gap-1">
              <For each={HOTBAR}>
                {(block, i) => (
                  <div
                    class={`relative flex h-11 w-11 items-center justify-center border-2 ${
                      i() === selected()
                        ? 'border-white bg-white/25'
                        : 'border-white/40 bg-black/30'
                    }`}
                  >
                    <div class="h-7 w-7" style={{ background: BLOCK_COLORS[block] }} />
                    <span class="absolute left-0.5 top-0 text-[10px] font-bold text-white/80">
                      {i() + 1}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </>
      )}

      {!locked() && !started() && (
        <div class="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
          <div class="w-full max-w-sm rounded-lg bg-slate-800/90 p-6 text-white shadow-xl">
            <h2 class="mb-1 text-2xl font-bold">Voxelcraft</h2>
            <p class="mb-4 text-sm text-white/60">A tiny block world. Dig, build, explore.</p>
            <ul class="mb-5 space-y-1 text-sm text-white/80">
              <li>Move — WASD · Jump — Space</li>
              <li>Look — Mouse</li>
              <li>Break — Left click · Place — Right click</li>
              <li>Select block — 1–7 or Scroll</li>
              <li>Menu — Esc</li>
            </ul>
            <button
              class="w-full rounded bg-blue-600 py-2 font-semibold hover:bg-blue-500"
              onClick={() => game?.lock()}
            >
              Play
            </button>
            <button
              class="mt-2 w-full rounded py-2 text-sm text-white/60 hover:text-white"
              onClick={props.onExit}
            >
              Back to page
            </button>
            <p class="mt-3 text-center text-xs text-white/35">
              Needs a mouse and keyboard.
            </p>
          </div>
        </div>
      )}

      {!locked() && started() && (
        <div class="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
          <div class="w-full max-w-xs rounded-lg bg-slate-800/90 p-6 text-center text-white shadow-xl">
            <h2 class="mb-5 text-xl font-bold">Paused</h2>
            <button
              class="w-full rounded bg-blue-600 py-2 font-semibold hover:bg-blue-500"
              onClick={() => game?.lock()}
            >
              Resume
            </button>
            <button
              class="mt-2 w-full rounded py-2 text-sm text-white/60 hover:text-white"
              onClick={props.onExit}
            >
              Exit game
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameView
