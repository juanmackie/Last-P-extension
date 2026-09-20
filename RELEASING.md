# Releasing

A release is only done when every surface below agrees on the same version.

## Surfaces

| Surface | What it is | How it gets the version |
|---------|------------|-------------------------|
| npm registry | Source of truth. `pi install npm:last-p` reads this. | `npm publish` |
| [pi.dev/packages](https://pi.dev/packages/last-p) | Gallery of every npm package tagged `pi-package`. Derived, never edited by hand. | automatic, minutes after publish |
| git | Provenance for the tarball. | commit + `v<version>` tag |
| README | Install instructions. | must match reality |
| Local installs | `~/.pi/agent/settings.json` — a local path entry tracks the working tree, an `npm:` entry does not. | `pi update npm:last-p` |

## Steps

```bash
# 1. Everything the tarball ships must be committed — publish the repo, not the working tree.
git status --short                     # expect no surprises
npm test                               # also runs via prepublishOnly

# 2. Version bump.
npm version patch --no-git-tag-version
#   ...edit README if user-visible behaviour or the quota disclosure changed...

# 3. Commit the bump first — the published tarball must correspond to a commit.
git commit -am "release v$(node -p "require('./package.json').version")"

# 4. Publish. Needs an authenticated npm session: `npm login`, then `npm whoami`.
npm publish

# 5. Verify npm is live before tagging, so the tag never points at an unpublished commit.
npm view last-p version dist.tarball

# 6. Tag that commit and push. Annotated (-a): `--follow-tags` only pushes annotated tags.
git tag -a "v$(node -p "require('./package.json').version")" -m "release v$(node -p "require('./package.json').version")"
git push origin main --follow-tags

# 7. Verify the gallery picked it up (it lags npm by a few minutes; 404 here means not listed).
curl -s -o /dev/null -w "%{http_code}\n" https://pi.dev/packages/last-p
```

## Check before publishing

- `npm pack --dry-run` lists the files you expect. `files` in `package.json` gates this.
- `pi-package` is still in `keywords` and `pi.extensions` still resolves. Drop either one and the package
  silently disappears from the gallery.
- Behaviour contracts still hold: five sanitized words or fewer, `Image request` for image-only prompts,
  first-five-prompt-words fallback when the model is missing or the request fails.
- The README quota disclosure still describes what is transmitted. Widening what is sent to the provider
  is a user-visible change and belongs in the same release.

## Development setup

Your pi must run your checkout, not the tarball — otherwise you cannot see your own edits.

```bash
pi install "C:/Users/juanm/Documents/GitHub/Last P extension"   # dev: working tree, /reload picks up edits
pi install npm:last-p                                          # users: unpinned, so `pi update --extensions` works
```

- Install **one** form at a time. A local path plus an `npm:` entry loads the extension twice, and each
  prompt then triggers two intent requests against your provider quota.
- Verify what users actually get with a throwaway install that leaves settings untouched:

```bash
pi -e npm:last-p
```
