import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { OrderSide, OrderType, Position, Stock, TimeInForce } from '../types/broker';
import { formatCurrency } from '../utils/formatters';

interface OrderTicketProps {
  stock: Stock;
  cashBalance: number;
  reservedCash: number;
  position?: Position;
  initialSide?: OrderSide;
  onPlaceOrder: (params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    qty: number;
    limitPrice?: number;
    timeInForce: TimeInForce;
  }) => { ok: boolean; message: string };
  onViewOrders: () => void;
  onClose?: () => void;
}

export default function OrderTicket({
  stock,
  cashBalance,
  reservedCash,
  position,
  initialSide = 'buy',
  onPlaceOrder,
  onViewOrders,
  onClose,
}: OrderTicketProps) {
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [qtyInput, setQtyInput] = useState<string>('10');
  const [limitPriceInput, setLimitPriceInput] = useState<string>(stock.price.toFixed(2));
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('DAY');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setSide(initialSide);
    setFeedback(null);
  }, [initialSide, stock.symbol]);

  useEffect(() => {
    setLimitPriceInput(stock.price.toFixed(2));
  }, [stock.symbol]);

  const availableBuyingPower = Math.max(0, cashBalance - reservedCash);
  const ownedShares = position?.shares ?? 0;

  const parsedQty = Math.floor(Number(qtyInput) || 0);
  const parsedLimit = Number(limitPriceInput) || 0;
  const executionPrice = orderType === 'market' ? stock.price : parsedLimit;
  const estimatedTotal = parsedQty > 0 && executionPrice > 0 ? parsedQty * executionPrice : 0;

  const maxBuyShares =
    executionPrice > 0 ? Math.floor(availableBuyingPower / executionPrice) : 0;

  const handleQuickPct = (pct: number) => {
    setFeedback(null);
    if (side === 'buy') {
      const shares = Math.floor(maxBuyShares * pct);
      setQtyInput(String(Math.max(1, shares)));
    } else {
      const shares = Math.floor(ownedShares * pct);
      setQtyInput(String(Math.max(0, shares)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (parsedQty <= 0 || !Number.isFinite(parsedQty)) {
      setFeedback({ type: 'error', message: 'Enter a valid whole share quantity greater than 0.' });
      return;
    }

    if (orderType === 'limit' && (parsedLimit <= 0 || !Number.isFinite(parsedLimit))) {
      setFeedback({ type: 'error', message: 'Enter a valid limit price greater than $0.00.' });
      return;
    }

    if (side === 'buy' && estimatedTotal > availableBuyingPower + 0.001) {
      setFeedback({
        type: 'error',
        message: `Insufficient buying power. Available: ${formatCurrency(availableBuyingPower)}.`,
      });
      return;
    }

    if (side === 'sell' && parsedQty > ownedShares) {
      setFeedback({
        type: 'error',
        message: `Insufficient shares. You hold ${ownedShares} shares of ${stock.symbol}.`,
      });
      return;
    }

    const result = onPlaceOrder({
      symbol: stock.symbol,
      side,
      type: orderType,
      qty: parsedQty,
      limitPrice: orderType === 'limit' ? Number(parsedLimit.toFixed(2)) : undefined,
      timeInForce,
    });

    if (result.ok) {
      setFeedback({ type: 'success', message: result.message });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] max-w-md w-full">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
            Order Ticket · {stock.symbol}
          </h2>
          <span className="text-sm font-semibold text-[var(--primary)] font-mono tabular-nums">
            {formatCurrency(stock.price)}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order ticket"
            className="p-1.5 rounded-xl hover:bg-[var(--subtle)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Buy / Sell Segmented Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--subtle)] rounded-xl mt-4">
        <button
          type="button"
          onClick={() => {
            setSide('buy');
            setFeedback(null);
          }}
          className={`py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
            side === 'buy'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Buy {stock.symbol}
        </button>
        <button
          type="button"
          onClick={() => {
            setSide('sell');
            setFeedback(null);
          }}
          className={`py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
            side === 'sell'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          Sell {stock.symbol}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Order Type */}
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-medium text-[var(--muted)]">Order Type</label>
          <div className="inline-flex items-center bg-[var(--input)] p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setOrderType('market')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                orderType === 'market'
                  ? 'bg-[var(--card)] text-[var(--primary)] shadow-2xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Market
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('limit');
                setLimitPriceInput(stock.price.toFixed(2));
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                orderType === 'limit'
                  ? 'bg-[var(--card)] text-[var(--primary)] shadow-2xs'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="order-qty" className="text-sm font-medium text-[var(--muted)]">
              Shares
            </label>
            <span className="text-xs font-medium text-[var(--muted)] font-mono tabular-nums">
              {side === 'buy'
                ? `Max ${maxBuyShares} sh`
                : `Held ${ownedShares} sh`}
            </span>
          </div>
          <input
            id="order-qty"
            type="number"
            min={1}
            step={1}
            value={qtyInput}
            onChange={(e) => {
              setQtyInput(e.target.value);
              setFeedback(null);
            }}
            className="w-full px-3.5 py-2.5 text-base font-mono tabular-nums font-bold text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            placeholder="0"
          />

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[
              { label: '25%', pct: 0.25 },
              { label: '50%', pct: 0.5 },
              { label: '75%', pct: 0.75 },
              { label: 'Max', pct: 1 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleQuickPct(preset.pct)}
                className="py-1.5 text-xs font-semibold text-[var(--muted)] bg-[var(--input)] border border-[var(--border)] rounded-lg hover:bg-[var(--subtle)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Limit Price Input */}
        {orderType === 'limit' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="limit-price" className="text-sm font-medium text-[var(--muted)]">
                Limit Price (USD)
              </label>
              <button
                type="button"
                onClick={() => setLimitPriceInput(stock.price.toFixed(2))}
                className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                Use Market ({formatCurrency(stock.price)})
              </button>
            </div>
            <input
              id="limit-price"
              type="number"
              min={0.01}
              step={0.01}
              value={limitPriceInput}
              onChange={(e) => {
                setLimitPriceInput(e.target.value);
                setFeedback(null);
              }}
              className="w-full px-3.5 py-2.5 text-base font-mono tabular-nums font-bold text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
            />
          </div>
        )}

        {/* Time in Force */}
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="tif-select" className="text-sm font-medium text-[var(--muted)]">
            Time in Force
          </label>
          <select
            id="tif-select"
            value={timeInForce}
            onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
            className="px-3 py-1.5 text-xs font-semibold text-[var(--muted)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--primary)] cursor-pointer"
          >
            <option value="DAY">Day Order</option>
            <option value="GTC">Good 'Til Canceled</option>
          </select>
        </div>

        {/* Summary Breakdown */}
        <div className="pt-3 border-t border-[var(--border)] space-y-2 text-sm">
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span>{orderType === 'market' ? 'Market Price' : 'Limit Price'}</span>
            <span className="font-mono tabular-nums font-semibold text-[var(--primary)]">
              {formatCurrency(executionPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[var(--muted)]">
            <span>Commission</span>
            <span className="font-mono tabular-nums font-semibold text-[var(--secondary)]">$0.00</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] font-bold text-[var(--foreground)]">
            <span>Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}</span>
            <span className="font-mono tabular-nums text-lg">
              {formatCurrency(estimatedTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--muted)] pt-1">
            <span>Available Buying Power</span>
            <span className="font-mono tabular-nums font-medium">
              {formatCurrency(availableBuyingPower)}
            </span>
          </div>
        </div>

        {/* Inline Feedback */}
        {feedback && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-fg)]'
                : 'bg-[var(--destructive-bg)] border-[var(--destructive-border)] text-[var(--destructive-fg)]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--success-fg)] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[var(--destructive-fg)] shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <p>{feedback.message}</p>
              {feedback.type === 'success' && (
                <button
                  type="button"
                  onClick={onViewOrders}
                  className="font-semibold underline text-[var(--success-fg)] hover:text-[var(--success-fg)] cursor-pointer"
                >
                  View in orders below
                </button>
              )}
            </div>
          </div>
        )}

        {/* Submit CTA */}
        <button
          type="submit"
          className={`w-full py-3.5 px-4 text-sm sm:text-base font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
            side === 'buy'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus-visible:outline-emerald-600'
              : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 focus-visible:outline-rose-600'
          }`}
        >
          {side === 'buy' ? `Place Buy Order · ${stock.symbol}` : `Place Sell Order · ${stock.symbol}`}
        </button>
      </form>
    </div>
  );
}