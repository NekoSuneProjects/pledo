import React, { Component } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navigationItems = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/movies', label: 'Movies' },
  { to: '/tvshows', label: 'TV Shows' },
  { to: '/playlists', label: 'Playlists' },
  { to: '/downloads', label: 'Downloads' },
  { to: '/settings', label: 'Settings' },
];

export class NavMenu extends Component {
  static displayName = NavMenu.name;

  constructor(props) {
    super(props);
    this.toggleNavbar = this.toggleNavbar.bind(this);
    this.state = {
      collapsed: true,
    };
  }

  toggleNavbar() {
    this.setState(({ collapsed }) => ({
      collapsed: !collapsed,
    }));
  }

  render() {
    return (
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 text-white no-underline">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-500/20 text-lg font-semibold shadow-glow">
              P
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-300/70">Plex Downloader</p>
              <p className="text-lg font-semibold tracking-tight text-white">pledo</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={this.toggleNavbar}
            className="btn-secondary md:hidden"
            aria-expanded={!this.state.collapsed}
            aria-label="Toggle navigation"
          >
            Menu
          </button>

          <nav
            className={`w-full md:w-auto ${this.state.collapsed ? 'hidden md:block' : 'block'}`}
            aria-label="Primary"
          >
            <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-3 md:flex-row md:items-center md:rounded-full md:bg-transparent md:p-0">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => this.setState({ collapsed: true })}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-4 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-brand-500 text-white shadow-glow'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </header>
    );
  }
}
