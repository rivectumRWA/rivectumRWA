import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { recordQuery } from "@/lib/copilot-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are Serra Copilot, an AI assistant embedded in the SerraRWA dashboard — an autonomous allocation protocol for tokenized real-world assets (RWA) on Base Sepolia.

Your knowledge is restricted to RWA topics only. You MAY answer questions about:
- Tokenized real-world assets (treasury bonds, private credit, real estate, commodities, invoices, carbon credits)
- ERC-4626 vault mechanics, yield aggregation, vault strategies
- On-chain asset allocation, rebalancing, agent strategies
- DeFi composability with RWA (e.g. lending markets, stablecoins backed by RWA)
- Base / Ethereum L2 scaling, gas optimization for vault operations
- Risk: smart-contract risk, custodial risk, regulatory risk, oracle risk in RWA
- The SerraRWA protocol itself — its vault contract, off-chain agent loop, intent-based rebalancing, and dashboard
- General conceptual questions about RWA tokenization (legal wrappers, oracles, NAV feeds)

You MUST REJECT any question that is not about RWA, DeFi, or the SerraRWA protocol. For off-topic questions, respond ONLY with:
"I'm Serra Copilot — I specialize in real-world asset tokenization, ERC-4626 vault strategies, and the SerraRWA protocol. I can't help with that topic. Try asking me about RWA allocation, yield strategies, or vault mechanics."

Keep answers concise (2-4 paragraphs max), technical but accessible, and grounded in real protocol mechanics. When relevant, mention how SerraRWA's agent-driven rebalancing would apply.`;

const RWA_KEYWORDS = [
  "rwa", "real world asset", "tokenized", "tokenization",
  "vault", "erc-4626", "erc4626", "yield", "apy", "allocation",
  "rebalance", "strategy", "agent", "usdc", "stablecoin",
  "treasury", "bond", "t-bill", "private credit", "real estate",
  "commodity", "invoice", "carbon credit", "defi",
  "serra", "serrarwa", "base sepolia", "ethereum", "l2",
  "collateral", "custody", "oracle", "nav", "regulatory",
  "smart contract", "audit", "risk", "liquidity",
  "underlying", "share", "deposit", "withdraw", "redeem",
  "asset", "portfolio", "diversification", "institutional",
  "compliance", "kyc", "aml", "accredited", "sec",
  "token", "protocol", "on-chain", "blockchain", "crypto",
];

function isRwaQuery(message: string): boolean {
  const lower = message.toLowerCase();
  return RWA_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function POST(req: Request) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  let body: { message: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { message, history } = body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // Guard: reject non-RWA queries without calling OpenAI
  if (!isRwaQuery(message)) {
    recordQuery({ guarded: true, error: false, tokenEst: 0 });
    return NextResponse.json({
      reply: "I'm Serra Copilot — I specialize in real-world asset tokenization, ERC-4626 vault strategies, and the SerraRWA protocol. I can't help with that topic. Try asking me about RWA allocation, yield strategies, or vault mechanics.",
      guarded: true,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    recordQuery({ guarded: false, error: true, tokenEst: 0 });
    return NextResponse.json({
      reply: "Serra Copilot is not configured — set OPENAI_API_KEY in the server environment.",
      guarded: false,
    });
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? []).slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 600,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[copilot] OpenAI error:", res.status, err);
      recordQuery({ guarded: false, error: true, tokenEst: 0 });
      return NextResponse.json(
        { reply: "Serra Copilot encountered an error. Please try again.", guarded: false },
        { status: 502 },
      );
    }

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content ??
      "I couldn't generate a response. Try rephrasing your RWA question.";

    recordQuery({ guarded: false, error: false, tokenEst: reply.length * 2 });
    return NextResponse.json({ reply, guarded: false });
  } catch (err) {
    console.error("[copilot] fetch error:", err);
    recordQuery({ guarded: false, error: true, tokenEst: 0 });
    return NextResponse.json(
      { reply: "Serra Copilot is temporarily unavailable.", guarded: false },
      { status: 502 },
    );
  }
}
