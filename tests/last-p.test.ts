import assert from "node:assert/strict";
import test from "node:test";

import { extractText, fallbackIntent, limitWords } from "../extensions/last-p.ts";

test("extractText joins text blocks and ignores non-text content", () => {
	assert.equal(
		extractText([
			{ type: "text", text: "Fix the login" },
			{ type: "image", data: "ignored" },
			{ type: "text", text: "flow" },
		]),
		"Fix the login\nflow",
	);
});

test("limitWords returns safe, punctuation-free intent labels", () => {
	assert.equal(
		limitWords("\u001b[31mIntent: Fix login!\u001b[0m now."),
		"Fix login now",
	);
	assert.equal(limitWords("one two three four five six"), "one two three four five");
});

test("fallbackIntent preserves prompt context when no model is available", () => {
	assert.equal(fallbackIntent("Fix the login flow before release"), "Fix the login flow before");
});

test("fallbackIntent handles prompts without displayable words", () => {
	assert.equal(fallbackIntent("!!!"), "Image request");
});
