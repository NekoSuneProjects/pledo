import React, { Component } from "react";
import { SyncButton } from "./SyncButton";

export class Overview extends Component {
  static displayName = Overview.name;

  constructor(props) {
    super(props);
    this.state = {
      account: null,
      servers: null,
      syncLogs: [],
      syncSettings: {
        automaticSyncEnabled: true,
        automaticSyncIntervalMinutes: 15,
      },
      loginPending: false,
      popup: null,
      syncing: false,
    };
  }

  componentDidMount() {
    this.populateAccountData();
    this.populateServerData();
    this.populateSyncSettings();
    this.populateSyncLogs();
    this.dashboardTimerID = setInterval(() => {
      this.populateServerData();
      this.populateSyncLogs();
    }, 30000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
    clearInterval(this.dashboardTimerID);
  }

  openInNewTab = async () => {
    const response = await fetch("api/account/loginuri");
    const data = await response.text();
    const popupWindow = window.open(data, "_blank");

    this.setState({ loginPending: true, popup: popupWindow });
    clearInterval(this.timerID);
    this.startAccountPolling();
  };

  startAccountPolling() {
    this.timerID = setInterval(() => {
      if (!this.state.account) {
        this.populateAccountData().then((data) => {
          if (data) {
            this.state.popup?.close();
          }
        });
      } else if (this.state.loginPending && !this.state.syncing) {
        this.syncConnections();
      } else {
        this.populateServerData().then((data) => {
          if (data) {
            clearInterval(this.timerID);
            this.setState({ loginPending: false, syncing: false });
          }
        });
      }
    }, 3000);
  }

  renderServerCard(server) {
    return (
      <article key={server.id} className="surface-soft p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${server.isOnline ? "bg-brand-400" : "bg-rose-400"}`} />
              <p className="text-lg font-semibold text-white">{server.name}</p>
            </div>
            <p className="mt-1 text-sm text-slate-400">{server.sourceTitle ?? "Shared Plex source"}</p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              server.isOnline
                ? "bg-brand-400/15 text-brand-200 ring-1 ring-brand-400/30"
                : "bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/30"
            }`}
          >
            {server.isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </article>
    );
  }

  renderAuthenticatedView() {
    const serversTotal = this.state.servers?.length ?? 0;
    const serversOnline = this.state.servers?.filter((server) => server.isOnline)?.length ?? 0;
    const syncLabel = this.state.syncSettings.automaticSyncEnabled
      ? `Auto scan every ${this.state.syncSettings.automaticSyncIntervalMinutes} min`
      : "Auto scan disabled";

    return (
      <div className="space-y-8">
        <section className="surface overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h1 className="page-title mt-3">Welcome back, {this.state.account?.username ?? "Plex user"}.</h1>
              <p className="section-copy mt-4 max-w-2xl">
                Your Plex server map is synced locally so you can search, browse, and download with server-aware file
                actions instead of jumping between separate Plex hosts.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {this.state.loginPending || this.state.syncing ? (
                  <button type="button" className="btn-primary" disabled>
                    Syncing connections...
                  </button>
                ) : (
                  <SyncButton
                    whenSyncFinished={() => {
                      this.populateServerData();
                      this.populateSyncLogs();
                    }}
                  />
                )}
                <span className="chip">{serversOnline} online</span>
                <span className="chip">{serversTotal} total servers</span>
                <span className="chip">{syncLabel}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Available servers</p>
                <p className="mt-2 text-4xl font-semibold text-white">{serversTotal}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Online now</p>
                <p className="mt-2 text-4xl font-semibold text-white">{serversOnline}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="eyebrow">Server Status</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Mapped Plex servers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {this.state.servers?.map((server) => this.renderServerCard(server))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Recent Activity</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Automatic sync log</h2>
            </div>
            <button type="button" className="btn-secondary" onClick={() => this.populateSyncLogs()}>
              Refresh Logs
            </button>
          </div>
          {this.state.syncLogs.length === 0 ? (
            <div className="empty-state">No sync events yet. New movies, TV shows, removals, and server status changes will appear here.</div>
          ) : (
            <div className="space-y-3">
              {this.state.syncLogs.map((entry, index) => this.renderSyncLogEntry(entry, index))}
            </div>
          )}
        </section>
      </div>
    );
  }

  renderSyncLogEntry(entry, index) {
    const accentClass =
      entry.eventType === "media-added"
        ? "border-brand-400/25"
        : entry.eventType === "media-removed" || entry.level === "warning"
          ? "border-amber-400/25"
          : entry.level === "error"
            ? "border-rose-400/25"
            : "border-white/10";

    return (
      <article key={`${entry.timestamp}-${index}`} className={`surface-soft p-4 ${accentClass}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white">{entry.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.serverName ? <span className="chip">{entry.serverName}</span> : null}
              {entry.mediaType ? <span className="chip">{entry.mediaType}</span> : null}
              {entry.mediaName ? <span className="chip">{entry.mediaName}</span> : null}
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {new Date(entry.timestamp).toLocaleString()}
          </p>
        </div>
      </article>
    );
  }

