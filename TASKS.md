# Task List (Review Findings)

Ordered by severity (High → Medium → Low). Source: recent changes review.

## High

- [x] Fix pending worktree intercepting all text (including commands) so users can still run /status, /stop, etc. (`src/handlers/text.ts:73`)
- [x] Tie pending worktree to both userId + chatId to avoid cross-chat confusion. (`src/session.ts:276`)
- [x] Add pending worktree expiry/timeout and clear it on /provider switch and session kill. (`src/session.ts:264`, `src/session.ts:295`, `src/session.ts:837`)
- [x] Enforce allowlist validation when switching workingDir via worktree/branch/merge. (`src/handlers/text.ts:94`, `src/handlers/callback.ts:708`, `src/handlers/callback.ts:819`, `src/session.ts:320`)
- [x] Add allowlist checks to sendfile callback to prevent arbitrary file exfiltration. (`src/handlers/callback.ts:732`)
- [x] Add hard safety for Codex file operations to respect ALLOWED_PATHS (not just prompt). (`src/session.ts:638`, `src/providers/codex-worker.js:37`)

## Medium

- [x] Add timeout to git exec to avoid hangs. (`src/worktree.ts:43`)
- [x] Guard `mkdirSync` in worktree creation with try/catch and user-friendly error. (`src/worktree.ts:444`)
- [x] Reconcile worktree base directory with ALLOWED_PATHS (or auto-extend allowlist). (`src/worktree.ts:444`, `src/config.ts:102`, `src/security.ts:129`)
- [x] Clear pending messages on session kill / worktree switch to avoid cross-context execution. (`src/session.ts:157`, `src/session.ts:837`)
- [x] Support multiple pending worktree requests (at least scoped per chat) or reject with clearer feedback. (`src/session.ts:264`)
- [x] Clear pending worktree state when switching via branch callback. (`src/handlers/callback.ts:708`, `src/session.ts:287`)
- [x] Handle detached worktrees in worktree map to avoid wrong main path during merge. (`src/worktree.ts:89`, `src/worktree.ts:210`)
- [x] Warn/block on dirty working tree before /merge. (`src/handlers/commands.ts:582`)
- [x] Warn/block on dirty working tree before /worktree and /branch switches. (`src/handlers/commands.ts:499`, `src/handlers/commands.ts:538`)
- [x] Provide user feedback when branches are omitted due to callback length. (`src/handlers/commands.ts:562`)
- [x] Add paging/limit for long branch lists to avoid Telegram keyboard limits. (`src/handlers/commands.ts:562`)
- [x] Add callback length check for /merge (long branch names). (`src/handlers/commands.ts:602`)

## Low

- [x] Add callback length check for /diff view (long file paths). (`src/handlers/commands.ts:1140`)
- [x] Add file size limit + try/catch around diff file sending. (`src/handlers/callback.ts:916`)
- [x] Handle spawn errors for Codex worker to avoid uncaught failures. (`src/providers/codex.ts:150`)
- [x] Escape HTML for branch names in /branch and /merge messages. (`src/handlers/commands.ts:572`, `src/handlers/commands.ts:608`, `src/handlers/callback.ts:825`)
- [x] Either wire `queryQueue` into handlers or remove dead code + tests. (`src/query-queue.ts:57`, `src/handlers/streaming.ts:281`)
