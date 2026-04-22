import React from "react";
import FilePathSetting from "./FilePathSetting";
import DropdownSetting from "./DropdownSetting";
import StringSetting from "./StringSetting";

export class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      settings: [],
      loading: true,
    };

    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    this.populateData();
  }

  async populateData() {
    const response = await fetch("api/setting");
    const data = await response.json();
    this.setState({ settings: data, loading: false });
  }

  updateValueOfSetting(key, value) {
    this.setState((current) => ({
      settings: current.settings.map((setting) =>
        setting.key === key
          ? {
              ...setting,
              value,
            }
          : setting
      ),
    }));
  }

  async updateSettings(settings) {
    return fetch("api/setting", {
      method: "POST",
      body: JSON.stringify(settings),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    await this.updateSettings(this.state.settings);
  }

  async handleResetDatabase() {
    await fetch("api/setting", { method: "DELETE" });
  }

  renderSetting(setting) {
    if (setting.type === "path") {
      return (
        <FilePathSetting
          setting={setting}
          callback={(directory) => this.updateValueOfSetting(setting.key, directory)}
        />
      );
    }

    if (setting.type === "enum") {
      return (
        <DropdownSetting setting={setting} callback={(value) => this.updateValueOfSetting(setting.key, value)} />
      );
    }

    return <StringSetting setting={setting} callback={(value) => this.updateValueOfSetting(setting.key, value)} />;
  }

  render() {
    if (this.state.loading) {
      return <div className="empty-state">Loading settings...</div>;
    }

    return (
      <div className="space-y-8">
        <section className="surface p-6 sm:p-8">
          <p className="eyebrow">Settings</p>
          <h1 className="page-title mt-3">Configure download folders, file preferences, and sync behavior.</h1>
          <p className="section-copy mt-4 max-w-3xl">
            These settings shape how Plex files are selected, named, and stored once you queue a download.
          </p>
        </section>

        <form className="space-y-4" onSubmit={this.handleSubmit}>
          {this.state.settings.map((setting) => (
            <div key={setting.key}>{this.renderSetting(setting)}</div>
          ))}

          <div className="surface flex flex-wrap items-center gap-3 p-5">
            <button type="reset" className="btn-secondary" onClick={() => this.populateData()}>
              Cancel Changes
            </button>
            <button type="submit" className="btn-primary">
              Save Settings
            </button>
            <button type="button" className="btn-danger" onClick={() => this.handleResetDatabase()}>
              Reset Database Completely
            </button>
          </div>
        </form>
      </div>
    );
  }
}
