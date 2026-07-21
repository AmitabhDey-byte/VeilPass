type ChatInput = { role: "user" | "assistant"; text: string };

const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

function fallback(message: string) {
  const prompt = message.toLowerCase();
  if (prompt.includes("credential")) return "Your credentials stay in the private witness layer. VeilPass uses them to build a proof, but does not publish the name, issuer, or underlying value.";
  if (prompt.includes("proof") || prompt.includes("work")) return "Connect a wallet, choose a pass, then run a private proof. The circuit checks eligibility and publishes only a valid or invalid result.";
  if (prompt.includes("midnight") || prompt.includes("compact")) return "Midnight is the privacy network underneath VeilPass. The Compact contract keeps witnesses private while making selected ledger state auditable.";
  return "I can explain credentials, private proofs, access passes, or how VeilPass uses Midnight. What should we explore?";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { messages?: ChatInput[] };
    const messages = body.messages ?? [];
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

    if (!apiKey) return Response.json({ text: fallback(lastUserMessage), mode: "demo" });

    const contents = messages.slice(-8).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }],
    }));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are Veil, the calm privacy guide inside VeilPass. Explain selective disclosure, credentials, Compact contracts, and Midnight in plain language. Never ask for secrets, API keys, seed phrases, or private credentials. Keep answers under 90 words." }] },
        contents,
      }),
    });
    if (!response.ok) return Response.json({ text: fallback(lastUserMessage), mode: "demo" });
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    return Response.json({ text: text || fallback(lastUserMessage), mode: "gemini" });
  } catch {
    return Response.json({ text: "Veil is in demo mode right now. Ask me about proofs, credentials, or the privacy model.", mode: "demo" });
  }
}
