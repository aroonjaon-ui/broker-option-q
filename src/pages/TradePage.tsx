import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Download,
  Search,
  Star,
} from 'lucide-react';
import StockChart from '../components/StockChart';
import OrderTicket from '../components/OrderTicket';
import {
  ChartStyle,
  Order,
  OrderSide,
  OrderStatus,
  OrderType,
  Position,
  Stock,
  Timeframe,
  TimeInForce,
} from '../types/broker';
import { generateStockSeries } from '../data/stocks';
import {
  downloadCsv,
  formatCurrency,
  formatMarketCap,
  formatPercent,
  formatSignedCurrency,
  formatTimestamp,
  formatVolume,
} from '../utils/formatters';

interface TradePageProps {
  stocks: Stock[];
  selectedSymbol: string;
  initialSide: OrderSide;
  onSelectSymbol: (symbol: string) => void;
  cashBalance: number;
  reservedCash: number;
  positions: Record<string, Position>;
  orders: Order[];
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  onPlaceOrder: (params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    qty: number;
    limitPrice?: number;
    timeInForce: TimeInForce;
  }) => { ok: boolean; message: string };
  onCancelOrder: (orderId: string) => void;
  onExecuteLimitNow: (orderId: string) => void;
  isLiveQuotes: boolean;
  onToggleLiveQuotes: () => void;
}

type OrderFilter = 'all' | OrderStatus;
type BottomTab = 'orders' | 'positions' | 'details';

