# Repository Contract

## Scope
- `extensions/` contains the pi extension implementation.
- `README.md` documents installation and user-visible behaviour.
- `package.json` defines package metadata and the pi extension entry point.

## Development
- Keep the extension small and focused on the status-bar summary.
- Do not add dependencies without a demonstrated need.
- Preserve the host application's prompt flow; status updates must fail safely.
- Keep status text to five sanitized words or fewer.
- Bound best-effort model requests so they cannot delay or interrupt the user's prompt.
- Use tabs and the existing TypeScript style in `extensions/`.

## Verification
- Run `npm test` before closeout.
- Type-check the extension against the installed pi API when dependencies are available.
- If a check cannot run, report the exact gap.
