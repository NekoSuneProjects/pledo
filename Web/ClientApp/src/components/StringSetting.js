import React from "react";

function StringSetting({ setting, callback }) {
  return (
    <div className="surface-soft p-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">{setting.name}</span>
        <input
          id={setting.key}
          name={setting.key}
          type="text"
          className="field"
          value={setting.value ?? ""}
          onChange={(event) => callback(event.target.value)}
        />
      </label>
      <p className="mt-3 text-sm text-slate-400">{setting.description}</p>
    </div>
  );
}

export default StringSetting;
