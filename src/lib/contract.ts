// The contract self-check: given a student's own counts, where do they
// stand against each tier? Pure, so it can be tested; the contract page
// runs it in the browser and keeps the counts only in that browser.

import type { ContractData } from "../content/schemas";

export const TIERS = ["A", "B", "C"] as const;
export type Tier = (typeof TIERS)[number];

export interface Counts {
  absences: number;
  ticketsPassed: number;
  /** Tickets taken and not passed, or missed. */
  ticketsMissed: number;
  logsDone: number;
  /** Logs whose due date has gone by without one completed. */
  logsMissed: number;
  /** One entry for each item in contract.requiredOfAll. */
  requiredDone: boolean[];
  /** One entry for each item in contract.tierOptions.options. */
  optionsDone: boolean[];
}

/** "ok": met, or within the limit so far. "todo": still to do, and still possible. "out": no longer possible. */
export type Status = "ok" | "todo" | "out";

export interface Line {
  label: string;
  status: Status;
  detail: string;
}

export interface TierStanding {
  tier: Tier;
  status: Status;
  lines: Line[];
}

export const emptyCounts = (contract: ContractData): Counts => ({
  absences: 0,
  ticketsPassed: 0,
  ticketsMissed: 0,
  logsDone: 0,
  logsMissed: 0,
  requiredDone: contract.requiredOfAll.map(() => false),
  optionsDone: contract.tierOptions.options.map(() => false),
});

const whole = (value: unknown, max: number): number => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};

/** Makes whatever was typed or stored into counts that fit the contract. */
export function cleanCounts(contract: ContractData, raw: Partial<Record<keyof Counts, unknown>> | null | undefined): Counts {
  const flags = (value: unknown, length: number) =>
    Array.from({ length }, (_, i) => Array.isArray(value) && value[i] === true);
  const ticketsPassed = whole(raw?.ticketsPassed, contract.readingTickets);
  const logsDone = whole(raw?.logsDone, contract.logs);
  return {
    absences: whole(raw?.absences, contract.classMeetings),
    ticketsPassed,
    ticketsMissed: whole(raw?.ticketsMissed, contract.readingTickets - ticketsPassed),
    logsDone,
    logsMissed: whole(raw?.logsMissed, contract.logs - logsDone),
    requiredDone: flags(raw?.requiredDone, contract.requiredOfAll.length),
    optionsDone: flags(raw?.optionsDone, contract.tierOptions.options.length),
  };
}

/** A requirement that counts up: so many passed or completed out of a fixed number. */
function countUp(label: string, need: number, total: number, done: number, missed: number): Line {
  if (done >= need) return { label, status: "ok", detail: `${done} of the ${need} this tier needs` };
  const left = total - done - missed;
  const short = need - done;
  if (left >= short) {
    return { label, status: "todo", detail: `${done} so far. ${short} more needed; ${left} still to come` };
  }
  return {
    label,
    status: "out",
    detail: `${done} so far and ${left} still to come, which is fewer than the ${need} this tier needs`,
  };
}

export function standing(contract: ContractData, counts: Counts, optionTitles?: string[]): TierStanding[] {
  const optionNames = optionTitles ?? contract.tierOptions.options;
  const optionsDone = counts.optionsDone.filter(Boolean).length;

  return TIERS.map((tier) => {
    const lines: Line[] = [];

    const allowed = contract.absencesAllowed[tier];
    lines.push(
      counts.absences <= allowed
        ? { label: "Absences", status: "ok", detail: `${counts.absences} of the ${allowed} this tier allows` }
        : { label: "Absences", status: "out", detail: `${counts.absences}; this tier allows ${allowed}` },
    );

    lines.push(countUp("Reading tickets passed", contract.ticketsPassed[tier], contract.readingTickets, counts.ticketsPassed, counts.ticketsMissed));
    lines.push(countUp("Logs completed", contract.logsCompleted[tier], contract.logs, counts.logsDone, counts.logsMissed));

    contract.requiredOfAll.forEach((label, i) => {
      lines.push(
        counts.requiredDone[i]
          ? { label, status: "ok", detail: "Done" }
          : { label, status: "todo", detail: "Required for every tier" },
      );
    });

    const needed = contract.tierOptions.required[tier];
    if (needed > 0) {
      const label = optionNames.join("; ");
      lines.push(
        optionsDone >= needed
          ? { label, status: "ok", detail: `${optionsDone} done; this tier needs ${needed}` }
          : { label, status: "todo", detail: `${optionsDone} done; this tier needs ${needed === optionNames.length ? "both" : needed}` },
      );
    }

    const status: Status = lines.some((l) => l.status === "out") ? "out" : lines.some((l) => l.status === "todo") ? "todo" : "ok";
    return { tier, status, lines };
  });
}

/** The highest tier that is not out of reach, or null when none is left. */
export function highestOpen(standings: TierStanding[]): Tier | null {
  return standings.find((s) => s.status !== "out")?.tier ?? null;
}

export const STATUS_WORDS: Record<Status, string> = {
  ok: "On track",
  todo: "Still to do",
  out: "Out of reach",
};
