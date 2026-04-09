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

async function fetchDescriptionText(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 0 ? text.slice(0, 1000) : null;
  } catch {
    return null;
  }
}

function deriveRealmsEndTime(proposal: RealmsProposal): {
  endsAt: number;
  source: GovernanceProposal["endsAtSource"];
} {
  if (proposal.account.votingCompletedAt) {
    return {
      endsAt: new Date(proposal.account.votingCompletedAt).getTime(),
      source: "realms_completed",
    };
  }

  if (proposal.account.votingAt) {
    return {
      endsAt: new Date(proposal.account.votingAt).getTime() + 72 * 3_600_000,
      source: "realms_estimated",
    };
  }

  return {
    endsAt: Date.now(),
    source: "realms_estimated",
  };
}

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

      for (const proposal of raw) {
        const descriptionText = await fetchDescriptionText(proposal.account.descriptionLink);
        const votesFor = parseInt(proposal.account.options[0]?.voteWeight ?? "0", 10);
        const votesAgainst = parseInt(proposal.account.denyVoteWeight ?? "0", 10);
        const votesAbstain = parseInt(proposal.account.abstainVoteWeight ?? "0", 10);
        const maxVotes = parseInt(proposal.account.maxVoteWeight ?? "0", 10);
        const timing = deriveRealmsEndTime(proposal);

        all.push({
          id: proposal.pubkey,
          protocol: realm.name,
          realm: realm.id,
          title: proposal.account.name,
          summary: descriptionText
            ? descriptionText
            : `Proposal description is hosted externally at ${proposal.account.descriptionLink}. Review the linked document for full details.`,
          summarySource: descriptionText ? "realms_description" : "realms_link",
          status: STATE_MAP[proposal.account.state] ?? "active",
          votesFor,
          votesAgainst,
          votesAbstain,
          totalVotes: votesFor + votesAgainst + votesAbstain,
          quorumPct: maxVotes > 0 ? ((votesFor + votesAgainst) / maxVotes) * 100 : 0,
          endsAt: timing.endsAt,
          endsAtSource: timing.source,
          link: `https://app.realms.today/dao/${realm.id}/proposal/${proposal.pubkey}`,
          fetchedAt: Date.now(),
        });
      }
    } catch (err) {
      logger.debug(`Failed to fetch Realms proposals for ${realm.name}:`, err);
    }
  }

  return all;
}
