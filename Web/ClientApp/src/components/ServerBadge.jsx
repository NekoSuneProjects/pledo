import React from "react";
import { getServerName, isServerOnline } from "../utils/media";

export function ServerBadge({ knownServers = [], serverId }) {
  const online = isServerOnline(knownServers, serverId);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        online
          ? "border-brand-400/30 bg-brand-400/10 text-brand-100"
          : "border-rose-400/30 bg-rose-400/10 text-rose-100"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? "bg-brand-400" : "bg-rose-400"}`} />
      {getServerName(knownServers, serverId)}
    </span>
  );
}
