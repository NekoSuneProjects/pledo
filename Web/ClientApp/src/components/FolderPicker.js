import React, { useEffect, useState } from "react";

export function FolderPicker({ currentDirectory, onInputChange }) {
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState(currentDirectory);

  useEffect(() => {
    setSelectedDirectory(currentDirectory);
    getSubdirectories(currentDirectory);
  }, [currentDirectory]);

  const getSubdirectories = async (directory) => {
    const response = directory
      ? await fetch(`api/directory?${new URLSearchParams({ path: directory })}`)
      : await fetch("api/directory");
    const data = await response.json();
    setDirectories(data.subDirectories ?? []);
    setSelectedDirectory(data.currentDirectory);
  };

  const parentname = (path) => path.split(/[\\/]/).slice(0, -1).join("/");
  const directoryname = (path) => path.split(/[\\/]/).slice(-1)[0];

  return (
    <div className="space-y-4">
      <div className="surface-soft p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Current directory</p>
        <p className="mt-2 break-all text-sm text-white">{selectedDirectory || "Root"}</p>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        <button type="button" className="btn-secondary w-full justify-start" onClick={() => getSubdirectories(parentname(selectedDirectory ?? ""))}>
          ..
        </button>
        {directories.map((directory) => (
          <button
            key={directory}
            type="button"
            className="btn-secondary w-full justify-start"
            onClick={() => getSubdirectories(directory)}
          >
            {directoryname(directory)}
          </button>
        ))}
      </div>

      <button type="button" className="btn-primary" onClick={() => onInputChange?.(selectedDirectory)}>
        Use This Directory
      </button>
    </div>
  );
}
