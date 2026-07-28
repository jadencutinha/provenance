#!/usr/bin/env python3
"""Anchor a verbatim claim string to exact page bounding box(es).

This is the heart of Provenance's provenance guarantee. AIP Logic will return each claim's
verbatim `claim_text` + `page_number`; this module locates that text among the page's words
and computes the highlight geometry. The same logic runs (a) here, to prototype/validate,
and (b) conceptually in the Ontology as the Claim<->Page anchor. A claim whose text cannot be
located returns matched=False -> the "unverifiable" flag that is the product's thesis.

Matching is punctuation/whitespace tolerant (labels are messy) with an ordered-token fuzzy
fallback. Geometry is grouped per visual line so multi-line claims highlight tightly, and is
emitted in both PDF points and normalized [0,1] coords for scale-independent rendering.
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "data" / "pages"
LINE_TOL = 3.0          # points: words within this vertical delta share a visual line
FUZZY_THRESHOLD = 0.7   # min ordered-token match ratio to accept a fuzzy anchor


def _norm(tok: str) -> str:
    """Alphanumeric-only lowercase form: 'bleeding.' -> 'bleeding', '(5.1)' -> '51'."""
    return re.sub(r"[^a-z0-9]", "", tok.lower())


def _claim_tokens(text: str) -> list[str]:
    return [t for t in (_norm(w) for w in text.split()) if t]


def _page_tokens(words: list[dict]) -> list[tuple[int, str]]:
    """(word_index, normalized_token) for words that carry alphanumerics."""
    out = []
    for w in words:
        t = _norm(w["text"])
        if t:
            out.append((w["i"], t))
    return out


def _best_window(page_toks: list[str], claim_toks: list[str]) -> tuple[int, float]:
    """Return (start_index, score) of the best ordered-token window. score=1.0 is exact."""
    n, m = len(page_toks), len(claim_toks)
    if m == 0 or n < m:
        return -1, 0.0
    best_i, best_score = -1, 0.0
    for start in range(0, n - m + 1):
        hits = sum(1 for k in range(m) if page_toks[start + k] == claim_toks[k])
        score = hits / m
        if score > best_score:
            best_i, best_score = start, score
            if score == 1.0:
                break
    return best_i, best_score


def _geometry(words_by_index: dict[int, dict], word_indices: list[int],
              page_w: float, page_h: float) -> dict:
    """Group matched words into visual lines -> per-line + union boxes (points + normalized)."""
    boxes = sorted((words_by_index[i] for i in word_indices), key=lambda w: (w["top"], w["x0"]))
    lines: list[list[dict]] = []
    for w in boxes:
        if lines and abs(w["top"] - lines[-1][0]["top"]) <= LINE_TOL:
            lines[-1].append(w)
        else:
            lines.append([w])

    def union(ws: list[dict]) -> dict:
        return {"x0": min(w["x0"] for w in ws), "top": min(w["top"] for w in ws),
                "x1": max(w["x1"] for w in ws), "bottom": max(w["bottom"] for w in ws)}

    def norm(b: dict) -> dict:
        return {"x0": round(b["x0"] / page_w, 5), "top": round(b["top"] / page_h, 5),
                "x1": round(b["x1"] / page_w, 5), "bottom": round(b["bottom"] / page_h, 5)}

    line_boxes = [union(ln) for ln in lines]
    whole = union(boxes)
    return {"bbox": whole, "bboxes": line_boxes,
            "norm_bbox": norm(whole), "norm_bboxes": [norm(b) for b in line_boxes]}


def anchor_on_page(page: dict, claim_text: str) -> dict | None:
    """Locate claim_text on a single page dict. None if below fuzzy threshold."""
    ptoks = _page_tokens(page["words"])
    claim_toks = _claim_tokens(claim_text)
    if not claim_toks or not ptoks:
        return None
    idxs = [i for i, _ in ptoks]
    toks = [t for _, t in ptoks]
    start, score = _best_window(toks, claim_toks)
    if start < 0 or score < FUZZY_THRESHOLD:
        return None
    word_indices = idxs[start:start + len(claim_toks)]
    words_by_index = {w["i"]: w for w in page["words"]}
    geo = _geometry(words_by_index, word_indices, page["width"], page["height"])
    return {"matched": True, "method": "exact" if score == 1.0 else "fuzzy",
            "score": round(score, 3), "page_number": page["page_number"],
            "word_indices": word_indices, **geo}


def anchor(doc: dict, claim_text: str, page_hint: int | None = None) -> dict:
    """Anchor across a document. If page_hint given, restrict to it. Returns best match or
    an unmatched sentinel (the 'unverifiable' state)."""
    pages = ([p for p in doc["pages"] if p["page_number"] == page_hint]
             if page_hint else doc["pages"])
    best = None
    for pg in pages:
        res = anchor_on_page(pg, claim_text)
        if res and (best is None or res["score"] > best["score"]):
            best = res
            if best["score"] == 1.0:
                break
    return best or {"matched": False, "method": "none", "score": 0.0,
                    "page_number": page_hint, "verifiable": False}


def find_all_pages(doc: dict, claim_text: str, min_score: float = 1.0) -> list[dict]:
    """Every page where the claim appears at >= min_score (e.g. boxed warning on pp.1 & 12)."""
    hits = []
    for pg in doc["pages"]:
        res = anchor_on_page(pg, claim_text)
        if res and res["score"] >= min_score:
            hits.append(res)
    return hits


def load_doc(slug: str) -> dict:
    return json.loads((PAGES / f"{slug}.pages.json").read_text())


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print('usage: anchor_claims.py <slug> "<claim text>" [page]'); sys.exit(2)
    slug, claim = sys.argv[1], sys.argv[2]
    page_hint = int(sys.argv[3]) if len(sys.argv) > 3 else None
    doc = load_doc(slug)
    res = anchor(doc, claim, page_hint)
    print(json.dumps(res, indent=2))
    if res.get("matched"):
        allp = [r["page_number"] for r in find_all_pages(doc, claim)]
        print("appears (exact) on pages:", allp)
