import { generateText } from "@/lib/ai/gemini";
import { redactSecrets } from "@/lib/ai/privacy";

type ChatInput = { role: "user" | "assistant"; text: string };
type ChatResponse = { text: string; mode: "local" | "gemini"; suggestions: string[] };
type AppContext = {
  network?: string;
  connected?: boolean;
  deployed?: boolean;
  credentialCount?: number;
  activeView?: string;
  proofVerified?: boolean;
};

const SYSTEM_PROMPT = `You are Veil, the privacy copilot inside VeilPass.
Give concise, actionable guidance about selective disclosure, zero-knowledge proofs, Compact contracts, 1AM, and Midnight.
Use the supplied UI state to recommend the next safe action. Never request or repeat a seed phrase, API key, private key, raw credential, or private witness.
Distinguish clearly between simulated local guidance and on-chain actions. Keep the answer under 100 words.`;

function suggestions(context: AppContext): string[] {
  if (!context.connected) return ["How do I connect safely?", "What stays private?"];
  if (!context.deployed) return ["Am I ready to deploy?", "Explain DUST fees"];
  if (!context.proofVerified) return ["Guide my first proof", "Minimize disclosure"];
  return ["Explain my latest proof", "Review my privacy posture"];
}

function fallback(message: string, context: AppContext): string {
  const prompt = message.toLowerCase();
  if (/(seed|private key|api key|secret)/.test(prompt)) return "Keep that secret outside VeilPass. I will never need a seed phrase, API key, private key, or raw credential. If one was exposed, rotate it in the service that issued it.";
  if (!context.connected) return `Start by connecting 1AM on ${context.network === "preview" ? "Preview" : "Preprod"}. VeilPass reads wallet readiness, but your private witness stays local.`;
  if (prompt.includes("credential")) return "A credential is private evidence. VeilPass should prove only the smallest required claim—such as eligibility—without publishing its issuer, value, or owner.";
  if (prompt.includes("proof") || prompt.includes("next")) return context.deployed
    ? "Choose an access pass, review its required claim, then run the wallet-side proof. Only the verification result and public commitment reach the ledger."
    : "Your wallet is ready. Deploy or select a contract before proving, then confirm the transaction details in 1AM.";
  if (prompt.includes("risk") || prompt.includes("posture")) return "Open Privacy intelligence for an explainable scan of wallet, contract, credential, and network readiness. It sends only minimized state—not raw witnesses—to the AI pipeline.";
  return `You are viewing ${context.activeView || "VeilPass"} on ${context.network || "preprod"}. I can guide your next proof, explain what stays private, or review deployment readiness.`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { messages?: ChatInput[]; context?: AppContext };
    const messages = (body.messages ?? []).slice(-8);
    const context = body.context ?? {};
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
    const safeMessages = messages.map((message) => `${message.role}: ${redactSecrets(message.text)}`).join("\n");
    const contextSummary = JSON.stringify({
      network: context.network,
      walletConnected: Boolean(context.connected),
      contractAvailable: Boolean(context.deployed),
      credentialCount: Math.max(0, Number(context.credentialCount) || 0),
      activeView: context.activeView,
      proofVerified: Boolean(context.proofVerified),
    });

    const text = await generateText({
      system: SYSTEM_PROMPT,
      prompt: `Minimized application state: ${contextSummary}\nRecent conversation:\n${safeMessages}`,
      temperature: 0.25,
    });

    const payload: ChatResponse = {
      text: text || fallback(lastUserMessage, context),
      mode: text ? "gemini" : "local",
      suggestions: suggestions(context),
    };
    return Response.json(payload);
  } catch {
    const payload: ChatResponse = {
      text: "I could not reach the reasoning pipeline. Your data stayed local; try again or open Privacy intelligence for an offline readiness scan.",
      mode: "local",
      suggestions: ["What stays private?", "How do proofs work?"],
    };
    return Response.json(payload, { status: 200 });
  }
}
