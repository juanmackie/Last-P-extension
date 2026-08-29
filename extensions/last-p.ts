/**
 * Last P
 *
 * Shows a short summary of the most recent user prompt in pi's status bar.
 * The fixed status key means each new prompt replaces the previous summary.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "last-p";
const MAX_WORDS = 5;
const MAX_PROMPT_LENGTH = 12_000;

const SUMMARY_SYSTEM_PROMPT = [
	"You summarize user prompts for a terminal status bar.",
	"Return only a useful summary in 1 to 5 words.",
	"Use plain text with no quotation marks, labels, bullets, punctuation, or explanation.",
].join(" ");

type TextBlock = { type?: string; text?: string };

function extractText(content: unknown): string {
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

function limitWords(text: string): string {
	const withoutLabel = text
		.replace(/^\s*(?:summary|title|topic)\s*:\s*/i, "")
		.replace(/[\r\n]+/g, " ")
		.replace(/^["'`]+|["'`]+$/g, "")
		.trim();

	return withoutLabel.split(/\s+/).filter(Boolean).slice(0, MAX_WORDS).join(" ");
}

function fallbackSummary(prompt: string): string {
	return limitWords(prompt) || "Image-based request";
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

	const summarizePrompt = async (
		prompt: string,
		ctx: ExtensionContext,
		id: number,
	): Promise<void> => {
		activeController?.abort();
		const controller = new AbortController();
		activeController = controller;
		setStatus(ctx, "Summarizing…");

		const model = ctx.model;
		let summary = "";

		if (model && ctx.modelRegistry.hasConfiguredAuth(model)) {
			try {
				const response = await ctx.modelRegistry.complete(
					model,
					{
						systemPrompt: SUMMARY_SYSTEM_PROMPT,
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
					{ signal: controller.signal, cacheRetention: "none" },
				);

				if (response.stopReason !== "aborted") {
					summary = limitWords(
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

		if (id !== requestId || controller.signal.aborted) {
			return;
		}

		setStatus(ctx, summary || fallbackSummary(prompt));
	};

	const startSummary = (prompt: string, ctx: ExtensionContext): void => {
		const id = ++requestId;
		void summarizePrompt(prompt, ctx, id);
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

		startSummary(prompt, ctx);
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (!ctx.hasUI) {
			return;
		}

		startSummary(event.prompt || "Image-based request", ctx);
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
