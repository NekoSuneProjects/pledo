import React, { Component } from 'react';
import { NavMenu } from './NavMenu';

export class Layout extends Component {
  static displayName = Layout.name;

  render() {
    return (
      <div className="app-shell">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-24 h-64 w-64 rounded-full bg-brand-400/10 blur-3xl" />
          <div className="absolute right-0 top-48 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-brand-700/10 blur-3xl" />
        </div>
        <NavMenu />
        <main className="page-container">{this.props.children}</main>
      </div>
    );
  }
}
