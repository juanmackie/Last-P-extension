import assert from "node:assert/strict";
import test from "node:test";

import { extractText, fallbackSummary, limitWords } from "../extensions/last-p.ts";

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

test("limitWords returns safe, punctuation-free summaries", () => {
	assert.equal(
		limitWords("\u001b[31mSummary: Fix login!\u001b[0m now."),
		"Fix login now",
	);
	assert.equal(limitWords("one two three four five six"), "one two three four five");
});

test("fallbackSummary handles prompts without displayable words", () => {
	assert.equal(fallbackSummary("!!!"), "Image request");
});
