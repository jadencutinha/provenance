import { useMemo } from "react";
import type { Claim, ReviewStatus } from "../types";
import type { Filters } from "../App";

interface Props {
  claims: Claim[];
  allClaims: Claim[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusOf: (c: Claim) => ReviewStatus;
  filters: Filters;
  setFilters: (f: Filters) => void;
}

const uniq = (xs: string[]) => Array.from(new Set(xs)).sort();

export function ClaimsList({
  claims,
  allClaims,
  selectedId,
  onSelect,
  statusOf,
  filters,
  setFilters,
}: Props) {
  const opts = useMemo(
    () => ({
      drug: uniq(allClaims.map((c) => c.subject_drug)),
      claim_type: uniq(allClaims.map((c) => c.claim_type)),
      severity: uniq(allClaims.map((c) => c.severity)),
    }),
    [allClaims],
  );

  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <section className="panel claims-panel">
      <div className="filters">
        <input
          className="search"
          placeholder="Search claims, drugs, conditions…"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
        />
        <div className="filter-row">
          <Select
            value={filters.drug}
            onChange={(v) => set({ drug: v })}
            label="All drugs"
            options={opts.drug}
          />
          <Select
            value={filters.severity}
            onChange={(v) => set({ severity: v })}
            label="All severity"
            options={opts.severity}
            pretty
          />
          <Select
            value={filters.claim_type}
            onChange={(v) => set({ claim_type: v })}
            label="All types"
            options={opts.claim_type}
            pretty
          />
          <button
            className={`toggle ${filters.onlyUnverifiable ? "on" : ""}`}
            onClick={() => set({ onlyUnverifiable: !filters.onlyUnverifiable })}
            title="Show only claims that could not be anchored to a source page"
          >
            ⚠ unverifiable
          </button>
        </div>
        <div className="result-count">
          {claims.length} of {allClaims.length} claims
        </div>
      </div>

      <div className="claim-list">
        {claims.map((c, i) => {
          const status = statusOf(c);
          return (
            <button
              key={c.claim_id}
              className={`claim-card ${selectedId === c.claim_id ? "selected" : ""}`}
              onClick={() => onSelect(c.claim_id)}
              style={{ animationDelay: `${Math.min(i, 14) * 0.03}s` }}
            >
              <span className={`sev-bar sev-${c.severity}`} />
              <div className="claim-body">
                <div className="claim-chips">
                  <span className="chip chip-drug">{c.subject_drug}</span>
                  <span className={`chip sev-chip sev-${c.severity}`}>
                    {pretty(c.severity)}
                  </span>
                  <span className="chip chip-type">{pretty(c.claim_type)}</span>
                </div>
                <div className="claim-text">{c.claim_text}</div>
                <div className="claim-footer">
                  {c.object_condition && (
                    <span className="condition">→ {c.object_condition}</span>
                  )}
                  <span className="spacer" />
                  {c.verifiable ? (
                    <span className="badge ok" title="anchored to source page">
                      ✓ verifiable
                    </span>
                  ) : (
                    <span className="badge bad" title="could not anchor to source">
                      ✕ unverifiable
                    </span>
                  )}
                  {status !== "unreviewed" && (
                    <span className={`badge status-${status}`}>{status}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {claims.length === 0 && <div className="empty-list">No claims match these filters.</div>}
      </div>
    </section>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
  pretty: doPretty,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
  pretty?: boolean;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {doPretty ? pretty(o) : o}
        </option>
      ))}
    </select>
  );
}

function pretty(s: string) {
  return s.replace(/_/g, " ");
}
