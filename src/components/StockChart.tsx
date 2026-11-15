import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { CandlePoint, ChartStyle, Timeframe } from '../types/broker';

interface StockChartProps {
  symbol: string;
  data: CandlePoint[];
  previousClose: number;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartStyle: ChartStyle;
  onChartStyleChange: (style: ChartStyle) => void;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];

export default function StockChart({
  symbol,
  data,
  previousClose,
  timeframe,
  onTimeframeChange,
  chartStyle,
  onChartStyleChange,
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lastFitKeyRef = useRef<string>('');
  const lastWidthRef = useRef<number>(0);
  const dataLengthRef = useRef<number>(data.length);

  // Touch & zoom interaction tracking to preserve user gestures across resizes and live ticks
  const isTouchInteractingRef = useRef<boolean>(false);
  const hasUserZoomedRef = useRef<boolean>(false);
  const settleTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  useEffect(() => {
    dataLengthRef.current = data.length;
  }, [data.length]);

  const isPositive = useMemo(() => {
    if (data.length === 0) return true;
    const refPrice = timeframe === '1D' ? previousClose : data[0].close;
    return data[data.length - 1].close >= refPrice;
  }, [data, previousClose, timeframe]);

  const handleResetZoom = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    hasUserZoomedRef.current = false;
    chart.priceScale('right').applyOptions({ autoScale: true });
    chart.timeScale().fitContent();
  }, []);

  const handleStepZoom = useCallback((factor: number) => {
    const chart = chartRef.current;
    const totalBars = dataLengthRef.current;
    if (!chart || totalBars <= 0) return;

    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;

    const currentSpan = range.to - range.from;
    const nextSpan = Math.max(8, Math.min(totalBars + 1, currentSpan * factor));

    if (nextSpan >= totalBars) {
      hasUserZoomedRef.current = false;
      chart.timeScale().fitContent();
      return;
    }

    hasUserZoomedRef.current = true;
    const center = (range.from + range.to) / 2;
    const clampedTo = Math.min(totalBars - 0.2, Math.max(nextSpan - 0.5, center + nextSpan / 2));
    const clampedFrom = Math.max(-0.5, clampedTo - nextSpan);

    chart.timeScale().setVisibleLogicalRange({
      from: clampedFrom,
      to: clampedTo,
    });
  }, []);

  // Initialize TradingView Lightweight Chart + Touch Gesture Handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const isCompact = el.clientWidth < 640;
    lastWidthRef.current = el.clientWidth;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#94A3B8',
        fontFamily: 'JetBrains Mono, DM Sans, system-ui, sans-serif',
        fontSize: isCompact ? 10 : 11,
      },
      grid: {
        vertLines: { color: '#1E222D' },
        horzLines: { color: '#1E222D' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#475569',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2962FF',
        },
        horzLine: {
          color: '#475569',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2962FF',
        },
      },
      rightPriceScale: {
        borderColor: '#1E222D',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1E222D',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 1,
        minBarSpacing: 2,
      },
      kineticScroll: {
        touch: true,
        mouse: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        axisDoubleClickReset: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Touch gesture handlers for mobile pinch-zoom guard, panning state, and double-tap reset
    let touchStart: {
      x: number;
      y: number;
      time: number;
      isMultiTouch: boolean;
      moved: boolean;
    } | null = null;

    const clearSettleTimer = () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      clearSettleTimer();
      isTouchInteractingRef.current = true;

      if (e.touches.length >= 2) {
        // Prevent mobile browser page pinch-zoom while TradingView handles chart zoom
        if (e.cancelable) e.preventDefault();
        hasUserZoomedRef.current = true;
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
          isMultiTouch: true,
          moved: true,
        };
        return;
      }

      if (e.touches.length === 1) {
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
          isMultiTouch: false,
          moved: false,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        hasUserZoomedRef.current = true;
        if (touchStart) {
          touchStart.isMultiTouch = true;
          touchStart.moved = true;
        }
        return;
      }

      if (e.touches.length === 1 && touchStart) {
        const dx = Math.abs(e.touches[0].clientX - touchStart.x);
        const dy = Math.abs(e.touches[0].clientY - touchStart.y);
        if (dx > 8 || dy > 8) {
          touchStart.moved = true;
        }
        // Track horizontal panning intent so ResizeObserver doesn't snap back mid-pan
        if (dx > dy + 6) {
          hasUserZoomedRef.current = true;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;

      const now = Date.now();
      if (
        touchStart &&
        !touchStart.isMultiTouch &&
        !touchStart.moved &&
        now - touchStart.time < 260
      ) {
        const prevTap = lastTapRef.current;
        if (
          prevTap &&
          now - prevTap.time < 320 &&
          Math.abs(touchStart.x - prevTap.x) < 30 &&
          Math.abs(touchStart.y - prevTap.y) < 30
        ) {
          // Double-tap resets zoom & auto-scales price axis cleanly
          hasUserZoomedRef.current = false;
          chart.priceScale('right').applyOptions({ autoScale: true });
          chart.timeScale().fitContent();
          lastTapRef.current = null;
        } else {
          lastTapRef.current = {
            time: now,
            x: touchStart.x,
            y: touchStart.y,
          };
        }
      }

      touchStart = null;
      clearSettleTimer();
      settleTimerRef.current = window.setTimeout(() => {
        isTouchInteractingRef.current = false;
      }, 350);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.floor(entry.contentRect.width);
      if (w > 0 && Math.abs(w - lastWidthRef.current) > 4) {
        lastWidthRef.current = w;
        chart.applyOptions({
          layout: { fontSize: w < 640 ? 10 : 11 },
        });
        // Preserve zoom/pan if user is interacting or has zoomed; otherwise keep fitted
        if (!isTouchInteractingRef.current && !hasUserZoomedRef.current) {
          requestAnimationFrame(() => {
            chart.timeScale().fitContent();
          });
        }
      }
    });
    observer.observe(el);

    return () => {
      clearSettleTimer();
      observer.disconnect();
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Create or switch series when chartStyle changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (priceSeriesRef.current) {
      chart.removeSeries(priceSeriesRef.current);
      priceSeriesRef.current = null;
    }

    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.84,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    if (chartStyle === 'candles') {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#089981',
        downColor: '#F23645',
        borderUpColor: '#089981',
        borderDownColor: '#F23645',
        wickUpColor: '#089981',
        wickDownColor: '#F23645',
        priceLineColor: '#2962FF',
        priceLineWidth: 1,
        priceLineStyle: LineStyle.Dotted,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      priceSeriesRef.current = candleSeries;
    } else {
      const lineHex = isPositive ? '#089981' : '#F23645';
      const topFill = isPositive ? 'rgba(8, 153, 129, 0.34)' : 'rgba(242, 54, 69, 0.34)';
      const bottomFill = 'rgba(19, 23, 34, 0.0)';
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: lineHex,
        topColor: topFill,
        bottomColor: bottomFill,
        lineWidth: 2,
        priceLineColor: lineHex,
        priceLineWidth: 1,
        priceLineStyle: LineStyle.Dotted,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      priceSeriesRef.current = areaSeries;
    }
  }, [chartStyle]);

  // Sync data, colors & time scale visibility
  useEffect(() => {
    const chart = chartRef.current;
    const priceSeries = priceSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !priceSeries || !volumeSeries) return;

    chart.timeScale().applyOptions({
      timeVisible: timeframe === '1D' || timeframe === '1W',
      secondsVisible: false,
    });

    if (chartStyle === 'area') {
      const lineHex = isPositive ? '#089981' : '#F23645';
      const topFill = isPositive ? 'rgba(8, 153, 129, 0.34)' : 'rgba(242, 54, 69, 0.34)';
      const bottomFill = 'rgba(19, 23, 34, 0.0)';
      (priceSeries as ISeriesApi<'Area'>).applyOptions({
        lineColor: lineHex,
        topColor: topFill,
        bottomColor: bottomFill,
        priceLineColor: lineHex,
      });

      priceSeries.setData(
        data.map((pt) => ({
          time: pt.time as UTCTimestamp,
          value: pt.close,
        }))
      );
    } else {
      (priceSeries as ISeriesApi<'Candlestick'>).setData(
        data.map((pt) => ({
          time: pt.time as UTCTimestamp,
          open: pt.open,
          high: pt.high,
          low: pt.low,
          close: pt.close,
        }))
      );
    }

    volumeSeries.setData(
      data.map((pt) => ({
        time: pt.time as UTCTimestamp,
        value: pt.volume,
        color: pt.close >= pt.open ? 'rgba(8, 153, 129, 0.3)' : 'rgba(242, 54, 69, 0.3)',
      }))
    );

    const fitKey = `${symbol}-${timeframe}-${chartStyle}`;
    if (lastFitKeyRef.current !== fitKey) {
      lastFitKeyRef.current = fitKey;
      hasUserZoomedRef.current = false;
      chart.timeScale().fitContent();
      requestAnimationFrame(() => {
        chart.timeScale().fitContent();
      });
    }
  }, [data, chartStyle, isPositive, timeframe, symbol]);

  return (
    <div className="w-full bg-[var(--chart-bg)] border border-[var(--chart-border)] rounded-xl overflow-hidden shadow-[var(--chart-shadow)]">
      {/* Mobile-Optimized Balanced Chart Controls Header */}
      <div className="px-2.5 sm:px-5 py-2 sm:py-2.5 border-b border-[var(--chart-header-border)] flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 bg-[var(--chart-header-bg)]">
        <div className="inline-flex items-center bg-[var(--chart-control-bg)] p-0.5 rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => onChartStyleChange('area')}
            className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartStyle === 'area'
                ? 'bg-[var(--chart-control-active)] text-[var(--chart-control-active-fg)]'
                : 'text-[var(--chart-control-inactive)] hover:text-[var(--chart-control-active)]'
            }`}
          >
            Line
          </button>
          <button
            type="button"
            onClick={() => onChartStyleChange('candles')}
            className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartStyle === 'candles'
                ? 'bg-[var(--chart-control-active)] text-[var(--chart-control-active-fg)]'
                : 'text-[var(--chart-control-inactive)] hover:text-[var(--chart-control-active)]'
            }`}
          >
            Candles
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="inline-flex items-center bg-[var(--chart-control-bg)] p-0.5 rounded-lg">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`px-1.5 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[var(--chart-control-active)] text-[var(--chart-control-active-fg)]'
                    : 'text-[var(--chart-control-inactive)] hover:text-[var(--chart-control-active)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center bg-[var(--chart-control-bg)] p-0.5 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => handleStepZoom(1.38)}
              title="Zoom out"
              aria-label="Zoom out chart"
              className="p-1 sm:p-1.5 text-[var(--chart-control-inactive)] rounded-md hover:text-[var(--chart-text)] hover:bg-[var(--chart-control-bg)] transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleStepZoom(0.72)}
              title="Zoom in"
              aria-label="Zoom in chart"
              className="p-1 sm:p-1.5 text-[var(--chart-control-inactive)] rounded-md hover:text-[var(--chart-text)] hover:bg-[var(--chart-control-bg)] transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset chart zoom"
              aria-label="Reset chart zoom"
              className="p-1 sm:p-1.5 text-[var(--chart-control-inactive)] rounded-md hover:text-[var(--chart-text)] hover:bg-[var(--chart-control-bg)] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Aspect-Ratio Preserving TradingView Canvas with Touch Gesture Support */}
      <div
        ref={containerRef}
        className="w-full aspect-[10/9] sm:aspect-[16/10] lg:aspect-[16/9] min-h-[300px] max-h-[580px] touch-pan-y select-none"
      />
    </div>
  );
}