import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import type { Claim, Decision, ReviewStatus } from "../types";

interface Props {
  claim: Claim | null;
  decision?: Decision;
  onDecide: (claimId: string, status: ReviewStatus) => void;
}

/** Measure the available width so the PDF renders crisply and highlights stay aligned. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      const cw = e.contentRect.width - 48;
      setW(Math.max(320, Math.min(760, cw)));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

export function SourceViewer({ claim, decision, onDecide }: Props) {
  const { ref, w } = useWidth();
  const hlRef = useRef<HTMLDivElement>(null);
  const file = useMemo(
    () => (claim ? `/pdfs/${claim.source_document_id}.pdf` : null),
    [claim],
  );

  // once the page has rendered, center the highlight so the claim is always in view
  const centerHighlight = () =>
    hlRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });

  if (!claim) {
    return (
      <section className="panel viewer-panel empty">
        <div className="empty-state">
          <div className="empty-mark">◆</div>
          <p>Select a claim to trace it to its exact source page.</p>
        </div>
      </section>
    );
  }

  const status = decision?.status ?? claim.review_status;

  return (
    <section className="panel viewer-panel" ref={ref}>
      {/* provenance breadcrumb — the unbroken chain */}
      <nav className="breadcrumb">
        <span className="crumb claim-crumb">Claim</span>
        <span className="sep">▸</span>
        <span className="crumb">Page {claim.page_number}</span>
        <span className="sep">▸</span>
        <span className="crumb">{claim.source.drug} label</span>
        <span className="sep">▸</span>
        <a className="crumb link" href={claim.source.dailymed_url} target="_blank" rel="noreferrer">
          DailyMed ↗
        </a>
      </nav>

      {/* the claim itself */}
      <div className="claim-detail">
        <div className="detail-chips">
          <span className={`chip sev-chip sev-${claim.severity}`}>
            {claim.severity.replace(/_/g, " ")}
          </span>
          <span className="chip chip-type">{claim.claim_type.replace(/_/g, " ")}</span>
          {claim.object_condition && (
            <span className="chip chip-cond">{claim.object_condition}</span>
          )}
          <span className="chip chip-conf">
            conf {Math.round(claim.extraction_confidence * 100)}%
          </span>
        </div>
        <div className="normalized">{claim.normalized_statement}</div>
        <div className="verbatim">
          <span className="verbatim-label">verbatim source text</span>
          <span className="verbatim-text">“{claim.claim_text}”</span>
        </div>
      </div>

      {/* the source page with the exact span highlighted */}
      {claim.verifiable ? (
        <div className="doc-scroll">
          <Document
            key={claim.source_document_id}
            file={file!}
            loading={<div className="doc-msg">Loading source document…</div>}
            error={<div className="doc-msg err">Could not load source PDF.</div>}
          >
            <div className="page-wrap" style={{ width: w }}>
              <Page
                pageNumber={claim.page_number}
                width={w}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={centerHighlight}
                loading={<div className="doc-msg">Rendering page {claim.page_number}…</div>}
              />
              {claim.anchor?.norm_bboxes.map((b, i) => (
                <div
                  key={`${claim.claim_id}-${i}`}
                  ref={i === 0 ? hlRef : undefined}
                  className="highlight"
                  style={{
                    left: `${b.x0 * 100}%`,
                    top: `${b.top * 100}%`,
                    width: `${(b.x1 - b.x0) * 100}%`,
                    height: `${(b.bottom - b.top) * 100}%`,
                  }}
                />
              ))}
            </div>
          </Document>
        </div>
      ) : (
        <div className="unverifiable-banner">
          <div className="uv-title">⚠ Unverifiable claim</div>
          <p>
            This claim's text could not be located on any page of the source document. It is
            flagged rather than silently trusted — provenance could not be established.
          </p>
        </div>
      )}

      {/* the decision — document-to-decision writeback */}
      <div className="decision-bar">
        <div className="decision-actions">
          <button
            className={`dec accept ${status === "accepted" ? "active" : ""}`}
            onClick={() => onDecide(claim.claim_id, "accepted")}
          >
            ✓ Accept
          </button>
          <button
            className={`dec reject ${status === "rejected" ? "active" : ""}`}
            onClick={() => onDecide(claim.claim_id, "rejected")}
          >
            ✕ Reject
          </button>
          <button
            className={`dec flag ${status === "flagged" ? "active" : ""}`}
            onClick={() => onDecide(claim.claim_id, "flagged")}
          >
            ⚑ Flag
          </button>
          {status !== "unreviewed" && (
            <button className="dec reset" onClick={() => onDecide(claim.claim_id, "unreviewed")}>
              reset
            </button>
          )}
        </div>
        <div className="decision-meta">
          {decision ? (
            <>
              <span className={`badge status-${decision.status}`}>{decision.status}</span>
              by <b>{decision.reviewer}</b> · {new Date(decision.at).toLocaleString()}
            </>
          ) : (
            <span className="muted">unreviewed — record a decision</span>
          )}
        </div>
      </div>
    </section>
  );
}
