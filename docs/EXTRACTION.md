# Extraction spec — Claim schema, AIP Logic prompt, and deterministic anchoring

This is the port target for Foundry. It defines (1) the `Claim` object, (2) the AIP Logic
prompt + output schema that turns a page into claims, and (3) the deterministic anchoring
step that maps each claim to exact page geometry. The reference implementation of the anchor
step is `scripts/anchor_claims.py`.

## Design principle: the LLM extracts, it never locates
The LLM is trusted to *identify* a claim and copy its text **verbatim**. It is **not** trusted
to produce page coordinates — coordinates come from a deterministic match of the verbatim text
against Document Intelligence's word boxes. This keeps provenance auditable: the highlight is a
function of the source document, not of model output. A claim whose verbatim text cannot be
located on its page is flagged `verifiable = false` — the product's "unverifiable" state.

```
Media Set (PDFs)
   └─ AIP Document Intelligence ──► DocumentPage { page_number, text, words[{text, bbox}] }
                                        │
   AIP Logic (LLM, per page) ──────────┘──► Claim (verbatim text + type + entities, NO coords)
                                        │
   Anchoring transform (deterministic) ┘──► Claim + { bbox, verifiable }  ──► Ontology
```

## The `Claim` object (Ontology object type)
| Property | Type | Notes |
|---|---|---|
| `claim_id` | string (PK) | `clm_` + sha1(doc｜page｜text)[:12] |
| `claim_text` | string | **verbatim** span, exactly as printed |
| `normalized_statement` | string | clean one-sentence canonical restatement |
| `claim_type` | enum | indication｜contraindication｜adverse_reaction｜warning｜dosing｜interaction｜efficacy｜monitoring｜mechanism |
| `severity` | enum | boxed_warning｜contraindication｜serious｜moderate｜info |
| `subject_drug` | string | → link to `Drug` |
| `object_condition` | string｜null | → link to `Condition` |
| `quantitative_value` | string｜null | incidence/threshold, verbatim (e.g. "12%", "eGFR below 30") |
| `source_document_id` | string | → link to `SourceDocument` |
| `page_number` | integer | → link to `DocumentPage` |
| `bbox` / `norm_bboxes` | struct | per-line highlight geometry (from anchoring) |
| `verifiable` | boolean | false ⇒ text could not be located on the page |
| `extraction_confidence` | double | model confidence [0,1] |
| `review_status` | enum | unreviewed｜accepted｜rejected｜flagged (writeback target) |
| `reviewer` / `reviewed_at` | string / timestamp | decision provenance (set by the Action) |

## AIP Logic — inputs
Run per `DocumentPage`. Inputs: `page_text` (string), `page_number` (int),
`document_title` (string), `drug_name` (string).

## AIP Logic — system / instruction prompt
```
You extract regulatory CLAIMS from one page of an FDA drug label.

A claim is an atomic, checkable assertion about a drug: an indication, contraindication,
warning, adverse reaction, drug interaction, dosing rule, monitoring requirement, efficacy
result, or mechanism. One claim = one subject–predicate–object.

RULES — follow exactly:
1. `claim_text` MUST be copied VERBATIM from the page text — character for character.
   Do not paraphrase, fix typos, expand abbreviations, or merge sentences. If you cannot
   copy a claim verbatim from this page, do not emit it. This field is a legal citation.
2. Emit one object per atomic claim. Split compound sentences into separate claims.
3. Classify `claim_type` and `severity` using only the allowed enum values.
4. `subject_drug` = the drug the claim is about (usually "{drug_name}").
   `object_condition` = the condition, effect, or entity the claim concerns; null if none.
5. `quantitative_value` = any rate, incidence, or threshold, copied verbatim; else null.
6. `normalized_statement` = one clean sentence restating the claim in plain language.
7. IGNORE boilerplate: section headers, page numbers, tables of contents, cross-references
   like "(5.1)", and navigation text such as "See full prescribing information".
8. Do NOT invent claims. If the page has no substantive claims, return an empty array.
9. `extraction_confidence` in [0,1] — how sure you are this is a real, verbatim claim.

Return ONLY a JSON array matching the output schema.
```

## AIP Logic — structured output schema
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["claim_text","claim_type","severity","subject_drug",
                 "normalized_statement","extraction_confidence"],
    "properties": {
      "claim_text":        {"type": "string"},
      "claim_type":        {"enum": ["indication","contraindication","adverse_reaction",
                                     "warning","dosing","interaction","efficacy",
                                     "monitoring","mechanism"]},
      "severity":          {"enum": ["boxed_warning","contraindication","serious",
                                     "moderate","info"]},
      "subject_drug":      {"type": "string"},
      "object_condition":  {"type": ["string","null"]},
      "quantitative_value":{"type": ["string","null"]},
      "normalized_statement": {"type": "string"},
      "extraction_confidence": {"type": "number"}
    }
  }
}
```

## Few-shot example (from warfarin page 1)
Input page text (excerpt):
```
WARNING: BLEEDING RISK
Warfarin sodium can cause major or fatal bleeding. (5.1)
Perform regular monitoring of INR in all treated patients. (2.1)
...
CONTRAINDICATIONS
Pregnancy, except in women with mechanical heart valves. (4, 5.7, 8.1)
```
Expected output:
```json
[
  {"claim_text": "Warfarin sodium can cause major or fatal bleeding.",
   "claim_type": "warning", "severity": "boxed_warning", "subject_drug": "Warfarin",
   "object_condition": "Major bleeding", "quantitative_value": null,
   "normalized_statement": "Warfarin can cause major or fatal bleeding.",
   "extraction_confidence": 0.98},
  {"claim_text": "Perform regular monitoring of INR in all treated patients.",
   "claim_type": "monitoring", "severity": "serious", "subject_drug": "Warfarin",
   "object_condition": "INR monitoring", "quantitative_value": null,
   "normalized_statement": "INR must be monitored regularly in all warfarin patients.",
   "extraction_confidence": 0.95},
  {"claim_text": "Pregnancy, except in women with mechanical heart valves.",
   "claim_type": "contraindication", "severity": "contraindication",
   "subject_drug": "Warfarin", "object_condition": "Pregnancy", "quantitative_value": null,
   "normalized_statement": "Warfarin is contraindicated in pregnancy (except mechanical heart valves).",
   "extraction_confidence": 0.93}
]
```
(Note the `(5.1)`, `(2.1)`, `(4, 5.7, 8.1)` cross-references are dropped, per rule 7 — but the
claim text is otherwise verbatim.)

## Anchoring step (deterministic, downstream of the LLM)
Reference: `scripts/anchor_claims.py`. In Foundry this is a Pipeline Builder transform (Python)
or a TypeScript function that, for each Claim:
1. Loads the matching `DocumentPage` word boxes (Document Intelligence output).
2. Tokenizes claim + page to alphanumeric-lowercase tokens (punctuation/whitespace tolerant).
3. Finds the best ordered-token window; exact = score 1.0, else fuzzy ≥ 0.7.
4. Groups matched words into visual lines → per-line + union bounding boxes, in normalized
   `[0,1]` coords for scale-independent highlighting.
5. Sets `verifiable = matched`. Unmatched ⇒ flagged in the reviewer, never silently dropped.

Validated locally: 12/12 seed claims anchored exactly; a fabricated claim
("Warfarin is completely safe during pregnancy") correctly returns `verifiable = false`.
