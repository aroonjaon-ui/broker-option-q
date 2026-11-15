import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Search, Star } from 'lucide-react';
import { OrderSide, Sector, Stock } from '../types/broker';
import { formatCurrency, formatPercent, formatSignedCurrency } from '../utils/formatters';

interface MarketsPageProps {
  stocks: Stock[];
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  onTradeSymbol: (symbol: string, side: OrderSide) => void;
}

type FilterTab = 'All' | 'Watchlist' | Sector;

const FILTER_TABS: FilterTab[] = [
  'All',
  'Watchlist',
  'Technology',
  'Semiconductors',
  'Financials',
  'Consumer',
  'Healthcare',
  'Energy',
];

export default function MarketsPage({
  stocks,
  watchlist,
  onToggleWatchlist,
  onTradeSymbol,
}: MarketsPageProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stocks.filter((s) => {
      if (filterTab === 'Watchlist' && !watchlist.includes(s.symbol)) return false;
      if (
        filterTab !== 'All' &&
        filterTab !== 'Watchlist' &&
        s.sector !== filterTab
      ) {
        return false;
      }
      if (q) {
        return (
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stocks, filterTab, searchQuery, watchlist]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            Available Stocks
          </h1>
          <p className="text-sm sm:text-[15px] text-[var(--muted-foreground)] mt-1">
            Live share prices for stocks available to buy on Xena Broker.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticker or company"
            aria-label="Search ticker or company"
            className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
          />
        </div>
      </div>

      {/* Responsive Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const active = filterTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-[var(--primary-foreground)] shadow-xs'
                  : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Fully Responsive Stock Price List (Zero Horizontal Scroll on Mobile) */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] overflow-hidden">
        {filteredStocks.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
              No matching stocks found
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1.5">
              {filterTab === 'Watchlist'
                ? 'Star any stock in the list to add it to your watchlist.'
                : 'Adjust your filter or search query.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterTab('All');
                setSearchQuery('');
              }}
              className="mt-5 px-4.5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-xl shadow-xs hover:bg-[var(--primary-100)] transition-colors cursor-pointer"
            >
              Show All Stocks
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card/Row Layout (< md): Everything visible without horizontal scroll */}
            <div className="md:hidden divide-y divide-[var(--border)]">
              {filteredStocks.map((stock) => {
                const change = stock.price - stock.previousClose;
                const changePct = (change / stock.previousClose) * 100;
                const isUp = change >= 0;
                const isStarred = watchlist.includes(stock.symbol);

                return (
                  <div
                    key={stock.symbol}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleWatchlist(stock.symbol)}
                        aria-label={
                          isStarred
                            ? `Remove ${stock.symbol} from watchlist`
                            : `Add ${stock.symbol} to watchlist`
                        }
                        className="p-1.5 -ml-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--accent)] shrink-0 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isStarred ? 'fill-[var(--accent)] text-[var(--accent)]' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => onTradeSymbol(stock.symbol, 'buy')}
                        className="text-left min-w-0 cursor-pointer"
                      >
                        <div className="font-display font-extrabold text-base text-[var(--foreground)]">
                          {stock.symbol}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)] truncate">
                          {stock.name}
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-base font-bold text-[var(--foreground)]">
                          {formatCurrency(stock.price)}
                        </div>
                        <div
                          className={`text-xs font-semibold inline-flex items-center justify-end gap-0.5 ${
                            isUp ? 'text-[var(--secondary)]' : 'text-[var(--destructive)]'
                          }`}
                        >
                          {isUp ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>{formatPercent(changePct)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onTradeSymbol(stock.symbol, 'buy')}
                        className="px-3.5 py-2 text-xs font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-2xs hover:from-[var(--primary-500)] hover:via-[var(--secondary-500)] hover:to-[var(--accent-500)] transition-all whitespace-nowrap cursor-pointer"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout (md+) */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--subtle)] via-white to-[var(--subtle)]/50 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    <th className="py-3.5 pl-5 pr-2 w-12">Watch</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4 text-right">Share Price</th>
                    <th className="py-3.5 px-4 text-right">24h Change</th>
                    <th className="py-3.5 px-5 text-right">Buy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-sm">
                  {filteredStocks.map((stock) => {
                    const change = stock.price - stock.previousClose;
                    const changePct = (change / stock.previousClose) * 100;
                    const isUp = change >= 0;
                    const isStarred = watchlist.includes(stock.symbol);

                    return (
                      <tr key={stock.symbol} className="hover:bg-[var(--subtle)] transition-colors">
                        <td className="py-4 pl-5 pr-2">
                          <button
                            type="button"
                            onClick={() => onToggleWatchlist(stock.symbol)}
                            aria-label={
                              isStarred
                                ? `Remove ${stock.symbol} from watchlist`
                                : `Add ${stock.symbol} to watchlist`
                            }
                            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isStarred ? 'fill-[var(--accent)] text-[var(--accent)]' : ''
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(stock.symbol, 'buy')}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-display text-base font-extrabold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                              {stock.symbol}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                              {stock.name} <span aria-hidden="true">·</span> {stock.exchange}
                            </div>
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right font-mono tabular-nums text-lg font-bold text-[var(--foreground)]">
                          {formatCurrency(stock.price)}
                        </td>
                        <td
                          className={`py-4 px-4 text-right font-mono tabular-nums font-semibold ${
                            isUp ? 'text-[var(--secondary)]' : 'text-[var(--destructive)]'
                          }`}
                        >
                          <div className="inline-flex items-center justify-end gap-1">
                            {isUp ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                            <span>
                              {formatSignedCurrency(change)} ({formatPercent(changePct)})
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(stock.symbol, 'buy')}
                            className="px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-2xs hover:from-[var(--primary-500)] hover:via-[var(--secondary-500)] hover:to-[var(--accent-500)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Buy {stock.symbol}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}