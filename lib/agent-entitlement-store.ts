import { get, put } from "@vercel/blob";
import { randomBytes } from "crypto";
import { allowBlobWrites } from "@/lib/runtime-mode";

export type AgentEntitlementStatus = "active" | "revoked";

export interface AgentEntitlement {
  token: string;
  reportId: string;
  status: AgentEntitlementStatus;
  createdAt: number;
  stripeSessionId?: string;
  purchaserRef?: string;
}

export interface AgentFeedbackRecord {
  reportId: string;
  state: "confirmed" | "partial" | "debunked";
  metrics: Record<string, unknown>;
  notes?: string;
  createdAt: number;
  token: string;
}

const ENTITLEMENT_BY_TOKEN_PREFIX = "ligs-agent-entitlements/by-token/";
const ENTITLEMENT_BY_REPORT_PREFIX = "ligs-agent-entitlements/by-report/";
const FEEDBACK_PREFIX = "ligs-agent-feedback/";

const memoryEntitlementsByToken = new Map<string, AgentEntitlement>();
const memoryEntitlementsByReport = new Map<string, AgentEntitlement>();
const memoryFeedback = new Map<string, AgentFeedbackRecord[]>();

function isBlobEnabled(): boolean {
  return (
    allowBlobWrites &&
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0
  );
}

function entitlementTokenPath(token: string): string {
  return `${ENTITLEMENT_BY_TOKEN_PREFIX}${token}.json`;
}

function entitlementReportPath(reportId: string): string {
  return `${ENTITLEMENT_BY_REPORT_PREFIX}${reportId}.json`;
}

export function mintAgentEntitlementToken(): string {
  return `wyh_${randomBytes(24).toString("base64url")}`;
}

export async function saveAgentEntitlement(
  entitlement: AgentEntitlement
): Promise<void> {
  if (isBlobEnabled()) {
    const payload = JSON.stringify(entitlement);
    await put(entitlementTokenPath(entitlement.token), payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    await put(entitlementReportPath(entitlement.reportId), payload, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }
  memoryEntitlementsByToken.set(entitlement.token, entitlement);
  memoryEntitlementsByReport.set(entitlement.reportId, entitlement);
}

export async function getAgentEntitlementByToken(
  token: string
): Promise<AgentEntitlement | null> {
  if (isBlobEnabled()) {
    try {
      const result = await get(entitlementTokenPath(token), { access: "public" });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as AgentEntitlement;
    } catch {
      return null;
    }
  }
  return memoryEntitlementsByToken.get(token) ?? null;
}

export async function getAgentEntitlementByReportId(
  reportId: string
): Promise<AgentEntitlement | null> {
  if (isBlobEnabled()) {
    try {
      const result = await get(entitlementReportPath(reportId), { access: "public" });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as AgentEntitlement;
    } catch {
      return null;
    }
  }
  return memoryEntitlementsByReport.get(reportId) ?? null;
}

export async function saveAgentFeedback(
  record: AgentFeedbackRecord
): Promise<void> {
  if (isBlobEnabled()) {
    const id = crypto.randomUUID();
    const path = `${FEEDBACK_PREFIX}${record.reportId}/${record.createdAt}-${id}.json`;
    await put(path, JSON.stringify(record), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }
  const existing = memoryFeedback.get(record.reportId) ?? [];
  existing.push(record);
  memoryFeedback.set(record.reportId, existing);
}

