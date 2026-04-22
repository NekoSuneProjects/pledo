import React, { Component } from "react";
import { humanizeByteSize } from "../utils/media";

export class Downloads extends Component {
  static displayName = Downloads.name;

  constructor(props) {
    super(props);
    this.state = { downloads: [], loading: true };
  }

  componentDidMount() {
    this.populateData();
    this.timerID = setInterval(() => this.populateData(), 2000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  async populateData() {
    const response = await fetch("api/download");
    const data = await response.json();
    this.setState({ downloads: data, loading: false });
  }

  async handleCancel(key) {
    await fetch(`api/download/${key}`, { method: "DELETE" });
  }

  async clearDownloadHistory() {
    await fetch("api/download", { method: "DELETE" });
    this.populateData();
  }

  renderStatus(download) {
    if (download.started && !download.finished) {
      return (
        <div className="w-full max-w-[12rem]">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-400 transition-all"
              style={{ width: `${Math.round((download.progress ?? 0) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">{Math.round((download.progress ?? 0) * 100)}%</p>
        </div>
      );
    }

    if (download.finishedSuccessfully) {
      return <span className="chip">Finished</span>;
    }

    if (download.finished) {
      return <span className="chip border-rose-400/20 bg-rose-400/10 text-rose-100">Cancelled</span>;
    }

    return <span className="chip">Pending</span>;
  }

  renderDownloadTable(downloads) {
    return (
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Started</th>
                <th>Transferred</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {downloads.map((download) => (
                <tr key={download.id}>
                  <td className="font-medium text-white">{download.name}</td>
                  <td>{download.started ? new Date(download.started).toLocaleString() : "Queued"}</td>
                  <td>
                    {download.finished
                      ? humanizeByteSize(download.totalBytes)
                      : `${humanizeByteSize(download.downloadedBytes)} / ${humanizeByteSize(download.totalBytes)}`}
                  </td>
                  <td>{this.renderStatus(download)}</td>
                  <td>
                    {(download.progress == null || download.progress < 1) && !download.finished ? (
                      <button type="button" className="btn-danger" onClick={() => this.handleCancel(download.mediaKey)}>
                        Cancel
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="space-y-8">
        <section className="surface p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Download Queue</p>
              <h1 className="page-title mt-3">Monitor queued, active, and finished Plex downloads.</h1>
              <p className="section-copy mt-4 max-w-3xl">
                This history is stored locally so you can keep track of what finished, what was cancelled, and what is
                still moving through the queue.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => this.clearDownloadHistory()}>
              Clear Old History
            </button>
          </div>
        </section>

        {this.state.loading ? (
          <div className="empty-state">Loading downloads...</div>
        ) : this.state.downloads.length === 0 ? (
          <div className="empty-state">No downloads yet. Queue a movie, season, or episode to see activity here.</div>
        ) : (
          this.renderDownloadTable(this.state.downloads)
        )}
      </div>
    );
  }
}
