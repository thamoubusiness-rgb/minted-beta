import { config } from "./config";
import type { CreatorRow } from "./db";

export type Check = { label: string; ok: boolean };

export function eligibility(c: CreatorRow, hasToken: boolean): { ok: boolean; checks: Check[] } {
  const ageDays = c.x_created_at ? (Date.now() - new Date(c.x_created_at).getTime()) / 864e5 : Infinity;
  const sinceHandle = c.handle_changed_at ? (Date.now() - new Date(c.handle_changed_at).getTime()) / 36e5 : Infinity;
  const checks: Check[] = [
    { label: "X Premium account (verified checkmark)", ok: config.allowedVerified.includes(c.verified_type || "none") },
  ];
  if (config.minAccountAgeDays > 0) {
    checks.push({ label: `Account older than ${config.minAccountAgeDays} days`, ok: ageDays >= config.minAccountAgeDays });
  }
  if (config.minFollowers > 0) {
    checks.push({ label: `At least ${config.minFollowers.toLocaleString("en-US")} followers`, ok: c.followers >= config.minFollowers });
  }
  checks.push({ label: "No coin launched yet", ok: !hasToken });
  if (sinceHandle < config.handleCooldownHours) {
    checks.push({ label: `Handle unchanged for ${config.handleCooldownHours} hours`, ok: false });
  }
  if (c.status !== "active") checks.push({ label: "X account available", ok: false });
  return { ok: checks.every((x) => x.ok), checks };
}
