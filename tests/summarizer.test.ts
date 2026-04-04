import { describe, it, expect } from "vitest";
import {
  computeImportanceScore,
  classifySentiment,
  extractKeyPoints,
} from "../src/analysis/summarizer.js";
import type { GovernanceProposal } from "../src/lib/types.js";

const makeProposal = (overrides: Partial<GovernanceProposal> = {}): GovernanceProposal => ({
  id: "test-proposal-1",
  protocol: "Test Protocol",
  title: "Increase liquidity mining rewards",
  summary: "This proposal increases liquidity mining incentives for the main pool.",
  status: "active",
  votesFor: 750_000,
  votesAgainst: 150_000,
  votesAbstain: 50_000,
  totalVotes: 950_000,
  quorumPct: 95,
  endsAt: Date.now() + 48 * 3_600_000,
  link: "https://snapshot.org/#/test/proposal/1",
  fetchedAt: Date.now(),
  ...overrides,
});

describe("computeImportanceScore", () => {
  it("returns a score between 0 and 10", () => {
    const proposal = makeProposal();
    const score = computeImportanceScore(proposal);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
  });

  it("scores higher for proposals with urgent keywords", () => {
    const normal = makeProposal({ title: "Adjust fee parameters" });
    const urgent = makeProposal({ title: "Emergency security pause" });

    expect(computeImportanceScore(urgent)).toBeGreaterThan(computeImportanceScore(normal));
  });

  it("scores higher for proposals with high vote counts", () => {
    const lowVotes = makeProposal({ totalVotes: 1_000 });
    const highVotes = makeProposal({ totalVotes: 2_000_000 });

    expect(computeImportanceScore(highVotes)).toBeGreaterThan(computeImportanceScore(lowVotes));
  });
});

describe("classifySentiment", () => {
  it("returns bullish for proposals with strong for-vote and bullish keywords", () => {
    const proposal = makeProposal({
      title: "Expand incentive program and increase rewards",
      votesFor: 900_000,
      totalVotes: 1_000_000,
    });
    expect(classifySentiment(proposal)).toBe("bullish");
  });

  it("returns bearish for proposals with security/risk keywords", () => {
    const proposal = makeProposal({
      title: "Pause protocol due to security bug discovered",
    });
    expect(classifySentiment(proposal)).toBe("bearish");
  });

  it("returns neutral when signals are mixed", () => {
    const proposal = makeProposal({
      title: "Adjust governance parameters",
      votesFor: 500_000,
      totalVotes: 1_000_000,
    });
    expect(classifySentiment(proposal)).toBe("neutral");
  });
});

describe("extractKeyPoints", () => {
  it("returns an array of strings", () => {
    const proposal = makeProposal();
    const points = extractKeyPoints(proposal);
    expect(Array.isArray(points)).toBe(true);
    expect(points.length).toBeGreaterThan(0);
    expect(typeof points[0]).toBe("string");
  });

  it("includes quorum status", () => {
    const noQuorum = makeProposal({ quorumPct: 45 });
    const points = extractKeyPoints(noQuorum);
    const quorumPoint = points.find((p) => p.toLowerCase().includes("quorum"));
    expect(quorumPoint).toBeDefined();
  });
});
