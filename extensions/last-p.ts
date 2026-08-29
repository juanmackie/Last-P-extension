/**
 * Last P
 *
 * Shows a short intent label for the most recent user prompt in pi's status bar.
 * The fixed status key means each new prompt replaces the previous intent.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "last-p";
const MAX_WORDS = 5;
const MAX_PROMPT_LENGTH = 12_000;
const MAX_INTENT_TIME_MS = 5_000;

const ANSI_ESCAPE_SEQUENCE =
	/\u001B(?:\][^\u0007]*(?:\u0007|\u001B\\)|\[[0-?]*[ -/]*[@-~]|[@-_])/g;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g;
const NON_WORD_CHARACTERS = /[^\p{L}\p{M}\p{N}\s]/gu;

const INTENT_SYSTEM_PROMPT = [
	"You identify the intended outcome of user prompts for a terminal status bar.",
	"Return only a concise, action-oriented intent in 1 to 5 words.",
	"Describe what the user wants accomplished, not the prompt's opening words.",
	"Use plain text with no quotation marks, labels, bullets, punctuation, or explanation.",
].join(" ");

type TextBlock = { type?: string; text?: string };

export function extractText(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}

	if (!Array.isArray(content)) {
		return "";
	}

	return content
		.filter((part): part is TextBlock => {
			return Boolean(part && typeof part === "object" && "text" in part);
		})
		.map((part) => (typeof part.text === "string" ? part.text : ""))
		.filter(Boolean)
		.join("\n")
		.trim();
}

export function limitWords(text: string): string {
	const withoutLabel = text
		.replace(ANSI_ESCAPE_SEQUENCE, "")
		.replace(CONTROL_CHARACTERS, " ")
		.replace(/^\s*(?:summary|title|topic|intent)\s*:\s*/i, "")
		.replace(NON_WORD_CHARACTERS, " ")
		.trim();

	return withoutLabel.split(/\s+/).filter(Boolean).slice(0, MAX_WORDS).join(" ");
}

export function fallbackIntent(prompt: string): string {
	return limitWords(prompt) || "Image request";
}

function getLastUserPrompt(ctx: ExtensionContext): string | undefined {
	const branch = ctx.sessionManager.getBranch();

	for (let index = branch.length - 1; index >= 0; index--) {
		const entry = branch[index];
		if (entry?.type !== "message" || entry.message.role !== "user") {
			continue;
		}

		const prompt = extractText(entry.message.content);
		if (prompt) {
			return prompt;
		}
	}

	return undefined;
}

function setStatus(ctx: ExtensionContext, text: string): void {
	const theme = ctx.ui.theme;
	ctx.ui.setStatus(
		STATUS_KEY,
		theme.fg("accent", "●") + theme.fg("dim", ` Last P: ${text}`),
	);
}

export default function (pi: ExtensionAPI) {
	let requestId = 0;
	let activeController: AbortController | undefined;

	const clearStatus = (ctx: ExtensionContext): void => {
		ctx.ui.setStatus(STATUS_KEY, undefined);
	};

	const identifyPromptIntent = async (
		prompt: string,
		ctx: ExtensionContext,
		id: number,
	): Promise<void> => {
		activeController?.abort();
		const controller = new AbortController();
		activeController = controller;
		setStatus(ctx, "Identifying intent…");

		const model = ctx.model;
		let intent = "";
		const timeoutId = setTimeout(() => controller.abort(), MAX_INTENT_TIME_MS);

		try {
			if (model && ctx.modelRegistry.hasConfiguredAuth(model)) {
				try {
					const response = await ctx.modelRegistry.complete(
						model,
						{
							systemPrompt: INTENT_SYSTEM_PROMPT,
							messages: [
								{
									role: "user",
									content: [
										{
											type: "text",
											text: prompt.slice(0, MAX_PROMPT_LENGTH),
										},
									],
									timestamp: Date.now(),
								},
							],
						},
						{
							signal: controller.signal,
							cacheRetention: "none",
							maxTokens: 32,
							timeoutMs: MAX_INTENT_TIME_MS,
							maxRetries: 0,
						},
					);

					if (response.stopReason !== "aborted") {
						intent = limitWords(
							response.content
								.filter((part): part is { type: "text"; text: string } => part.type === "text")
								.map((part) => part.text)
								.join(" "),
						);
					}
				} catch {
					// A status indicator should never interrupt the user's main prompt.
				}
			}
		} finally {
			clearTimeout(timeoutId);
			if (activeController === controller) {
				activeController = undefined;
			}
		}

		if (id !== requestId || controller.signal.aborted) {
			return;
		}

		setStatus(ctx, intent || fallbackIntent(prompt));
	};

	const startIntent = (prompt: string, ctx: ExtensionContext): void => {
		const id = ++requestId;
		void identifyPromptIntent(prompt, ctx, id);
	};

	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) {
			return;
		}

		const prompt = getLastUserPrompt(ctx);
		if (!prompt) {
			clearStatus(ctx);
			return;
		}

		startIntent(prompt, ctx);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (!ctx.hasUI) {
			return;
		}

		startIntent(event.prompt.trim() || "Image request", ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		requestId++;
		activeController?.abort();
		activeController = undefined;
		if (ctx.hasUI) {
			clearStatus(ctx);
		}
	});
}
