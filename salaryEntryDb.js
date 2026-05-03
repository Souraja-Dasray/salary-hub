/**
 * Map between Supabase row shape and the entry objects used in App.jsx
 */

export function rowToEntry(row) {
  const m = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    level: row.level ?? "",
    industry: row.industry,
    location: row.location,
    yoe: row.yoe ?? 0,
    date: row.submitted_date,
    base: Number(row.base),
    variable: Number(row.variable),
    joining: Number(row.joining),
    retention: Number(row.retention),
    esopValue: Number(row.esop_value),
    hasEquity: Boolean(m.has_equity),
    equityType: m.equity_type ?? "",
    esopGrants: Number(m.esop_grants ?? 0),
    vestingSchedule: m.vesting_schedule ?? "",
    joiningClawback: Boolean(m.joining_clawback),
    joiningClawbackMonths: String(m.joining_clawback_months ?? "12"),
    retentionClawback: Boolean(m.retention_clawback),
    retentionClawbackMonths: String(m.retention_clawback_months ?? "12"),
    variableNote: m.variable_note ?? "",
    esopNote: m.esop_note ?? "",
    benefits: Array.isArray(m.benefits) ? m.benefits : [],
    notes: m.notes ?? "",
    gender: typeof m.gender === "string" ? m.gender : "",
  };
}

/** Payload from SubmitForm handleSubmit — only columns + metadata */
export function submittedDataToRow(data) {
  return {
    company: data.company,
    role: data.role,
    level: data.level || null,
    industry: data.industry,
    location: data.location,
    yoe: data.yoe ?? 0,
    submitted_date: data.date,
    base: data.base,
    variable: data.variable ?? 0,
    joining: data.joining ?? 0,
    retention: data.retention ?? 0,
    esop_value: data.esopValue ?? 0,
    metadata: {
      has_equity: Boolean(data.hasEquity),
      equity_type: data.equityType || "",
      esop_grants: data.esopGrants ?? 0,
      vesting_schedule: data.vestingSchedule || "",
      joining_clawback: Boolean(data.joiningClawback),
      joining_clawback_months: String(data.joiningClawbackMonths ?? "12"),
      retention_clawback: Boolean(data.retentionClawback),
      retention_clawback_months: String(data.retentionClawbackMonths ?? "12"),
      variable_note: data.variableNote || "",
      esop_note: data.esopNote || "",
      benefits: Array.isArray(data.benefits) ? data.benefits : [],
      notes: data.notes || "",
      variable_type: data.variableType || "percentage",
      variable_percent: data.variablePercent ?? "",
      gender: data.gender || "",
    },
  };
}
