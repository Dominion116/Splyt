import type { Address, ApiError, ParsedReceipt, SessionDetail, SessionSummary } from "./types";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly payload: ApiError | null;

  constructor(status: number, payload: ApiError | null, fallback: string) {
    super(payload?.message ?? fallback);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = payload?.error ?? "UnknownError";
    this.payload = payload;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    let payload: ApiError | null = null;
    try {
      payload = (await res.json()) as ApiError;
    } catch {
      payload = null;
    }
    throw new ApiRequestError(res.status, payload, `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface ListSessionsParams {
  limit?: number;
  before?: number;
}

export interface ListSessionsPage {
  sessions: SessionSummary[];
  nextCursor: number | null;
}

export async function listSessions(host?: Address, params?: ListSessionsParams): Promise<ListSessionsPage> {
  const qs = new URLSearchParams();
  if (host) qs.set("host", host);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.before != null) qs.set("before", String(params.before));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<ListSessionsPage>(`/api/session${query}`);
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  return request<SessionDetail>(`/api/session/${sessionId}`);
}

export interface CreateSessionInput {
  sessionId: string;
  host: Address;
  hostSignature: string;
  txHash: string;
  members: Address[];
  amounts: string[];
  mode: "equal" | "itemised" | "custom";
  receipt: ParsedReceipt;
  expiresInMinutes: number;
}

export interface CreateSessionResult {
  sessionId: string;
  paymentLinks: Record<string, string>;
}

export async function createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
  return request<CreateSessionResult>(`/api/session`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function closeSession(sessionId: string, txHash: string) {
  return request<{ sessionId: string; closeTxHash: string; payoutAmount: string; closedAt: number }>(
    `/api/session/${sessionId}/close`,
    { method: "POST", body: JSON.stringify({ txHash }) }
  );
}

export async function parseReceipt(imageBase64: string, mimeType: string): Promise<ParsedReceipt> {
  return request<ParsedReceipt>(`/api/parse`, {
    method: "POST",
    body: JSON.stringify({ imageBase64, mimeType })
  });
}

export async function getMemberPrice(sessionId: string, memberAddress: Address) {
  return request<{ price: string; currency: "cUSD"; decimals: number; blockchainAmount: string }>(
    `/api/pay/${sessionId}/${memberAddress}/price`
  );
}

export async function confirmMemberPayment(sessionId: string, memberAddress: Address, txHash: string) {
  return request<{ paid: true; txHash: string; amount: string; verified: boolean }>(
    `/api/pay/${sessionId}/${memberAddress}/confirm`,
    { method: "POST", body: JSON.stringify({ txHash }) }
  );
}

export function statusStreamUrl(sessionId: string): string {
  return `${getBaseUrl()}/api/status/${sessionId}`;
}
