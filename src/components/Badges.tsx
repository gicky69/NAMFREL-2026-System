import type { IncidentType, Severity, IncidentStatus } from "@/types";
import { INCIDENT_TYPES, SEVERITY_LEVELS, INCIDENT_STATUSES } from "@/types";

export function IncidentTypeBadge({ type }: { type: IncidentType }) {
  const config = INCIDENT_TYPES.find((t) => t.value === type);
  if (!config) return null;
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        borderColor: `${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const config = SEVERITY_LEVELS.find((s) => s.value === severity);
  if (!config) return null;
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        borderColor: `${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = INCIDENT_STATUSES.find((s) => s.value === status);
  if (!config) return null;
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        borderColor: `${config.color}30`,
      }}
    >
      {config.label}
    </span>
  );
}
