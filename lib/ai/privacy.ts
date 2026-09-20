const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(?:seed|recovery|mnemonic)\s+(?:phrase|words?)?\s*[:=]?\s*(?:[a-z]+\s+){7,23}[a-z]+\b/gi, replacement: "[recovery phrase removed]" },
  { pattern: /\b(?:api[_ -]?key|secret|private[_ -]?key|token)\s*[:=]\s*[A-Za-z0-9_\-./+=]{12,}\b/gi, replacement: "[secret removed]" },
  { pattern: /\b[A-Fa-f0-9]{96,}\b/g, replacement: "[private value removed]" },
];

export function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (redacted, { pattern, replacement }) => redacted.replace(pattern, replacement),
    value,
  ).slice(0, 4_000);
}

export function sanitizeStringList(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => redactSecrets(item.trim()).slice(0, 240))
    .filter(Boolean)
    .slice(0, limit);
}

export function clampScore(value: unknown, fallback = 50): number {
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback;
}

export function safeHexRoot(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[a-fA-F0-9]{64}$/.test(value) ? value.toLowerCase() : fallback;
}
