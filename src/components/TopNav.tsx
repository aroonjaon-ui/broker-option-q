import { useState } from 'react';
import { ArrowRight, LogOut, Menu, X } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Brand */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#06182B] to-[#0B3A5C] font-display text-sm font-extrabold text-emerald-300">
            X
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
            Xena <span className="text-emerald-600">Broker</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[1px] h-[2px] rounded-full bg-emerald-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleNav('funding')}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
              >
                Fund account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onLogout();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleNav('login')}
                className="hidden sm:inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => handleNav('signup')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-105 cursor-pointer"
              >
                Open account
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {!user && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleNav('login')}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => handleNav('signup')}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2.5 text-sm font-bold text-white cursor-pointer"
              >
                Open account
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
