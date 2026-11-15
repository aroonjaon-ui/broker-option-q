import { useState } from 'react';
import { Menu, X, LogOut, Search } from 'lucide-react';
import { PageId, UserAccount } from '../types/broker';

interface TopNavProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  user: UserAccount | null;
  onLogout: () => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'trade', label: 'Trade' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'markets', label: 'Markets' },
  { id: 'funding', label: 'Funding' },
];

export default function TopNav({
  activePage,
  onNavigate,
  user,
  onLogout,
}: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const handleAuthAction = () => {
    setMobileOpen(false);
    if (user) {
      onLogout();
    } else {
      onNavigate(activePage === 'login' ? 'signup' : 'login');
    }
  };

  const authButtonLabel = user
    ? 'Sign Out'
    : activePage === 'login'
      ? 'Sign Up'
      : 'Sign In';

  return (
    <header
      className="sticky top-0 z-30 bg-[var(--nav-bg)] backdrop-blur-[var(--nav-blur)] border-b border-[var(--nav-border)] shadow-[var(--nav-shadow)]"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-xl font-extrabold tracking-tight text-[var(--foreground)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] cursor-pointer"
        >
          Xena{' '}
          <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
            Broker
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative py-2 text-[15px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                  isActive
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[2px] h-[2px] rounded-t-full bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-cyan-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAuthAction}
            className="hidden sm:inline-flex items-center justify-center px-4.5 py-2 text-sm font-semibold rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] whitespace-nowrap shrink-0 cursor-pointer ${
              user
                ? 'bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]'
                : 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[var(--primary-foreground)] hover:from-[var(--primary-100)] hover:to-[var(--secondary-100)]'
            }"}
          >
            {authButtonLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--foreground)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={handleAuthAction}
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] whitespace-nowrap cursor-pointer ${
                user
                  ? 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive-100)]'
                  : 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[var(--primary-foreground)] hover:from-[var(--primary-100)] hover:to-[var(--secondary-100)]'
              }"
            >
              {authButtonLabel}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}