import React from "react";

export function Selection({ title, items, value, placeholder, onChange, disabled }) {
  const hasItems = items.length > 0;

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{title}</span>
      <select
        className="field-select"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {!hasItems && <option value="">{placeholder ?? `No ${title.toLowerCase()} available`}</option>}
        {hasItems &&
          items.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
      </select>
    </label>
  );
}