  renderGuestView() {
    return (
      <section className="surface overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow">Plex Downloader</p>
            <h1 className="page-title mt-3">A greener, darker home for Plex downloads.</h1>
            <p className="section-copy mt-4 max-w-2xl">
              Log in with Plex to map every shared server you can access, then browse, search, and download media from
              one modern dashboard.
            </p>
            <div className="mt-6">
              <button type="button" className="btn-primary" onClick={this.openInNewTab}>
                Login With Plex
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-soft p-5">
              <p className="text-lg font-semibold text-white">Unified Search</p>
              <p className="mt-2 text-sm text-slate-400">
                Search titles, years, and resolution across every synced Plex mapping.
              </p>
            </div>
            <div className="surface-soft p-5">
              <p className="text-lg font-semibold text-white">Download Options</p>
              <p className="mt-2 text-sm text-slate-400">
                Queue server-side downloads or open a direct Plex file link immediately.
              </p>
            </div>
            <div className="surface-soft p-5">
              <p className="text-lg font-semibold text-white">Resolution Aware</p>
              <p className="mt-2 text-sm text-slate-400">
                See mapped codecs, resolutions, and file sizes before you download anything.
              </p>
            </div>
            <div className="surface-soft p-5">
              <p className="text-lg font-semibold text-white">Server Mapping</p>
              <p className="mt-2 text-sm text-slate-400">
                Results always show which Plex server each movie or episode belongs to.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  render() {
    if (this.state.account || this.state.loginPending) {
      return this.renderAuthenticatedView();
    }

    return this.renderGuestView();
  }

  async populateAccountData() {
    const response = await fetch("api/account");
    const data = await response.json();
    if (data) {
      this.setState({ account: data });
    }
    return data;
  }

  async populateServerData() {
    const response = await fetch("api/server");
    const data = await response.json();
    if (data) {
      this.setState({ servers: data });
    }
    return data;
  }

  async syncConnections() {
    if (!this.state.syncing) {
      this.setState({ syncing: true });
      fetch("api/sync?syncType=1", { method: "POST" }).catch((error) => console.log(error));
    }
  }

  async populateSyncLogs() {
    const response = await fetch("api/synclog?take=12");
    const data = await response.json();
    this.setState({ syncLogs: data ?? [] });
  }

  async populateSyncSettings() {
    const response = await fetch("api/setting");
    const data = await response.json();
    const automaticSyncEnabled =
      data.find((setting) => setting.key === "AutomaticMediaSyncEnabled")?.value ?? "true";
    const automaticSyncIntervalMinutes =
      data.find((setting) => setting.key === "AutomaticMediaSyncIntervalMinutes")?.value ?? "15";

    this.setState({
      syncSettings: {
        automaticSyncEnabled: automaticSyncEnabled === "true",
        automaticSyncIntervalMinutes: Number(automaticSyncIntervalMinutes) || 15,
      },
    });
  }
}
