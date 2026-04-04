import type { GovernanceProposal, ProposalSummary } from "../lib/types.js";
import { logger } from "../lib/logger.js";

export function computeImportanceScore(proposal: GovernanceProposal): number {
  let score = 5;

  if (proposal.totalVotes > 1_000_000) score += 2;
  else if (proposal.totalVotes > 100_000) score += 1;

  if (proposal.quorumPct >= 100) score += 1;

  const hoursLeft = (proposal.endsAt - Date.now()) / 3_600_000;
  if (hoursLeft < 24) score += 1;

  const urgentKeywords = ["emergency", "critical", "security", "pause", "upgrade", "migration"];
  const text = (proposal.title + " " + proposal.summary).toLowerCase();
  if (urgentKeywords.some((k) => text.includes(k))) score += 2;

  return Math.min(10, score);
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

  const bullishHits = bullishKeywords.filter((k) => text.includes(k)).length;
  const bearishHits = bearishKeywords.filter((k) => text.includes(k)).length;

  if (bearishHits > bullishHits) return "bearish";
  if (bullishHits > bearishHits || forPct > 70) return "bullish";
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
    points.push(`Quorum at ${proposal.quorumPct.toFixed(1)}% — not yet met`);
  }

  const hoursLeft = Math.round((proposal.endsAt - Date.now()) / 3_600_000);
  if (hoursLeft > 0) {
    points.push(`${hoursLeft}h remaining to vote`);
  } else {
    points.push("Voting has ended");
  }

  return points;
}

export function buildLocalSummary(proposal: GovernanceProposal): ProposalSummary {
  return {
    proposalId: proposal.id,
    protocol: proposal.protocol,
    title: proposal.title,
    claudeSummary: proposal.summary.slice(0, 300),
    sentiment: classifySentiment(proposal),
    importanceScore: computeImportanceScore(proposal),
    keyPoints: extractKeyPoints(proposal),
    generatedAt: Date.now(),
  };
}
