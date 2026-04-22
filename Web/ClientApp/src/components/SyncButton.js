import React, { Component } from "react";

export class SyncButton extends Component {
  constructor(props) {
    super(props);
    this.state = { tasks: [], loading: false };
  }

  componentDidMount() {
    this.startSyncPolling();
  }

  componentWillUnmount() {
    this.stopSyncPolling();
  }

  handleClick = () => {
    this.startSync();
  };

  startSyncPolling() {
    this.timerID = setInterval(() => this.populateTaskData(), 1000);
  }

  stopSyncPolling() {
    clearInterval(this.timerID);
  }

  isSyncOngoing = () => this.state.tasks.some((task) => task.type === 0);

  async populateTaskData() {
    if (this.state.loading) {
      return;
    }

    this.setState({ loading: true });
    const response = await fetch("api/task");
    const data = await response.json();
    const wasSyncing = this.isSyncOngoing();
    const isSyncing = data.some((task) => task.type === 0);

    if (!isSyncing && wasSyncing && this.props.whenSyncFinished) {
      this.props.whenSyncFinished();
    }

    this.setState({ tasks: data, loading: false });
  }

  async startSync() {
    try {
      await fetch("api/sync", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.log(error);
      alert("There was a problem with syncing. Please try again.");
    }
  }

  render() {
    if (this.isSyncOngoing()) {
      return (
        <button type="button" className="btn-primary" disabled>
          {this.state.tasks[0]?.name ?? "Syncing metadata..."}
        </button>
      );
    }

    return (
      <button type="button" className="btn-primary" onClick={this.handleClick}>
        Sync All Metadata
      </button>
    );
  }
}
