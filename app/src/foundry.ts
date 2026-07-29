// Live data layer: reads Claims + Source Documents from the Foundry Ontology and writes
// review decisions back through the edit-claim Action. All calls go through the /foundry dev
// proxy (vite.config.ts), which injects the bearer token server-side.
import type { Claim, ReviewStatus } from "./types";

const OID = "ri.ontology.main.ontology.4762de6b-c072-498b-b2ce-ec08cca501c6";
const API = `/foundry/api/v2/ontologies/${OID}`;

// keep raw API objects so writeback can resend all (required) action params unchanged
const raw = new Map<string, Record<string, unknown>>();

async function getAll(objectType: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let pageToken = "";
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (pageToken) q.set("pageToken", pageToken);
    const r = await fetch(`${API}/objects/${objectType}?${q}`);
    if (!r.ok) throw new Error(`Foundry ${objectType} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    out.push(...(j.data ?? []));
    pageToken = j.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

export async function fetchClaims(): Promise<Claim[]> {
  const [claims, docs] = await Promise.all([getAll("Claim"), getAll("SourceDocument")]);
  const docById = new Map(docs.map((d) => [d.documentId as string, d]));
  raw.clear();
  return claims.map((c) => {
    raw.set(c.claimId as string, c);
    const d = docById.get(c.sourceDocumentId as string);
    let norm_bboxes: { x0: number; top: number; x1: number; bottom: number }[] = [];
    try { norm_bboxes = c.normBboxes ? JSON.parse(c.normBboxes as string) : []; } catch { /* keep [] */ }
    return {
      claim_id: c.claimId,
      claim_text: c.claimText,
      normalized_statement: c.normalizedStatement,
      claim_type: c.claimType,
      severity: c.severity,
      subject_drug: c.subjectDrug,
      object_condition: (c.objectCondition ?? null) as string | null,
      quantitative_value: (c.quantitativeValue ?? null) as string | null,
      source_document_id: c.sourceDocumentId,
      page_number: c.pageNumber,
      verifiable: !!c.verifiable,
      extraction_confidence: (c.extractionConfidence ?? 0) as number,
      review_status: (c.reviewStatus ?? "unreviewed") as ReviewStatus,
      anchor: norm_bboxes.length
        ? { method: "foundry", score: 1, norm_bbox: norm_bboxes[0], norm_bboxes }
        : null,
      source: d
        ? { drug: d.drug as string, title: d.title as string, setid: (d.setid ?? "") as string,
            dailymed_url: (d.dailymedUrl ?? "") as string, pages: (d.pageCount ?? 0) as number }
        : { drug: c.subjectDrug as string, title: c.sourceDocumentId as string, setid: "",
            dailymed_url: "", pages: 0 },
    } as Claim;
  });
}

// The auto-generated edit-claim modify action marks every property required, so we resend the
// object's current values and change only reviewStatus. (A dedicated review-only action would
// be the production refinement.)
export async function applyEditClaim(claimId: string, reviewStatus: ReviewStatus): Promise<void> {
  const c = raw.get(claimId);
  if (!c) throw new Error("unknown claim " + claimId);
  const parameters = {
    Claim: claimId,
    severity: c.severity, pageNumber: c.pageNumber, subjectDrug: c.subjectDrug,
    objectCondition: c.objectCondition, extractionConfidence: c.extractionConfidence,
    claimText: c.claimText, claimType: c.claimType, verifiable: c.verifiable,
    normBboxes: c.normBboxes, quantitativeValue: c.quantitativeValue ?? "",
    sourceDocumentId: c.sourceDocumentId, normalizedStatement: c.normalizedStatement,
    reviewStatus,
  };
  const r = await fetch(`${API}/actions/edit-claim/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parameters }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.validation?.result === "INVALID") {
    throw new Error(`edit-claim failed (${r.status}): ${JSON.stringify(j?.validation ?? j).slice(0, 200)}`);
  }
  raw.set(claimId, { ...c, reviewStatus });
}
