import { createSignal, type Component } from 'solid-js'

const App: Component = () => {
  const [updated, setUpdated] = createSignal(false)

  return (
    <main class="relative flex min-h-screen flex-col items-center justify-center gap-10 overflow-hidden bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950 p-8 text-white">
      <div class="glow glow-a" aria-hidden="true" />
      <div class="glow glow-b" aria-hidden="true" />

      <section class="card relative flex flex-col items-center gap-4 rounded-3xl border border-white/15 bg-white/10 px-8 py-14 text-center shadow-2xl backdrop-blur-md sm:px-14">
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-blue-200">
          vite + solid + tailwind
        </p>

        <h1
          class="cursor-pointer select-none text-[clamp(3rem,12vw,5.5rem)] font-black leading-tight tracking-wide transition-transform duration-150 hover:scale-105 active:scale-95"
          title="タップしてみて！"
          onClick={() => setUpdated((v) => !v)}
        >
          {updated() ? '更新しました' : 'こんにちは'}
        </h1>

        <p class="max-w-xs text-lg leading-relaxed text-blue-100">
          {updated()
            ? 'タップして元に戻せます。'
            : '下の文字をタップして、ページを更新してみて！'}
        </p>

        <span class="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold">
          <span class="dot" aria-hidden="true" />
          Deployed with GitHub Actions
        </span>
      </section>

      <footer class="text-xs uppercase tracking-[0.25em] text-blue-200/70">
        vite-practice
      </footer>
    </main>
  )
}

export default App