export default function TradePage({
  stocks,
  selectedSymbol,
  onSelectSymbol,
  cashBalance,
  reservedCash,
  positions,
  orders,
  watchlist,
  onToggleWatchlist,
  onPlaceOrder,
  onCancelOrder,
  onExecuteLimitNow,
}: TradePageProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tickerQuery, setTickerQuery] = useState('');
  const [watchFilter, setWatchFilter] = useState<'all' | 'watchlist'>('all');
  const [orderModalSide, setOrderModalSide] = useState<OrderSide | null>(null);

  const [bottomTab, setBottomTab] = useState<BottomTab>('orders');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderFilter>('all');
  const [orderScope, setOrderScope] = useState<'all' | 'symbol'>('all');
  const ordersSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!orderModalSide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOrderModalSide(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [orderModalSide]);

  const activeStock = useMemo(
    () => stocks.find((s) => s.symbol === selectedSymbol) ?? stocks[0],
    [stocks, selectedSymbol]
  );

  const chartSeries = useMemo(
    () => generateStockSeries(activeStock, timeframe),
    [activeStock, timeframe]
  );

  const selectorStocks = useMemo(() => {
    const q = tickerQuery.trim().toLowerCase();
    return stocks.filter((s) => {
      if (watchFilter === 'watchlist' && !watchlist.includes(s.symbol)) return false;
      if (q) {
        return (
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stocks, tickerQuery, watchFilter, watchlist]);

  const scopedOrders = useMemo(() => {
    return orderScope === 'symbol'
      ? orders.filter((o) => o.symbol === activeStock.symbol)
      : orders;
  }, [orders, orderScope, activeStock.symbol]);

  const orderCounts = useMemo(() => {
    return {
      all: scopedOrders.length,
      open: scopedOrders.filter((o) => o.status === 'open').length,
      filled: scopedOrders.filter((o) => o.status === 'filled').length,
      cancelled: scopedOrders.filter((o) => o.status === 'cancelled').length,
    };
  }, [scopedOrders]);

  const filteredOrders = useMemo(() => {
    return scopedOrders.filter((o) =>
      orderStatusFilter === 'all' ? true : o.status === orderStatusFilter
    );
  }, [scopedOrders, orderStatusFilter]);

  const openPositionsList = useMemo(() => {
    return Object.values(positions)
      .filter((p) => p.shares > 0)
      .map((p) => {
        const s = stocks.find((st) => st.symbol === p.symbol);
        const lastPrice = s?.price ?? p.avgCost;
        const mktValue = p.shares * lastPrice;
        const pnl = mktValue - p.shares * p.avgCost;
        const pnlPct = p.avgCost > 0 ? (pnl / (p.shares * p.avgCost)) * 100 : 0;
        return { ...p, name: s?.name ?? p.symbol, lastPrice, mktValue, pnl, pnlPct };
      });
  }, [positions, stocks]);

  const dayChange = activeStock.price - activeStock.previousClose;
  const dayChangePct = (dayChange / activeStock.previousClose) * 100;
  const isUp = dayChange >= 0;
  const isWatchlisted = watchlist.includes(activeStock.symbol);
  const currentPosition = positions[activeStock.symbol];

  const bidPrice = Math.max(0.01, Number((activeStock.price - 0.02).toFixed(2)));
  const askPrice = Number((activeStock.price + 0.02).toFixed(2));

  const scrollToOrders = () => {
    setBottomTab('orders');
    ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectTicker = (symbol: string) => {
    onSelectSymbol(symbol);
    setOrderModalSide(null);
    setPickerOpen(false);
  };

  const handleExportOrdersCsv = () => {
    downloadCsv(
      'xena-broker-orders.csv',
      ['Order ID', 'Time', 'Symbol', 'Side', 'Type', 'Qty', 'Price', 'Total', 'TIF', 'Status'],
      filteredOrders.map((o) => [
        o.id,
        o.createdAt,
        o.symbol,
        o.side.toUpperCase(),
        o.type.toUpperCase(),
        o.qty,
        (o.fillPrice ?? o.limitPrice ?? 0).toFixed(2),
        o.total.toFixed(2),
        o.timeInForce,
        o.status.toUpperCase(),
      ])
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Stock Selector Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Searchable Stock Selector Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              aria-expanded={pickerOpen}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50/50 hover:border-blue-300 transition-colors cursor-pointer"
            >
              <span className="font-display text-sm sm:text-base font-extrabold text-slate-900">
                {activeStock.symbol}
              </span>
              <span className="text-xs text-slate-600 hidden sm:inline truncate max-w-[140px]">
                {activeStock.name}
              </span>
              <span className="font-mono tabular-nums text-xs sm:text-sm font-bold text-blue-700">
                {formatCurrency(activeStock.price)}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            </button>

            {pickerOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                <div className="p-3 border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">Select Stock</span>
                    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setWatchFilter('all')}
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md cursor-pointer ${
                          watchFilter === 'all'
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatchFilter('watchlist')}
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md cursor-pointer ${
                          watchFilter === 'watchlist'
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Watchlist
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={tickerQuery}
                      onChange={(e) => setTickerQuery(e.target.value)}
                      placeholder="Search ticker or company"
                      autoFocus
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {selectorStocks.map((s) => {
                    const pct = ((s.price - s.previousClose) / s.previousClose) * 100;
                    return (
                      <button
                        key={s.symbol}
                        type="button"
                        onClick={() => handleSelectTicker(s.symbol)}
                        className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-blue-50/40 cursor-pointer ${
                          s.symbol === activeStock.symbol ? 'bg-blue-50/80' : ''
                        }`}
                      >
                        <div>
                          <div className="font-display text-sm font-extrabold text-slate-900">{s.symbol}</div>
                          <div className="text-xs text-slate-500">{s.name}</div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-xs font-bold text-slate-900">
                            {formatCurrency(s.price)}
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatPercent(pct)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Watchlist Star Control */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleWatchlist(activeStock.symbol)}
            aria-label={
              isWatchlisted
                ? `Remove ${activeStock.symbol} from watchlist`
                : `Add ${activeStock.symbol} to watchlist`
            }
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-500 hover:border-amber-300 hover:bg-amber-50/40 transition-colors cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${
                isWatchlisted ? 'fill-amber-400 text-amber-500' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Chart Section Directly After Stock Selector (Full Width) */}
      <div className="space-y-3">
        {/* Balanced Quote Readout Bar */}
        <div className="bg-gradient-to-r from-white via-white to-blue-50/45 border border-slate-200/90 rounded-2xl shadow-2xs px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-xl font-extrabold text-slate-900 truncate tracking-tight">
              {activeStock.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 truncate mt-0.5">
              <span className="font-semibold text-blue-700">{activeStock.symbol}</span> · {activeStock.exchange} · {activeStock.sector}
            </p>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <div className="hidden md:flex items-center gap-4 text-xs sm:text-sm font-mono tabular-nums border-r border-slate-200 pr-5">
              <span>
                <span className="text-slate-400 font-sans">Bid </span>
                <span className="text-slate-900 font-bold">{formatCurrency(bidPrice)}</span>
              </span>
              <span>
                <span className="text-slate-400 font-sans">Ask </span>
                <span className="text-slate-900 font-bold">{formatCurrency(askPrice)}</span>
              </span>
              <span>
                <span className="text-slate-400 font-sans">Vol </span>
                <span className="text-slate-900 font-semibold">{formatVolume(activeStock.volume)}</span>
              </span>
            </div>

            <div className="text-right">
              <div className="font-mono tabular-nums text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                {formatCurrency(activeStock.price)}
              </div>
              <div
                className={`inline-flex items-center justify-end gap-0.5 text-xs sm:text-sm font-mono tabular-nums font-semibold ${
                  isUp ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span>
                  {formatSignedCurrency(dayChange)} ({formatPercent(dayChangePct)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Interactive Price Chart */}
        <StockChart
          symbol={activeStock.symbol}
          data={chartSeries}
          previousClose={activeStock.previousClose}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          chartStyle={chartStyle}
          onChartStyleChange={setChartStyle}
        />
      </div>

      {/* 3. Directly Under the Chart: Buy / Sell Buttons + Compact Position Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div
          className={
            currentPosition
              ? 'lg:col-span-5 grid grid-cols-2 gap-3'
              : 'lg:col-span-12 max-w-md grid grid-cols-2 gap-3'
          }
        >
          <button
            type="button"
            onClick={() => setOrderModalSide('buy')}
            className="py-3.5 px-5 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            Buy {activeStock.symbol}
          </button>
          <button
            type="button"
            onClick={() => setOrderModalSide('sell')}
            className="py-3.5 px-5 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            Sell {activeStock.symbol}
          </button>
        </div>

        {currentPosition && (
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl shadow-2xs px-4 py-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-700">
                Your {activeStock.symbol} Position
              </span>
              <button
                type="button"
                onClick={() => setOrderModalSide('sell')}
                className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Sell Shares
              </button>
            </div>

            {(() => {
              const mktValue = currentPosition.shares * activeStock.price;
              const costBasis = currentPosition.shares * currentPosition.avgCost;
              const unrealized = mktValue - costBasis;
              const unrealizedPct = costBasis > 0 ? (unrealized / costBasis) * 100 : 0;
              const posUp = unrealized >= 0;

              return (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <div className="text-slate-400">Shares</div>
                    <div className="font-mono tabular-nums text-xs font-bold text-slate-900 mt-0.5">
                      {currentPosition.shares}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Avg Cost</div>
                    <div className="font-mono tabular-nums text-xs font-semibold text-slate-900 mt-0.5">
                      {formatCurrency(currentPosition.avgCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Market Value</div>
                    <div className="font-mono tabular-nums text-xs font-bold text-slate-900 mt-0.5">
                      {formatCurrency(mktValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Return</div>
                    <div
                      className={`font-mono tabular-nums text-xs font-bold mt-0.5 ${
                        posUp ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatSignedCurrency(unrealized)} ({formatPercent(unrealizedPct)})
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 4. Compact Orders, Positions & Quote Details Moved Down */}
      <div
        ref={ordersSectionRef}
        className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden"
      >
        <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setBottomTab('orders')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                bottomTab === 'orders'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Orders ({orderCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('positions')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                bottomTab === 'positions'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Positions ({openPositionsList.length})
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('details')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                bottomTab === 'details'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quote Details
            </button>
          </div>

          {bottomTab === 'orders' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOrderScope('all')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    orderScope === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setOrderScope('symbol')}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    orderScope === 'symbol'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {activeStock.symbol}
                </button>
              </div>

              {filteredOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportOrdersCsv}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              )}
            </div>
          )}
        </div>

        {bottomTab === 'orders' && (
          <>
            <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-1 overflow-x-auto">
              {(
                [
                  { id: 'all', label: `All (${orderCounts.all})` },
                  { id: 'open', label: `Working (${orderCounts.open})` },
                  { id: 'filled', label: `Filled (${orderCounts.filled})` },
                  { id: 'cancelled', label: `Cancelled (${orderCounts.cancelled})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(tab.id)}
                  className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    orderStatusFilter === tab.id
                      ? 'bg-white text-blue-700 border border-slate-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500">
                No {orderStatusFilter === 'all' ? '' : `${orderStatusFilter} `}orders
                {orderScope === 'symbol' ? ` for ${activeStock.symbol}` : ''}.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-600">
                      <th className="py-1.5 px-4">Symbol</th>
                      <th className="py-1.5 px-3">Side</th>
                      <th className="py-1.5 px-3">Type</th>
                      <th className="py-1.5 px-3 text-right">Qty</th>
                      <th className="py-1.5 px-3 text-right">Price</th>
                      <th className="py-1.5 px-3 text-right">Total</th>
                      <th className="py-1.5 px-3">Status</th>
                      <th className="py-1.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {filteredOrders.map((ord) => {
                      const displayPrice = ord.fillPrice ?? ord.limitPrice ?? 0;
                      return (
                        <tr key={ord.id} className="hover:bg-blue-50/25">
                          <td className="py-2 px-4">
                            <button
                              type="button"
                              onClick={() => handleSelectTicker(ord.symbol)}
                              className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                            >
                              {ord.symbol}
                            </button>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              {formatTimestamp(ord.createdAt)}
                            </span>
                          </td>
                          <td
                            className={`py-2 px-3 font-bold ${
                              ord.side === 'buy' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {ord.side === 'buy' ? 'Buy' : 'Sell'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 capitalize whitespace-nowrap">
                            {ord.type} · {ord.timeInForce}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">
                            {ord.qty}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                            {formatCurrency(displayPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatCurrency(ord.total)}
                          </td>
                          <td className="py-2 px-3 font-semibold capitalize">
                            <span
                              className={
                                ord.status === 'filled'
                                  ? 'text-emerald-600'
                                  : ord.status === 'open'
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                              }
                            >
                              {ord.status === 'open' ? 'Working' : ord.status}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right whitespace-nowrap">
                            {ord.status === 'open' ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onExecuteLimitNow(ord.id)}
                                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                                >
                                  Fill Now
                                </button>
                                <span className="text-slate-300" aria-hidden="true">
                                  |
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onCancelOrder(ord.id)}
                                  className="font-semibold text-rose-600 hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {bottomTab === 'positions' && (
          openPositionsList.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-500">
              No open positions. Place a buy order to open a stock position.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-600">
                    <th className="py-1.5 px-4">Symbol</th>
                    <th className="py-1.5 px-3 text-right">Shares</th>
                    <th className="py-1.5 px-3 text-right">Avg Cost</th>
                    <th className="py-1.5 px-3 text-right">Last</th>
                    <th className="py-1.5 px-3 text-right">Value</th>
                    <th className="py-1.5 px-4 text-right">Total P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {openPositionsList.map((p) => (
                    <tr key={p.symbol} className="hover:bg-blue-50/25">
                      <td className="py-2 px-4">
                        <button
                          type="button"
                          onClick={() => handleSelectTicker(p.symbol)}
                          className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                        >
                          {p.symbol}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">
                        {p.shares}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(p.avgCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">
                        {formatCurrency(p.lastPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrency(p.mktValue)}
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-mono tabular-nums font-semibold ${
                          p.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatSignedCurrency(p.pnl)} ({formatPercent(p.pnlPct)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {bottomTab === 'details' && (
          <div className="p-4 space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-y-2.5 gap-x-4 text-xs pb-2.5 border-b border-slate-100">
              <div>
                <div className="text-[11px] text-slate-400">Open</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatCurrency(activeStock.dayOpen)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Prev Close</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatCurrency(activeStock.previousClose)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">52W Range</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatCurrency(activeStock.week52Low)}–{formatCurrency(activeStock.week52High)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Market Cap</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatMarketCap(activeStock.marketCapBillions)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">P/E Ratio</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {activeStock.peRatio.toFixed(1)}x
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Div Yield</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {activeStock.dividendYield.toFixed(2)}%
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{activeStock.description}</p>
          </div>
        )}
      </div>

      {/* Order Ticket Modal Popup */}
      {orderModalSide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Order Ticket for ${activeStock.symbol}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOrderModalSide(null);
          }}
        >
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
            <OrderTicket
              stock={activeStock}
              cashBalance={cashBalance}
              reservedCash={reservedCash}
              position={currentPosition}
              initialSide={orderModalSide}
              onPlaceOrder={onPlaceOrder}
              onViewOrders={() => {
                setOrderModalSide(null);
                scrollToOrders();
              }}
              onClose={() => setOrderModalSide(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
