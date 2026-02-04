/**
 * Voice message handler for Claude Telegram Bot.
 */

import https from "node:https";
import { unlinkSync, writeFileSync } from "node:fs";
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";

/**
 * Download a file using HTTPS with IPv4 forced.
 * This is needed because Node.js fetch may timeout on IPv6.
 */
async function downloadFileIPv4(url: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const parsedUrl = new URL(url);
		const options = {
			hostname: parsedUrl.hostname,
			port: 443,
			path: parsedUrl.pathname + parsedUrl.search,
			method: "GET",
			family: 4, // Force IPv4
		};

		const req = https.request(options, (res) => {
			const chunks: Buffer[] = [];
			res.on("data", (chunk) => chunks.push(chunk));
			res.on("end", () => resolve(Buffer.concat(chunks)));
			res.on("error", reject);
		});

		req.on("error", reject);
		req.setTimeout(30000, () => {
			req.destroy();
			reject(new Error("Download timeout"));
		});
		req.end();
	});
}
import {
	ALLOWED_USERS,
	MESSAGE_EFFECTS,
	TEMP_DIR,
	TRANSCRIPTION_AVAILABLE,
} from "../config";
import { formatUserError } from "../errors";
import { isAuthorized, rateLimiter } from "../security";
import { session } from "../session";
import {
	auditLogRateLimit,
	startTypingIndicator,
	transcribeVoice,
} from "../utils";

/**
 * Handle incoming voice messages.
 */
export async function handleVoice(ctx: Context): Promise<void> {
	const userId = ctx.from?.id;
	const username = ctx.from?.username || "unknown";
	const chatId = ctx.chat?.id;
	const voice = ctx.message?.voice;

	if (!userId || !voice || !chatId) {
		return;
	}

	// 1. Authorization check
	if (!isAuthorized(userId, ALLOWED_USERS)) {
		await ctx.reply("Unauthorized. Contact the bot owner for access.");
		return;
	}

	// 2. Check if transcription is available
	if (!TRANSCRIPTION_AVAILABLE) {
		await ctx.reply(
			"Voice transcription is not configured. Set OPENAI_API_KEY in .env",
		);
		return;
	}

	// 3. Rate limit check
	const [allowed, retryAfter] = rateLimiter.check(userId);
	if (!allowed && retryAfter !== undefined) {
		await auditLogRateLimit(userId, username, retryAfter);
		await ctx.reply(
			`⏳ Rate limited. Please wait ${retryAfter.toFixed(1)} seconds.`,
		);
		return;
	}

	// 4. Mark processing started (allows /stop to work during transcription/classification)
	const stopProcessing = session.startProcessing();

	// 5. Start typing indicator for transcription
	const typing = startTypingIndicator(ctx);

	let voicePath: string | null = null;

	try {
		// 6. Download voice file
		const file = await ctx.getFile();
		const timestamp = Date.now();
		voicePath = `${TEMP_DIR}/voice_${timestamp}.ogg`;

		// Download the file using IPv4
		const downloadUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
		const buffer = await downloadFileIPv4(downloadUrl);
		await Bun.write(voicePath, buffer);

		// 7. Transcribe
		const statusMsg = await ctx.reply("🎤 Transcribing...");

		const transcript = await transcribeVoice(voicePath);
		if (!transcript) {
			await ctx.api.deleteMessage(chatId, statusMsg.message_id);
			await ctx.reply("❌ Transcription failed.", {
				message_effect_id: MESSAGE_EFFECTS.THUMBS_DOWN,
			});
			stopProcessing();
			return;
		}

		// 8. Store transcript in temp file (Telegram callback_data has 64 byte limit)
		const transcriptId = `${userId}_${Date.now()}`;
		const transcriptFile = `${TEMP_DIR}/transcript_${transcriptId}.json`;
		writeFileSync(transcriptFile, JSON.stringify({ transcript, userId, chatId }));

		const keyboard = new InlineKeyboard()
			.text("✅ 確定", `voice:confirm:${transcriptId}`)
			.text("❌ 取消", "voice:cancel")
			.row()
			.text("✏️ 編輯補充", `voice:edit:${transcriptId}`);

		await ctx.api.deleteMessage(chatId, statusMsg.message_id);
		await ctx.reply(`🎤 語音轉錄完成：\n\n"${transcript}"\n\n請選擇操作：`, {
			reply_markup: keyboard,
			message_effect_id: MESSAGE_EFFECTS.FIRE,
		});

		// Processing will be handled by callback handler
		stopProcessing();
	} catch (error) {
		console.error("Error processing voice:", error);

		const errorStr = String(error);
		const isClaudeCodeCrash = errorStr
			.toLowerCase()
			.includes("process exited with code");

		if (errorStr.includes("abort") || errorStr.includes("cancel")) {
			// Only show "Query stopped" if it was an explicit stop, not an interrupt from a new message
			const wasInterrupt = session.consumeInterruptFlag();
			if (!wasInterrupt) {
				await ctx.reply("🛑 Query stopped.");
			}
		} else if (isClaudeCodeCrash) {
			await session.kill(); // Clear possibly corrupted session
			await ctx.reply(
				"⚠️ Claude Code crashed and the session was reset. Please try again.",
				{
					message_effect_id: MESSAGE_EFFECTS.THUMBS_DOWN,
				},
			);
		} else {
			const userMessage = formatUserError(
				error instanceof Error ? error : new Error(errorStr),
			);
			await ctx.reply(`❌ ${userMessage}`, {
				message_effect_id: MESSAGE_EFFECTS.THUMBS_DOWN,
			});
		}
	} finally {
		stopProcessing();
		typing.stop();

		// Clean up voice file
		if (voicePath) {
			try {
				unlinkSync(voicePath);
			} catch (error) {
				console.debug("Failed to delete voice file:", error);
			}
		}
	}
}
