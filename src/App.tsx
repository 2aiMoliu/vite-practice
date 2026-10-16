import { Show, createSignal, type Component } from 'solid-js'
import { Boxes } from 'lucide-solid'
import GameView from './components/Game'

type Phase = 'hello' | 'updated' | 'qr'
const next: Record<Phase, Phase> = { hello: 'updated', updated: 'qr', qr: 'hello' }

const App: Component = () => {
  const [phase, setPhase] = createSignal<Phase>('hello')
  const [screen, setScreen] = createSignal<'page' | 'game'>('page')

  return (
    <Show when={screen() === 'game'} fallback={
      <main class="flex min-h-screen items-center justify-center bg-blue-700 text-white">
        <h1
          class="cursor-pointer select-none text-4xl font-bold"
          onClick={() => setPhase(next[phase()])}
        >
          <Show
            when={phase() === 'qr'}
            fallback={phase() === 'updated' ? '更新しました' : 'こんにちは'}
          >
            <img
              alt="このページのQRコード"
              width="200"
              height="200"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=ffffff&bgcolor=1447e6&data=${encodeURIComponent(location.href)}`}
            />
          </Show>
        </h1>
        <button
          aria-label="Voxelcraft"
          class="fixed bottom-4 left-4 rounded-full bg-white/10 p-2.5 text-white/80 transition duration-500 hover:rotate-[360deg] hover:bg-white/20 hover:text-white"
          onClick={() => setScreen('game')}
        >
          <Boxes size={22} />
        </button>
      </main>
    }>
      <GameView onExit={() => setScreen('page')} />
    </Show>
  )
}

export default App
