# Provenance — Roadmap

## Locked decisions
| Decision | Choice | Why |
|---|---|---|
| Corpus | FDA drug labels (DailyMed SPL PDFs) + openFDA/FAERS as reference | Public domain; rich high-stakes claims; direct mission fit (drug safety) |
| Foundry ops split | Owner drives Foundry UI; Claude builds all code/specs + guides click-by-click | Most reliable; Foundry is a heavy SPA |
| v1 scope | Core traceability **+ decision writeback** (Accept/Reject/Flag) | Delivers true "document-to-decision" without overreaching a 4-min demo |
| Reviewer UI | **Target OSDK React app**, keep Workshop as fallback; commit late | Best answer to "show us a software tool, not analytics"; only affects Layer 4 |

## Architecture
| Layer | What | Platform |
|---|---|---|
| 1. Ingest | DailyMed label PDFs → OCR into pages w/ text + bounding boxes | Media Set + AIP Document Intelligence |
| 2. Extract | LLM pulls atomic claims per page, each anchored to a verbatim span + page + bbox | AIP Logic (LLM function) |
| 3. Ontology | Claims matrix: `Claim → DocumentPage → SourceDocument`; `Claim → Drug`; `Claim → Condition` (entity-resolved) | Ontology Manager |
| 4. Review | Claims table → click → source page w/ span highlight + provenance breadcrumb; Accept/Reject/Flag writeback | OSDK React app |

## The claim (core object)
`claim_text` (verbatim) · `normalized_statement` · `claim_type`
(indication｜contraindication｜adverse_reaction｜warning｜dosing｜interaction｜efficacy) ·
`subject_drug` · `object_condition` · `quantitative_value` · `source_document_id` ·
`page_number` · `bbox`/`char_span` · `extraction_confidence` · `review_status`
(unreviewed｜accepted｜rejected｜flagged) · `verifiable` (bool).

## Phases
- **P0 — Foundations** ✅ *(done)*: sources verified; 5-doc / 240-page corpus fetched;
  local Document-Intelligence-shaped page extraction (76k word boxes); anchoring engine
  built + validated (12/12 seed claims anchored, fabricated claim flagged unverifiable);
  visual highlight proof rendered (`docs/assets/warfarin_boxed_warning.png`).
- **P1 — Ingest**: Foundry Sandbox project + Media Set; upload corpus; run Document
  Intelligence; confirm per-page text + coordinates land as objects. *(next — needs Foundry)*
- **P2 — Extract**: claim schema + AIP Logic prompt + output schema **designed** (`docs/
  EXTRACTION.md`); anchoring reference impl done (`scripts/anchor_claims.py`). Remaining:
  port prompt into AIP Logic, wire anchoring as a downstream transform.
- **P3 — Ontology**: object types (Document, Page, Claim, Drug, Condition) + links; entity
  resolution (RxNorm for drugs, MedDRA/ICD for conditions); "unverifiable" flag logic.
- **P4 — Reviewer app** ✅ *(built on mock data; verified in-browser)*: React app in `app/`
  — filterable claims table + live PDF viewer (react-pdf) with auto-centering span highlight
  + provenance breadcrumb + Accept/Reject/Flag writeback (persists to localStorage). Clean
  build, no console errors. Remaining: swap mock `claims.seed.json` for real **OSDK** once
  the Ontology exists (P3); decide OSDK-vs-Workshop based on runway. Run: `npm --prefix app
  run dev`.
- **P5 — Demo**: end-to-end "drop doc → claim object → click → source page" arc; <4-min video
  covering problem, users, impact, and technical choices.

## Users & impact (for the video)
- **User**: a reviewer/analyst who must trust an assertion before acting on it — a drug-safety
  reviewer, a regulatory analyst, an intelligence analyst.
- **Decision informed**: accept/reject a claim; escalate a safety signal; sign off on a
  submission — with a defensible, one-click audit trail to source.
- **Impact**: collapses "trace this assertion to its source" from minutes/hours of manual PDF
  hunting to one click; makes provenance a property of the data, not a manual chore.
