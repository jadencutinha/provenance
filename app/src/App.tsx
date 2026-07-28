import { useMemo, useState } from "react";
import type { Claim, Decision, ReviewStatus } from "./types";
import { SEVERITY_RANK } from "./types";
import claimsRaw from "./data/claims.seed.json";
import { ClaimsList } from "./components/ClaimsList";
import { SourceViewer } from "./components/SourceViewer";

const CLAIMS = (claimsRaw as unknown as Claim[])
  .slice()
  .sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      a.subject_drug.localeCompare(b.subject_drug),
  );

const REVIEWER = "j.cutinha";
const STORE_KEY = "provenance.decisions.v1";

function loadDecisions(): Record<string, Decision> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

export interface Filters {
  q: string;
  drug: string;
  claim_type: string;
  severity: string;
  status: string;
  onlyUnverifiable: boolean;
}

const EMPTY_FILTERS: Filters = {
  q: "",
  drug: "",
  claim_type: "",
  severity: "",
  status: "",
  onlyUnverifiable: false,
};

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(CLAIMS[0]?.claim_id ?? null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>(loadDecisions);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // effective review status = decision override, else the claim's stored status
  const statusOf = (c: Claim): ReviewStatus => decisions[c.claim_id]?.status ?? c.review_status;

  const decide = (claimId: string, status: ReviewStatus) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (status === "unreviewed") delete next[claimId];
      else next[claimId] = { status, reviewer: REVIEWER, at: new Date().toISOString() };
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return CLAIMS.filter((c) => {
      if (filters.drug && c.subject_drug !== filters.drug) return false;
      if (filters.claim_type && c.claim_type !== filters.claim_type) return false;
      if (filters.severity && c.severity !== filters.severity) return false;
      if (filters.status && statusOf(c) !== filters.status) return false;
      if (filters.onlyUnverifiable && c.verifiable) return false;
      if (
        q &&
        !`${c.claim_text} ${c.subject_drug} ${c.object_condition ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, decisions]);

  const selected = CLAIMS.find((c) => c.claim_id === selectedId) ?? null;

  const stats = useMemo(() => {
    const verifiable = CLAIMS.filter((c) => c.verifiable).length;
    const decided = CLAIMS.filter((c) => statusOf(c) !== "unreviewed").length;
    return { total: CLAIMS.length, verifiable, decided };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">◆</span>
          <div>
            <div className="brand-name">Provenance</div>
            <div className="brand-sub">document-to-decision claims engine</div>
          </div>
        </div>
        <div className="stats">
          <Stat label="claims" value={stats.total} />
          <Stat
            label="verifiable"
            value={`${Math.round((stats.verifiable / stats.total) * 100)}%`}
            tone="ok"
          />
          <Stat label="decisions" value={stats.decided} tone="accent" />
        </div>
      </header>

      <main className="split">
        <ClaimsList
          claims={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          statusOf={statusOf}
          filters={filters}
          setFilters={setFilters}
          allClaims={CLAIMS}
        />
        <SourceViewer
          claim={selected}
          decision={selected ? decisions[selected.claim_id] : undefined}
          onDecide={decide}
        />
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone ?? ""}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
