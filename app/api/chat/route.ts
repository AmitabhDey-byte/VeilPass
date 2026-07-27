type ChatInput = { role: "user" | "assistant"; text: string };
type ChatResponse = { text: string; mode: "demo" | "gemini" };

const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-2.5-flash"] as const;

const SYSTEM_PROMPT =
  "You are Veil, the calm privacy guide inside VeilPass. Explain selective disclosure, credentials, Compact contracts, the 1AM wallet, and Midnight (Preview and Preprod) in plain language. Never ask for secrets, API keys, seed phrases, or private credentials. Keep answers under 90 words. Prefer short sentences.";

function fallback(message: string): string {
  const prompt = message.toLowerCase();
  if (prompt.includes("credential")) return "Your credentials stay in the private witness layer. VeilPass uses them to build a proof, but does not publish the name, issuer, or underlying value.";
  if (prompt.includes("proof") || prompt.includes("work") || prompt.includes("how")) return "Connect a wallet, choose a pass, then run a private proof. The circuit checks eligibility and publishes only a valid or invalid result.";
  if (prompt.includes("midnight") || prompt.includes("compact")) return "Midnight is the privacy network underneath VeilPass. The Compact contract keeps witnesses private while making selected ledger state auditable.";
  if (prompt.includes("host") || prompt.includes("register") || prompt.includes("allowlist")) return "Switch to the Host console tab to publish a new allowlist root. The registration is the only public action — the credential checks stay private.";
  if (prompt.includes("1am") || prompt.includes("lace") || prompt.includes("wallet")) return "VeilPass prefers the 1AM wallet on Preview or Preprod. Pick a network with the floating toggle, then connect — you will need tNIGHT and DUST from the matching faucet.";
  if (prompt.includes("pass") || prompt.includes("access")) return "Open Access passes to see every room available to this wallet. Founders Circle is currently verified in this demo.";
  if (prompt.includes("preview") || prompt.includes("preprod") || prompt.includes("network") || prompt.includes("faucet")) return "Use the floating Network toggle to switch between Preview and Preprod. The wallet must be on the same network and funded with tNIGHT plus DUST from the matching faucet.";
  return "I can explain credentials, private proofs, access passes, the Host console, or how VeilPass uses Midnight. What should we explore?";
}

async function tryGemini(apiKey: string, contents: Array<{ role: string; parts: Array<{ text: string }> }>): Promise<string | null> {
  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
        }),
      });
      if (!response.ok) continue;
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
      if (text) return text;
    } catch {
      // try the next model
    }
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { messages?: ChatInput[]; network?: string };
    const messages = body.messages ?? [];
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      const payload: ChatResponse = { text: fallback(lastUserMessage), mode: "demo" };
      return Response.json(payload);
    }

    const contents = messages.slice(-8).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }],
    }));

    const networkHint = body.network ? ` The user is on the ${body.network} network.` : "";
    const networkAwareContents = contents.length
      ? [{ role: "user", parts: [{ text: `Context: this is the VeilPass demo on Midnight.${networkHint}` }] }, ...contents]
      : contents;

    const text = await tryGemini(apiKey, networkAwareContents);
    if (text) {
      const payload: ChatResponse = { text, mode: "gemini" };
      return Response.json(payload);
    }

    const payload: ChatResponse = { text: fallback(lastUserMessage), mode: "demo" };
    return Response.json(payload);
  } catch {
    const payload: ChatResponse = { text: "Veil is in demo mode right now. Ask me about proofs, credentials, or the privacy model.", mode: "demo" };
    return Response.json(payload);
  }
}
