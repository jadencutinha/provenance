export type ReviewStatus = "unreviewed" | "accepted" | "rejected" | "flagged";

export interface NormBox {
  x0: number;
  top: number;
  x1: number;
  bottom: number;
}

export interface Anchor {
  method: string;
  score: number;
  norm_bbox: NormBox;
  norm_bboxes: NormBox[];
}

export interface ClaimSource {
  drug: string;
  title: string;
  setid: string;
  dailymed_url: string;
  pages: number;
}

export interface Claim {
  claim_id: string;
  claim_text: string;
  normalized_statement: string;
  claim_type: string;
  severity: string;
  subject_drug: string;
  object_condition: string | null;
  quantitative_value: string | null;
  source_document_id: string;
  page_number: number;
  verifiable: boolean;
  extraction_confidence: number;
  review_status: ReviewStatus;
  anchor: Anchor | null;
  source: ClaimSource;
}

/** A reviewer decision — the "document-to-decision" writeback (mock of an Ontology Action). */
export interface Decision {
  status: ReviewStatus;
  reviewer: string;
  at: string; // ISO timestamp
}

export const SEVERITY_RANK: Record<string, number> = {
  boxed_warning: 0,
  contraindication: 1,
  serious: 2,
  moderate: 3,
  info: 4,
};
