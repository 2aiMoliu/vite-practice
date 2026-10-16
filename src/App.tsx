import { Show, createSignal, type Component } from 'solid-js'
import GameView from './components/Game'

const App: Component = () => {
  const [updated, setUpdated] = createSignal(false)
  const [screen, setScreen] = createSignal<'page' | 'game'>('page')

  return (
    <Show when={screen() === 'game'} fallback={
      <main class="flex min-h-screen items-center justify-center bg-blue-700 text-white">
        <h1
          class="cursor-pointer select-none text-4xl font-bold"
          onClick={() => setUpdated((v) => !v)}
        >
          {updated() ? '更新しました' : 'こんにちは'}
        </h1>
        <button
          class="fixed bottom-4 left-4 rounded-lg bg-white/15 px-4 py-2 font-semibold shadow backdrop-blur transition hover:bg-white/25"
          onClick={() => setScreen('game')}
        >
          🧱 Voxelcraft
        </button>
      </main>
    }>
      <GameView onExit={() => setScreen('page')} />
    </Show>
  )
}

export default App
