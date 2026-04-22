import React from "react";

function DropdownSetting({ setting, callback }) {
  return (
    <div className="surface-soft p-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">{setting.name}</span>
        <select
          id={setting.key}
          name={setting.key}
          className="field-select"
          value={setting.value ?? ""}
          onChange={(event) => callback(event.target.value)}
        >
          {(setting.options ?? []).map((option) => (
            <option key={`${setting.key}-${option.value}`} value={option.value}>
              {option.uiName}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-sm text-slate-400">{setting.description}</p>
    </div>
  );
}

export default DropdownSetting;
