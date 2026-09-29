/**
 * DeepWiki MCP client (https://mcp.deepwiki.com/mcp).
 * DeepWiki only knows public repositories, so private repos must never be sent here:
 * callers check `repo.private` first. The server is stateless, so no handshake is needed.
 */

const ENDPOINT = 'https://mcp.deepwiki.com/mcp';

interface McpEnvelope {
  result?: {
    content?: { type: string; text?: string }[];
    structuredContent?: { result?: string };
    isError?: boolean;
  };
  error?: { message: string };
}

/** The stream mixes pings and progress notifications with the answer; return the message that carries the result. */
function parseSse(body: string): McpEnvelope | null {
  const lines = body.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim());
  const candidates = lines.length ? lines : [body.trim()];
  for (const raw of candidates) {
    try {
      const env = JSON.parse(raw) as McpEnvelope;
      if (env.result || env.error) return env;
    } catch {
      /* not JSON, keep looking */
    }
  }
  return null;
}

/** Asks DeepWiki a question about a public repository. Returns null when it cannot answer. */
export async function askDeepWiki(fullName: string, question: string, timeoutMs = 40000): Promise<string | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'ask_wiki_question', arguments: { repoName: fullName, question } },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const env = parseSse(await res.text());
    if (!env || env.error || env.result?.isError) return null;
    const text = env.result?.structuredContent?.result ?? env.result?.content?.find(c => c.type === 'text')?.text;
    if (!text || /not (yet )?(been )?indexed|repository not found|no wiki/i.test(text.slice(0, 200))) return null;
    return text;
  } catch {
    return null;
  }
}

export const DEEPWIKI_QUESTION =
  'Explain what this project does, its architecture (main components and how data flows), the technologies and frameworks it uses, ' +
  'and anything technically notable (scale, algorithms, integrations, testing, deployment). Be specific and factual.';
