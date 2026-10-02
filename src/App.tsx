import type { Component } from 'solid-js'

const App: Component = () => {
  return (
    <main class="page">
      <div class="glow glow-a" aria-hidden="true" />
      <div class="glow glow-b" aria-hidden="true" />

      <section class="card">
        <p class="kicker">vite + solid + typescript</p>
        <h1 class="title">こんにちは</h1>
        <p class="subtitle">Hello, world — my first site, live on the web.</p>
        <span class="badge">
          <span class="dot" aria-hidden="true" />
          Deployed with GitHub Actions
        </span>
      </section>

      <footer class="footer">vite-practice</footer>
    </main>
  )
}

export default App
