import type { ProposalSummary } from "../lib/types.js";

function sentimentLabel(s: ProposalSummary["sentiment"]): string {
  if (s === "bullish") return "BULLISH";
  if (s === "bearish") return "BEARISH";
  return "NEUTRAL";
}

function sentimentIcon(s: ProposalSummary["sentiment"]): string {
  if (s === "bullish") return "+";
  if (s === "bearish") return "-";
  return "~";
}

function importanceBar(score: number): string {
  const filled = Math.round(score);
  return "■".repeat(filled) + "□".repeat(10 - filled);
}

export function printSummary(summary: ProposalSummary): void {
  const line = "═".repeat(62);
  const thin = "─".repeat(62);
  console.log(`\n${line}`);
  console.log(`  [${summary.protocol.toUpperCase()}]`);
  console.log(`  ${summary.title}`);
  console.log(thin);
  console.log(`  SENTIMENT   [${sentimentIcon(summary.sentiment)}] ${sentimentLabel(summary.sentiment)}`);
  console.log(`  IMPORTANCE  [${importanceBar(summary.importanceScore)}] ${summary.importanceScore}/10`);
  console.log(thin);
  console.log(`  SUMMARY`);
  console.log(`  ${summary.claudeSummary}`);
  console.log(thin);
  console.log(`  KEY POINTS`);
  for (const point of summary.keyPoints) {
    console.log(`    • ${point}`);
  }
  console.log(line);
}

export function printDigest(summaries: ProposalSummary[]): void {
  const ts = new Date().toLocaleString("en-US", { timeZone: "UTC" });
  console.log(`\n  GOVERNANCE DIGEST  —  ${ts} UTC`);
  console.log(`  ${summaries.length} active proposals across ${new Set(summaries.map((s) => s.protocol)).size} protocols\n`);
  for (const s of summaries) {
    printSummary(s);
  }
}
