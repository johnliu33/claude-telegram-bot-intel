/**
 * User-friendly error message formatting.
 */

interface ErrorPattern {
	pattern: RegExp;
	message: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
	{
		pattern: /timeout/i,
		message:
			"The operation took too long. Try a simpler request or break it into smaller steps.",
	},
	{
		pattern: /too many requests|rate limit|retry after/i,
		message: "Claude is busy right now. Please wait a moment and try again.",
	},
	{
		pattern: /etimedout|econnreset|enotfound/i,
		message: "Connection issue. Please check your network and try again.",
	},
	{
		pattern: /cancelled|aborted/i,
		message: "Request was cancelled.",
	},
	{
		pattern: /unsafe command|blocked/i,
		message: "That operation isn't allowed for safety reasons.",
	},
	{
		pattern: /file access|outside allowed paths/i,
		message: "Claude can't access that file location.",
	},
	{
		pattern: /authentication|unauthorized|401/i,
		message: "Authentication issue. Please check your credentials.",
	},
];

/**
 * Convert technical errors to user-friendly messages.
 */
export function formatUserError(error: Error): string {
	const errorStr = error.message || String(error);

	for (const { pattern, message } of ERROR_PATTERNS) {
		if (pattern.test(errorStr)) {
			return message;
		}
	}

	// Generic fallback with truncation
	const truncated =
		errorStr.length > 200 ? errorStr.slice(0, 200) + "..." : errorStr;
	return `Error: ${truncated || "An unexpected error occurred"}`;
}
