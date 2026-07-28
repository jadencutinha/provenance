# Provenance

**A document-to-decision claims engine.** In high-stakes domains — drug safety, policy,
legal, intelligence — decisions rest on claims buried in unstructured PDFs, and nobody can
trace a given assertion back to its source fast enough to trust it. Provenance ingests a
messy corpus, extracts structured **claims**, resolves them against an **ontology** of
entities (Drug, Condition, Claim, Document, Page), and gives a reviewer a view where
**every claim links back to the exact page it came from** — one click, no broken link.

Built on Palantir Foundry + AIP: Document Intelligence for ingest, AIP Logic for
extraction, the Ontology as the claims matrix, and a custom OSDK app for the reviewer.

## The thesis, made visible
- A claim carries a **verbatim span + page number + bounding box**, never a paraphrase.
- A claim that cannot anchor to a real page is flagged **unverifiable** — the product
  thesis rendered as a visible state.
- A reviewer's **Accept / Reject / Flag** decision writes back to the Ontology as its own
  attributed, provenance-tracked object. That is the "document-**to-decision**" step.

## Corpus
Public-domain FDA drug labels (Structured Product Labels) from **DailyMed** as real,
multi-page PDFs — the honest "unstructured document" input. **openFDA** structured label
JSON + **FAERS** adverse-event data serve as reference / ground-truth for entity
resolution and validation. See `docs/ROADMAP.md`.

## Layout
```
data/            corpus (raw PDFs (gitignored) + manifest + openFDA reference)
scripts/         data acquisition & local extraction prototypes
docs/            roadmap, ontology spec, extraction spec, Foundry runbook
app/             OSDK reviewer app (added in Phase 4)
```

## Setup
```bash
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
./.venv/bin/python scripts/fetch_labels.py      # pull the curated corpus
```
