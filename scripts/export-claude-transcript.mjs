#!/usr/bin/env node
// Renders a Claude Code session transcript (the JSONL file Claude Code keeps
// under ~/.claude/projects/<project>/<session-id>.jsonl) as Markdown, verbatim.
//
//   node scripts/export-claude-transcript.mjs <session.jsonl> <out.md> \
//        [--redact-env-file .env] [--redact-text <string>]... [--include-thinking]
//
// Included, unedited: every user message, every assistant message, every tool
// call (name + full JSON input) and every tool result, in order, with timestamps.
// Omitted, and marked in place where they occur:
//   - <system-reminder> blocks the Claude Code harness injects into user turns
//     (environment/account context, not something the user or model wrote);
//   - binary image data (replaced by "[image omitted]");
//   - model "thinking" blocks (stored redacted/empty; opt in with --include-thinking);
//   - harness bookkeeping records (API request blobs, file-history snapshots, titles).
// With --redact-env-file, the values of secret-looking keys in that file
// (…SECRET, …PASSWORD, …TOKEN, …KEY) are replaced by [REDACTED] if they appear.
// Each --redact-text value (e.g. a personal e-mail address) is replaced too.
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) {
  console.error(
    'Usage: export-claude-transcript.mjs <session.jsonl> <out.md> [--redact-env-file <path>] [--include-thinking]',
  );
  process.exit(1);
}
const includeThinking = flags.includes('--include-thinking');
const envFileIndex = flags.indexOf('--redact-env-file');
const redactTexts = flags.flatMap((flag, index) =>
  flag === '--redact-text' && flags[index + 1] ? [flags[index + 1]] : [],
);
const secrets =
  envFileIndex === -1
    ? []
    : readFileSync(flags[envFileIndex + 1], 'utf8')
        .split('\n')
        .map((line) => line.match(/^([A-Z0-9_]*(SECRET|PASSWORD|TOKEN|KEY)[A-Z0-9_]*)=(.+)$/))
        .filter(Boolean)
        .map((match) => match[3].trim())
        .filter((value) => value.length >= 6);

const fence = (text, lang = '') => {
  const longestRun = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const ticks = '`'.repeat(longestRun + 1);
  return `${ticks}${lang}\n${text}\n${ticks}`;
};
const stripReminders = (text) =>
  text.replace(
    /<system-reminder>[\s\S]*?<\/system-reminder>/g,
    '[system-reminder injected by Claude Code omitted]',
  );
const asText = (content) =>
  typeof content === 'string'
    ? content
    : (content ?? [])
        .map((block) =>
          block.type === 'text'
            ? block.text
            : block.type === 'image'
              ? '[image omitted]'
              : `[${block.type} omitted]`,
        )
        .join('\n');

const lines = readFileSync(input, 'utf8').split('\n').filter(Boolean);
const out = [];
let sessionId = '';
let lastRole = '';

for (const line of lines) {
  const entry = JSON.parse(line);
  if ((entry.type !== 'user' && entry.type !== 'assistant') || entry.isMeta) continue;
  sessionId ||= entry.sessionId ?? '';
  const time = entry.timestamp ? new Date(entry.timestamp).toISOString() : '';
  const blocks =
    typeof entry.message?.content === 'string'
      ? [{ type: 'text', text: entry.message.content }]
      : (entry.message?.content ?? []);

  for (const block of blocks) {
    if (entry.type === 'user') {
      if (block.type === 'tool_result') {
        out.push(
          `#### Tool result${block.is_error ? ' (error)' : ''}\n\n${fence(stripReminders(asText(block.content)))}\n`,
        );
      } else {
        if (lastRole !== 'user') out.push(`---\n\n## User · ${time}\n`);
        lastRole = 'user';
        out.push(
          block.type === 'text' ? `${stripReminders(block.text)}\n` : `[${block.type} omitted]\n`,
        );
      }
      continue;
    }
    // assistant
    if (lastRole !== 'assistant') out.push(`---\n\n## Assistant (Claude Code) · ${time}\n`);
    lastRole = 'assistant';
    if (block.type === 'text') out.push(`${block.text}\n`);
    else if (block.type === 'tool_use')
      out.push(
        `#### Tool call: ${block.name}\n\n${fence(JSON.stringify(block.input, null, 2), 'json')}\n`,
      );
    else if (block.type === 'thinking' && includeThinking && block.thinking)
      out.push(`> _Reasoning:_ ${block.thinking.replace(/\n/g, '\n> ')}\n`);
  }
}

let markdown = [
  `# Claude Code session ${sessionId}`,
  '',
  `Rendered from the raw transcript by \`scripts/export-claude-transcript.mjs\` on ${new Date().toISOString()}.`,
  'Content is verbatim; only harness-injected reminders, image data and redacted thinking blocks are omitted (see the script header).',
  '',
  out.join('\n'),
].join('\n');
for (const secret of [...secrets, ...redactTexts])
  markdown = markdown.split(secret).join('[REDACTED]');

writeFileSync(output, markdown);
console.log(
  `Wrote ${output} (${(markdown.length / 1024).toFixed(0)} KiB, ${secrets.length} secret value(s) checked)`,
);
