import React, { useEffect, useState } from "react";
import { FolderPicker } from "./FolderPicker";

function FilePathSetting({ setting, callback }) {
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [value, setValue] = useState(setting.value ?? "");

  useEffect(() => {
    setValue(setting.value ?? "");
  }, [setting.value]);

  return (
    <div className="surface-soft p-5">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">{setting.name}</span>
        <input
          id={setting.key}
          name={setting.key}
          type="text"
          value={value}
          className="field"
          onChange={(event) => {
            setValue(event.target.value);
            callback(event.target.value);
          }}
        />
      </label>
      <p className="mt-3 text-sm text-slate-400">{setting.description}</p>
      <div className="mt-4">
        <button type="button" className="btn-secondary" onClick={() => setShowFolderPicker(true)}>
          Select Directory
        </button>
      </div>

      {showFolderPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="surface w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">Select directory</p>
                <p className="mt-1 text-sm text-slate-400">Pick the folder this setting should point to.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setShowFolderPicker(false)}>
                Close
              </button>
            </div>
            <FolderPicker
              currentDirectory={value}
              onInputChange={(directory) => {
                callback(directory);
                setValue(directory);
                setShowFolderPicker(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FilePathSetting;
