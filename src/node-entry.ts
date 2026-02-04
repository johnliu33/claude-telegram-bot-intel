/**
 * Node.js entry point for Claude Telegram Bot
 * Loads environment variables and Bun polyfills before starting the bot
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns";
import { Agent } from "node:https";

// Force IPv4 to avoid IPv6 connection issues
dns.setDefaultResultOrder("ipv4first");

// Create HTTPS agent with IPv4 family and longer timeout
const agent = new Agent({
  family: 4,
  timeout: 30000,
  keepAlive: true,
});

// Override global fetch to use IPv4 agent
const originalFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const newInit = {
    ...init,
    // @ts-ignore - dispatcher is supported in Node.js fetch
    dispatcher: agent,
  };
  return originalFetch(input, newInit);
};

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

// Load environment variables from .env file in project root
import { config } from "dotenv";
config({ path: resolve(projectRoot, ".env") });

// Load Bun API polyfills
import "./bun-polyfill.js";

// Now import and run the bot
import "./bot.js";
