export type VoteChoice = "yes" | "no" | "abstain";
export type ProposalStatus = "active" | "passed" | "defeated" | "cancelled" | "queued";

export interface GovernanceProposal {
  id: string;
  protocol: string;
  realm?: string;
  title: string;
  summary: string;
  summarySource: "snapshot_body" | "realms_description" | "realms_link";
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  quorumPct: number;
  endsAt: number;
  endsAtSource: "snapshot_end" | "realms_completed" | "realms_estimated";
  link: string;
  fetchedAt: number;
}

export interface ProposalSummary {
  proposalId: string;
  protocol: string;
  title: string;
  claudeSummary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  importanceScore: number;
  state: "critical" | "important" | "watch" | "routine";
  recommendation: "review now" | "watch" | "low priority";
  keyPoints: string[];
  generatedAt: number;
}
