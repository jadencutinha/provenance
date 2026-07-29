import { useEffect, useMemo, useState } from "react";
import type { Claim, Decision, ReviewStatus } from "./types";
import { SEVERITY_RANK } from "./types";
import { fetchClaims, applyEditClaim } from "./foundry";
import { ClaimsList } from "./components/ClaimsList";
import { SourceViewer } from "./components/SourceViewer";

const REVIEWER = "j.cutinha";

const sortClaims = (cs: Claim[]) =>
  cs.slice().sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      a.subject_drug.localeCompare(b.subject_drug),
  );

export interface Filters {
  q: string;
  drug: string;
  claim_type: string;
  severity: string;
  status: string;
  onlyUnverifiable: boolean;
}

const EMPTY_FILTERS: Filters = {
  q: "", drug: "", claim_type: "", severity: "", status: "", onlyUnverifiable: false,
};

export default function App() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    let live = true;
    fetchClaims()
      .then((cs) => {
        if (!live) return;
        const sorted = sortClaims(cs);
        setClaims(sorted);
        setSelectedId(sorted[0]?.claim_id ?? null);
        setLoading(false);
      })
      .catch((e) => { if (live) { setLoadError(String(e.message ?? e)); setLoading(false); } });
    return () => { live = false; };
  }, []);

  const statusOf = (c: Claim): ReviewStatus => decisions[c.claim_id]?.status ?? c.review_status;

  const decide = async (claimId: string, status: ReviewStatus) => {
    const prev = decisions[claimId];
    setDecisions((d) => ({ ...d, [claimId]: { status, reviewer: REVIEWER, at: new Date().toISOString() } }));
    setActionError(null);
    try {
      await applyEditClaim(claimId, status); // writes reviewStatus back to the Ontology
    } catch (e) {
      setDecisions((d) => { const n = { ...d }; if (prev) n[claimId] = prev; else delete n[claimId]; return n; });
      setActionError(`Writeback failed: ${(e as Error).message}`);
    }
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return claims.filter((c) => {
      if (filters.drug && c.subject_drug !== filters.drug) return false;
      if (filters.claim_type && c.claim_type !== filters.claim_type) return false;
      if (filters.severity && c.severity !== filters.severity) return false;
      if (filters.status && statusOf(c) !== filters.status) return false;
      if (filters.onlyUnverifiable && c.verifiable) return false;
      if (q && !`${c.claim_text} ${c.subject_drug} ${c.object_condition ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, decisions, claims]);

  const selected = claims.find((c) => c.claim_id === selectedId) ?? null;

  const stats = useMemo(() => {
    const verifiable = claims.filter((c) => c.verifiable).length;
    const decided = claims.filter((c) => statusOf(c) !== "unreviewed").length;
    return { total: claims.length, verifiable, decided };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions, claims]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/provenance-logo.png" alt="Provenance" />
          <span className="brand-sub">document-to-decision claims engine</span>
          <span className="live-pill" title="Reading live from the Foundry Ontology">
            <span className="live-dot" /> Live · Foundry Ontology
          </span>
        </div>
        <div className="stats">
          <Stat label="claims" value={stats.total} />
          <Stat label="verifiable" value={stats.total ? `${Math.round((stats.verifiable / stats.total) * 100)}%` : "—"} tone="ok" />
          <Stat label="decisions" value={stats.decided} tone="accent" />
        </div>
      </header>

      {actionError && (
        <div className="toast error" onClick={() => setActionError(null)}>{actionError} · click to dismiss</div>
      )}

      {loadError ? (
        <div className="fullscreen-msg">
          <div className="fs-title">Couldn’t reach the Foundry Ontology</div>
          <p>{loadError}</p>
          <p className="hint">Check that <code>app/.env.local</code> has a valid <code>FOUNDRY_TOKEN</code> and restart the dev server.</p>
        </div>
      ) : loading ? (
        <div className="fullscreen-msg"><div className="spinner" /><p>Loading claims from the Ontology…</p></div>
      ) : (
        <main className="split">
          <ClaimsList
            claims={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            statusOf={statusOf}
            filters={filters}
            setFilters={setFilters}
            allClaims={claims}
          />
          <SourceViewer
            claim={selected}
            decision={selected ? decisions[selected.claim_id] : undefined}
            onDecide={decide}
          />
        </main>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
