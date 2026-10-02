import { createSignal, type Component } from 'solid-js'

const App: Component = () => {
  const [updated, setUpdated] = createSignal(false)

  return (
    <main class="flex min-h-screen items-center justify-center bg-blue-700 text-white">
      <h1
        class="cursor-pointer select-none text-4xl font-bold"
        onClick={() => setUpdated((v) => !v)}
      >
        {updated() ? '更新しました' : 'こんにちは'}
      </h1>
    </main>
  )
}

export default App
