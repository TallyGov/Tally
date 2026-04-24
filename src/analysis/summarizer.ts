import type { GovernanceProposal, ProposalSummary } from "../lib/types.js";

// Importance is deliberately simple and deterministic so the digest can be audited.
export function computeImportanceScore(proposal: GovernanceProposal): number {
  let score = 2;

  if (proposal.totalVotes > 1_000_000) score += 2;
  else if (proposal.totalVotes > 100_000) score += 1;

  if (proposal.quorumPct >= 100) score += 1;

  const hoursLeft = (proposal.endsAt - Date.now()) / 3_600_000;
  if (hoursLeft < 24) score += 1;

  const urgentKeywords = ["emergency", "critical", "security", "pause", "upgrade", "migration"];
  const text = (proposal.title + " " + proposal.summary).toLowerCase();
  if (urgentKeywords.some((keyword) => text.includes(keyword))) score += 2;

  return Math.min(10, score);
}

function deriveState(importanceScore: number): ProposalSummary["state"] {
  if (importanceScore >= 9) return "critical";
  if (importanceScore >= 7) return "important";
  if (importanceScore >= 5) return "watch";
  return "routine";
}

function deriveRecommendation(
  importanceScore: number
): ProposalSummary["recommendation"] {
  if (importanceScore >= 7) return "review now";
  if (importanceScore >= 5) return "watch";
  return "low priority";
}

function stripUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function buildReadableSummary(proposal: GovernanceProposal): string {
  const cleaned = stripUrls(proposal.summary);
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const base =
    sentences.slice(0, 2).join(" ").slice(0, 280) ||
    `${proposal.protocol} proposal with ${proposal.totalVotes.toLocaleString()} votes recorded.`;

  if (proposal.summarySource === "realms_link") {
    return `${base} Full rationale lives in the linked proposal document, so this digest is metadata-first until the external description is reviewed.`;
  }

  return base;
}

export function classifySentiment(
  proposal: GovernanceProposal
): ProposalSummary["sentiment"] {
  const forPct =
    proposal.totalVotes > 0
      ? (proposal.votesFor / proposal.totalVotes) * 100
      : 50;

  const text = (proposal.title + " " + proposal.summary).toLowerCase();
  const bullishKeywords = ["increase", "expand", "launch", "add", "growth", "reward", "incentive"];
  const bearishKeywords = ["reduce", "cut", "pause", "deprecate", "risk", "security", "bug"];

  const bullishHits = bullishKeywords.filter((keyword) => text.includes(keyword)).length;
  const bearishHits = bearishKeywords.filter((keyword) => text.includes(keyword)).length;

  if (bearishHits > bullishHits) return "bearish";
  if (forPct > 70 || (bullishHits > bearishHits && forPct > 55)) return "bullish";
  return "neutral";
}

export function extractKeyPoints(proposal: GovernanceProposal): string[] {
  const points: string[] = [];

  const votePct =
    proposal.totalVotes > 0
      ? ((proposal.votesFor / proposal.totalVotes) * 100).toFixed(1)
      : "0";

  points.push(`${votePct}% of votes in favor (${proposal.totalVotes.toLocaleString()} total)`);

  if (proposal.quorumPct >= 100) {
    points.push(`Quorum reached (${proposal.quorumPct.toFixed(1)}%)`);
  } else {
    points.push(`Quorum at ${proposal.quorumPct.toFixed(1)}% - not yet met`);
  }

  const hoursLeft = Math.round((proposal.endsAt - Date.now()) / 3_600_000);
  if (hoursLeft > 0) {
    points.push(`${hoursLeft}h remaining to vote`);
  } else {
    points.push("Voting window has likely ended or is awaiting venue confirmation");
  }

  return points;
}

export function buildLocalSummary(proposal: GovernanceProposal): ProposalSummary {
  const importanceScore = computeImportanceScore(proposal);

  return {
    proposalId: proposal.id,
    protocol: proposal.protocol,
    title: proposal.title,
    claudeSummary: buildReadableSummary(proposal),
    sentiment: classifySentiment(proposal),
    importanceScore,
    state: deriveState(importanceScore),
    recommendation: deriveRecommendation(importanceScore),
    keyPoints: extractKeyPoints(proposal),
    generatedAt: Date.now(),
  };
}
