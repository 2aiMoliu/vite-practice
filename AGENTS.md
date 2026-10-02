# AGENTS.md — vite-practice

Guidelines for any agent or human working in this repo.

## What this repo is

A **Showcase**: one page whose entire job is to impress visitors — by achieving
its functional design with minimal, readable code. Restraint is deliberate;
the page being small is not an invitation to decorate it (2025-10: a decorated
version was built and rolled back the same day).

The functional contract of the page:
- Blue background, white text.
- Tapping the text flips it between こんにちは and 更新しました.

## The rule: no Extras

**Extras** are anything the user did not explicitly ask for. Add none — not
even obviously-good ones. Change exactly what was asked; everything else
stays as-is. This covers all surfaces:

- **UI/content** — an element earns its place only by serving the tap
  interaction (YAGNI).
- **Dependencies** — no new packages, plugins, or config unasked.
- **Files & structure** — no new files, components, or refactors unasked.
- **CI & tooling** — no new workflows, checks, or scripts unasked.
- **Docs** — no unrequested README sections or comment blocks.

## Proposals

New features, better architecture, and refactors are welcome — with approval.
Implement the given one-shot task faithfully first; afterwards, if you see an
improvement, list proposals briefly and wait. Only mechanical fixes (typos,
broken formatting) go free.

## Code style trajectory

The stack may change; the trajectory does not:
- Fewest moving parts that achieve the behavior.
- Framework-idiomatic; no speculative abstraction.
- Prefer deleting code over reshaping it.

## Definition of done

A change is done when: `npm run check && npm run build` passes; the change is
pushed to `main`; the GitHub Actions run is green; and
https://2aimoliu.github.io/vite-practice/ shows the expected content.

## Growth rule

Keep everything in this file. If it exceeds 200 lines, graduate glossary
terms (Showcase, Extras) to `CONTEXT.md`.
