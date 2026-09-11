# Last P extension agent contract

## Operating Standard

- Apply `C:\Users\juanm\Documents\GitHub\Vibe Coding Rules 10.md` (V10) as the repository operating standard; read it in full before substantive work.
- This file is the nearest-owning contract. It refines the parent policy with repository-specific facts and cannot weaken a mandatory parent rule; conflicts resolve to the parent.

## Scope and Ownership

- `extensions/last-p.ts` owns the entire pi extension implementation: status-bar rendering, prompt event handling, model request bounding, and sanitization.
- `tests/last-p.test.ts` owns the regression tests (text extraction, intent-label sanitization, word limits, image fallback).
- `README.md` documents installation (`pi install`), user-visible behaviour, and provider-quota disclosure.
- `package.json` owns package metadata, the `test` script, and the pi extension entry point (`pi.extensions` → `./extensions`). There are no other source directories.

## Constraints

- Keep the extension small and focused on the status-bar intent label. Do not add dependencies without a demonstrated need; runtime must stay dependency-free beyond pi (peer dependency `@earendil-works/pi-coding-agent` only).
- Preserve the host's prompt flow: intent requests are best-effort and bounded (at most 12,000 prompt characters, 32 output tokens, no retries, five-second timeout) so they can never delay or interrupt the user's prompt. Status updates must fail safely.
- Status text is limited to five sanitized words or fewer; image-only prompts show `Image request`; on missing model, missing auth, or request failure, fall back to the first five prompt words. Preserve these contracts.
- Sending each prompt to the active model provider is a documented privacy boundary with quota cost — do not widen what is transmitted or add providers without updating `README.md`'s disclosure.
- Follow V10 §5: status text is UI, so sanitization and fallback behavior are trust-boundary concerns; never emit unsanitized model output to the status bar.
- Use tabs and the existing TypeScript style in `extensions/`. The package is ESM (`"type": "module"`), run via Node's type stripping — no build step, no transpiler.

## Verification

- `npm test` (equivalent to `node --experimental-strip-types --test tests/last-p.test.ts`, Node.js ≥ 22.6) — evidenced in `package.json` scripts and `README.md`. Run before closeout.
- Type-check the extension against the installed pi API when dependencies are available; if a check cannot run, report the exact gap (V10 §5 evidence standard).
- No build or lint harness exists. Smallest runnable check beyond `npm test`: install locally with `pi install /absolute/path/to/last-p`, submit a prompt, and confirm the five-word status label, fallback, and shutdown clearing by hand. Do not publish verification commands beyond those evidenced here.
