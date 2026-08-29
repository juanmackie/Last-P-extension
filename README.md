# Last P

A [pi](https://pi.dev) extension that shows a five-word summary of the latest user prompt in the status bar.

## Install

Install this package from a local checkout:

```bash
pi install /absolute/path/to/last-p
```

Pi loads the extension automatically after installation. The package has no runtime dependencies beyond pi.

## Behaviour

- A configured active model creates the summary.
- If no model is available, authentication is missing, or the request fails, Last P uses the first five words of the prompt.
- Image-only prompts display `Image request`.
- Summaries are limited to five words and sanitized for safe status-bar display.
- Summary requests use at most 12,000 prompt characters, 32 output tokens, no retries, and a five-second timeout.
- Each summary request sends the current prompt to the active model provider and may use provider quota. Disable or remove the extension if prompts must not be sent for this additional request.

The status is cleared when pi shuts down. A new prompt replaces the previous summary.

## Development

Run the focused regression tests with Node.js 22.6 or newer:

```bash
npm test
```

The tests cover text extraction, summary sanitization, word limits, and the image fallback. The extension itself runs in pi's extension runtime.
