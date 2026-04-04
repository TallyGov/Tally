import type { GovernanceProposal } from "../lib/types.js";
import { logger } from "../lib/logger.js";

const TRACKED_REALMS = [
  { id: "DPiH3H3c7t47BMxqTxLsuPQpEC6Kne8GA9Lg3yiBoqsn", name: "Mango Markets" },
  { id: "759qyfKDMMuo9v36tW7fbGanL2UL5YpY6UakmLqBVqZm", name: "Marinade Finance" },
  { id: "F9V4Lwo49aUe8fFujMbU6uhdFyDRqKY54WpzdpncUSk9", name: "Drift Protocol" },
];

interface RealmsProposal {
  pubkey: string;
  account: {
    name: string;
    descriptionLink: string;
    state: number;
    options: Array<{ voteWeight: string }>;
    denyVoteWeight: string | null;
    abstainVoteWeight: string | null;
    maxVoteWeight: string | null;
    votingCompletedAt: string | null;
    votingAt: string | null;
  };
}

const STATE_MAP: Record<number, GovernanceProposal["status"]> = {
  1: "active",
  2: "active",
  3: "passed",
  4: "defeated",
  5: "queued",
  6: "cancelled",
};

export async function fetchRealmsProposals(
  apiUrl: string
): Promise<GovernanceProposal[]> {
  const all: GovernanceProposal[] = [];

  for (const realm of TRACKED_REALMS) {
    try {
      const res = await fetch(
        `${apiUrl}/governance/${realm.id}/proposals?status=Voting`
      );
      if (!res.ok) continue;

      const raw = (await res.json()) as RealmsProposal[];

      for (const p of raw) {
        const votesFor = parseInt(p.account.options[0]?.voteWeight ?? "0", 10);
        const votesAgainst = parseInt(p.account.denyVoteWeight ?? "0", 10);
        const votesAbstain = parseInt(p.account.abstainVoteWeight ?? "0", 10);
        const maxVotes = parseInt(p.account.maxVoteWeight ?? "0", 10);

        all.push({
          id: p.pubkey,
          protocol: realm.name,
          realm: realm.id,
          title: p.account.name,
          summary: `Governance proposal on ${realm.name}. Description: ${p.account.descriptionLink}`,
          status: STATE_MAP[1] ?? "active",
          votesFor,
          votesAgainst,
          votesAbstain,
          totalVotes: votesFor + votesAgainst + votesAbstain,
          quorumPct: maxVotes > 0 ? ((votesFor + votesAgainst) / maxVotes) * 100 : 0,
          endsAt: Date.now() + 86_400_000,
          link: `https://app.realms.today/dao/${realm.id}/proposal/${p.pubkey}`,
          fetchedAt: Date.now(),
        });
      }
    } catch (err) {
      logger.debug(`Failed to fetch Realms proposals for ${realm.name}:`, err);
    }
  }

  return all;
}
