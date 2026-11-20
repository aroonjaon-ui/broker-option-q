import { BrokerState, CandlePoint, MarketIndex, Stock, Timeframe } from '../types/broker';

export const INITIAL_STOCKS: Stock[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    sector: 'Technology',
    price: 227.80,
    previousClose: 225.80,
    dayOpen: 226.15,
    dayHigh: 229.60,
    dayLow: 225.40,
    week52High: 237.23,
    week52Low: 164.08,
    volume: 42_610_400,
    marketCapBillions: 3470,
    peRatio: 34.8,
    dividendYield: 0.44,
    description:
      'Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide alongside high-margin services.',
    sparkline: [219.4, 221.1, 220.6, 223.2, 224.8, 225.8, 228.45],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    sector: 'Technology',
    price: 424.51,
    previousClose: 418.90,
    dayOpen: 419.50,
    dayHigh: 424.10,
    dayLow: 418.20,
    week52High: 468.35,
    week52Low: 366.50,
    volume: 19_840_200,
    marketCapBillions: 3140,
    peRatio: 35.6,
    dividendYield: 0.78,
    description:
      'Develops and supports software, cloud infrastructure (Azure), productivity suites, and enterprise AI computing platforms globally.',
    sparkline: [411.2, 413.8, 415.0, 414.2, 417.6, 418.9, 422.18],
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    sector: 'Semiconductors',
    price: 141.75,
    previousClose: 138.25,
    dayOpen: 139.10,
    dayHigh: 143.05,
    dayLow: 138.60,
    week52High: 149.77,
    week52Low: 47.32,
    volume: 214_550_000,
    marketCapBillions: 3480,
    peRatio: 54.2,
    dividendYield: 0.03,
    description:
      'Provides graphics, accelerated computing, and networking platforms powering data center AI training, inference, and autonomous systems.',
    sparkline: [129.8, 132.4, 134.1, 133.5, 136.9, 138.25, 141.72],
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    sector: 'Technology',
    price: 176.94,
    previousClose: 178.10,
    dayOpen: 177.85,
    dayHigh: 178.90,
    dayLow: 175.80,
    week52High: 191.75,
    week52Low: 130.67,
    volume: 23_190_800,
    marketCapBillions: 2180,
    peRatio: 23.4,
    dividendYield: 0.45,
    description:
      'Operates global digital search, video, cloud computing, and autonomous technology businesses across Search, YouTube, and Google Cloud.',
    sparkline: [181.2, 180.5, 179.9, 180.4, 178.8, 178.1, 176.94],
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    exchange: 'NASDAQ',
    sector: 'Consumer',
    price: 208.31,
    previousClose: 203.40,
    dayOpen: 204.00,
    dayHigh: 207.20,
    dayLow: 203.10,
    week52High: 215.90,
    week52Low: 144.05,
    volume: 38_420_100,
    marketCapBillions: 2160,
    peRatio: 44.1,
    dividendYield: 0.0,
    description:
      'Engages in global e-commerce retail, digital advertising, subscription media, and enterprise cloud services through Amazon Web Services.',
    sparkline: [197.6, 199.1, 200.8, 199.7, 202.4, 203.4, 206.35],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    exchange: 'NASDAQ',
    sector: 'Consumer',
    price: 319.52,
    previousClose: 324.15,
    dayOpen: 323.00,
    dayHigh: 325.40,
    dayLow: 315.90,
    week52High: 358.64,
    week52Low: 138.80,
    volume: 76_890_300,
    marketCapBillions: 1015,
    peRatio: 82.4,
    dividendYield: 0.0,
    description:
      'Designs, develops, manufactures, and sells electric vehicles, grid-scale energy storage systems, and solar generation products.',
    sparkline: [332.0, 329.5, 331.2, 327.4, 325.0, 324.15, 318.6],
  },
  {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    exchange: 'NASDAQ',
    sector: 'Technology',
    price: 578.26,
    previousClose: 579.60,
    dayOpen: 580.40,
    dayHigh: 587.10,
    dayLow: 578.90,
    week52High: 602.95,
    week52Low: 326.80,
    volume: 12_410_500,
    marketCapBillions: 1475,
    peRatio: 27.9,
    dividendYield: 0.34,
    description:
      'Builds social communication platforms and immersive reality technologies connecting billions of daily users across mobile and web ecosystems.',
    sparkline: [568.4, 571.0, 574.6, 573.2, 577.8, 579.6, 584.2],
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    exchange: 'NASDAQ',
    sector: 'Semiconductors',
    price: 146.88,
    previousClose: 148.30,
    dayOpen: 148.00,
    dayHigh: 149.40,
    dayLow: 145.60,
    week52High: 227.30,
    week52Low: 121.83,
    volume: 41_120_900,
    marketCapBillions: 238,
    peRatio: 46.8,
    dividendYield: 0.0,
    description:
      'Develops high-performance x86 processors, data center GPUs, adaptive SoCs, and embedded computing architectures.',
    sparkline: [152.1, 151.4, 149.8, 150.2, 148.9, 148.3, 146.88],
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    exchange: 'NYSE',
    sector: 'Financials',
    price: 238.90,
    previousClose: 236.50,
    dayOpen: 237.10,
    dayHigh: 239.85,
    dayLow: 236.20,
    week52High: 243.92,
    week52Low: 150.45,
    volume: 8_940_600,
    marketCapBillions: 674,
    peRatio: 13.1,
    dividendYield: 2.11,
    description:
      'Global financial services firm offering investment banking, commercial banking, treasury services, and asset & wealth management.',
    sparkline: [231.0, 232.8, 234.1, 233.7, 235.4, 236.5, 238.9],
  },
  {
    symbol: 'V',
    name: 'Visa Inc.',
    exchange: 'NYSE',
    sector: 'Financials',
    price: 308.42,
    previousClose: 306.80,
    dayOpen: 307.15,
    dayHigh: 309.60,
    dayLow: 306.25,
    week52High: 314.12,
    week52Low: 245.90,
    volume: 5_830_200,
    marketCapBillions: 612,
    peRatio: 30.8,
    dividendYield: 0.76,
    description:
      'Operates the world’s largest retail electronic payments network facilitating authorization, clearing, and settlement across 200+ countries.',
    sparkline: [299.4, 301.2, 302.9, 304.1, 305.5, 306.8, 308.42],
  },
  {
    symbol: 'AVGO',
    name: 'Broadcom Inc.',
    exchange: 'NASDAQ',
    sector: 'Semiconductors',
    price: 179.55,
    previousClose: 176.90,
    dayOpen: 177.20,
    dayHigh: 180.40,
    dayLow: 176.50,
    week52High: 186.42,
    week52Low: 90.31,
    volume: 24_670_000,
    marketCapBillions: 838,
    peRatio: 39.2,
    dividendYield: 1.18,
    description:
      'Designs, develops, and supplies semiconductor and enterprise infrastructure software solutions for networking, storage, and custom AI silicon.',
    sparkline: [171.2, 172.8, 174.0, 173.4, 175.8, 176.9, 179.55],
  },
  {
    symbol: 'NFLX',
    name: 'Netflix, Inc.',
    exchange: 'NASDAQ',
    sector: 'Consumer',
    price: 814.30,
    previousClose: 806.10,
    dayOpen: 808.00,
    dayHigh: 818.40,
    dayLow: 805.20,
    week52High: 829.00,
    week52Low: 445.73,
    volume: 3_410_900,
    marketCapBillions: 349,
    peRatio: 41.7,
    dividendYield: 0.0,
    description:
      'Subscription streaming entertainment service producing and distributing original series, films, and interactive media worldwide.',
    sparkline: [788.0, 793.5, 797.2, 801.0, 804.6, 806.1, 814.3],
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    exchange: 'NYSE',
    sector: 'Healthcare',
    price: 154.12,
    previousClose: 154.90,
    dayOpen: 154.75,
    dayHigh: 155.30,
    dayLow: 153.60,
    week52High: 168.85,
    week52Low: 143.13,
    volume: 6_720_400,
    marketCapBillions: 371,
    peRatio: 15.8,
    dividendYield: 3.22,
    description:
      'Researches, develops, manufactures, and sells innovative pharmaceutical therapies and medical technology devices globally.',
    sparkline: [156.2, 155.9, 155.4, 155.7, 155.1, 154.9, 154.12],
  },
  {
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    exchange: 'NYSE',
    sector: 'Energy',
    price: 118.45,
    previousClose: 117.20,
    dayOpen: 117.50,
    dayHigh: 119.10,
    dayLow: 117.05,
    week52High: 126.34,
    week52Low: 95.77,
    volume: 14_580_100,
    marketCapBillions: 522,
    peRatio: 14.3,
    dividendYield: 3.31,
    description:
      'Explores for, produces, refines, and markets crude oil, natural gas, petrochemicals, and lower-emission energy solutions.',
    sparkline: [115.1, 115.8, 116.4, 116.0, 116.9, 117.2, 118.45],
  },
];

export const INITIAL_INDICES: MarketIndex[] = [
  { id: 'sp500', name: 'S&P 500', symbol: 'SPX', value: 5986.9, change: 43.42, changePercent: 0.73 },
  { id: 'nasdaq', name: 'NASDAQ 100', symbol: 'NDX', value: 21009.75, change: 156.32, changePercent: 0.75 },
  { id: 'dow', name: 'Dow Jones', symbol: 'DJI', value: 43900.05, change: 109.45, changePercent: 0.25 },
  { id: 'us10y', name: 'US 10Y Yield', symbol: 'TNX', value: 4.38, change: -0.04, changePercent: -0.90, isYield: true },
];

export function createInitialBrokerState(): BrokerState {
  const now = Date.now();
  return {
    cashBalance: 24680.50,
    positions: {
      AAPL: { symbol: 'AAPL', shares: 110, avgCost: 214.50 },
      NVDA: { symbol: 'NVDA', shares: 185, avgCost: 124.20 },
      MSFT: { symbol: 'MSFT', shares: 42, avgCost: 398.00 },
      JPM: { symbol: 'JPM', shares: 65, avgCost: 221.40 },
    },
    orders: [
      {
        id: 'XN-84920',
        symbol: 'NVDA',
        side: 'buy',
        type: 'limit',
        qty: 25,
        limitPrice: 136.00,
        status: 'open',
        timeInForce: 'GTC',
        createdAt: new Date(now - 1000 * 60 * 95).toISOString(),
        total: 3400.00,
      },
      {
        id: 'XN-84914',
        symbol: 'AAPL',
        side: 'buy',
        type: 'market',
        qty: 30,
        fillPrice: 224.80,
        status: 'filled',
        timeInForce: 'DAY',
        createdAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
        filledAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
        total: 6744.00,
      },
      {
        id: 'XN-84892',
        symbol: 'JPM',
        side: 'buy',
        type: 'limit',
        qty: 65,
        limitPrice: 221.40,
        fillPrice: 221.40,
        status: 'filled',
        timeInForce: 'DAY',
        createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
        filledAt: new Date(now - 1000 * 60 * 60 * 46).toISOString(),
        total: 14391.00,
      },
      {
        id: 'XN-84861',
        symbol: 'MSFT',
        side: 'buy',
        type: 'market',
        qty: 42,
        fillPrice: 398.00,
        status: 'filled',
        timeInForce: 'DAY',
        createdAt: new Date(now - 1000 * 60 * 60 * 96).toISOString(),
        filledAt: new Date(now - 1000 * 60 * 60 * 96).toISOString(),
        total: 16716.00,
      },
    ],
    watchlist: ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'JPM'],
    ledger: [
      {
        id: 'LDG-1042',
        type: 'trade_buy',
        amount: -6744.00,
        description: 'Bought 30 AAPL @ $224.80',
        reference: 'XN-84914',
        timestamp: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
        balanceAfter: 24680.50,
      },
      {
        id: 'LDG-1038',
        type: 'trade_buy',
        amount: -14391.00,
        description: 'Bought 65 JPM @ $221.40',
        reference: 'XN-84892',
        timestamp: new Date(now - 1000 * 60 * 60 * 46).toISOString(),
        balanceAfter: 31424.50,
      },
      {
        id: 'LDG-1031',
        type: 'deposit',
        amount: 25000.00,
        description: 'ACH Wire Deposit',
        reference: 'Chase Checking ••••4821',
        timestamp: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
        balanceAfter: 45815.50,
      },
      {
        id: 'LDG-1024',
        type: 'deposit',
        amount: 75000.00,
        description: 'Initial Account Funding',
        reference: 'Chase Checking ••••4821',
        timestamp: new Date(now - 1000 * 60 * 60 * 140).toISOString(),
        balanceAfter: 75000.00,
      },
    ],
    bankAccounts: [
      {
        id: 'bank-1',
        institution: 'Chase Bank',
        accountLabel: 'Premier Checking',
        last4: '4821',
      },
      {
        id: 'bank-2',
        institution: 'Mercury',
        accountLabel: 'Treasury Cash',
        last4: '9014',
      },
    ],
  };
}

/**
 * A brand-new account: no cash, no positions, no orders, no history.
 * Real balance only ever comes from a deposit (approved by an admin) or the
 * one-time welcome bonus granted by the backend.
 */
export function createEmptyBrokerState(): BrokerState {
  return {
    cashBalance: 0,
    positions: {},
    orders: [],
    watchlist: ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'JPM'],
    ledger: [],
    bankAccounts: [],
  };
}

/**
 * A demo account: $10,000 of virtual money so visitors can practise trading.
 * Nothing here is ever mirrored to the cloud, and withdrawals are locked.
 */
export function createDemoBrokerState(): BrokerState {
  const now = new Date().toISOString();
  return {
    cashBalance: 10000,
    positions: {},
    orders: [],
    watchlist: ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'JPM'],
    ledger: [
      {
        id: `LDG-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'deposit',
        amount: 10000,
        description: 'Demo Account — Virtual Funds',
        reference: 'XN-DEMO10K',
        timestamp: now,
        balanceAfter: 10000,
        status: 'completed',
      },
    ],
    bankAccounts: [],
  };
}

export function createFreshCashBrokerState(): BrokerState {
  const now = Date.now();
  return {
    cashBalance: 100000.00,
    positions: {},
    orders: [],
    watchlist: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'],
    ledger: [
      {
        id: `LDG-${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'deposit',
        amount: 100000.00,
        description: 'Starting Brokerage Cash Deposit',
        reference: 'Chase Checking ••••4821',
        timestamp: new Date(now).toISOString(),
        balanceAfter: 100000.00,
      },
    ],
    bankAccounts: [
      {
        id: 'bank-1',
        institution: 'Chase Bank',
        accountLabel: 'Premier Checking',
        last4: '4821',
      },
      {
        id: 'bank-2',
        institution: 'Mercury',
        accountLabel: 'Treasury Cash',
        last4: '9014',
      },
    ],
  };
}

// Deterministic pseudo-random helper seeded by symbol + timeframe so charts remain smooth
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function generateStockSeries(stock: Stock, timeframe: Timeframe): CandlePoint[] {
  const counts: Record<Timeframe, number> = {
    '1D': 54,
    '1W': 48,
    '1M': 36,
    '3M': 60,
    '1Y': 72,
  };

  const volatilityMap: Record<Timeframe, number> = {
    '1D': 0.0028,
    '1W': 0.0065,
    '1M': 0.012,
    '3M': 0.017,
    '1Y': 0.024,
  };

  const totalPoints = counts[timeframe];
  const vol = volatilityMap[timeframe];
  let seed = hashSeed(`${stock.symbol}-${timeframe}`);

  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Anchor historical series deterministically to immutable session metrics so old bars never jump on live ticks
  const sessionBias = stock.dayOpen >= stock.previousClose ? 1 : -1;
  const anchorEnd =
    timeframe === '1D'
      ? stock.dayOpen * (1 + sessionBias * 0.009)
      : stock.previousClose;

  const driftFactor =
    timeframe === '1D'
      ? stock.dayOpen / anchorEnd
      : timeframe === '1W'
        ? 0.978
        : timeframe === '1M'
          ? 0.935
          : timeframe === '3M'
            ? 0.875
            : 0.76;

  const startPrice = anchorEnd * driftFactor;
  const rawCloses: number[] = [startPrice];

  // Natural wave + momentum random walk so charts display authentic pullbacks and rallies
  const wavePhase = nextRand() * Math.PI * 2;
  for (let i = 1; i < totalPoints - 1; i++) {
    const prev = rawCloses[i - 1];
    const progress = i / (totalPoints - 1);
    const wave = Math.sin(progress * Math.PI * 4.5 + wavePhase) * vol * 0.45;
    const shock = (nextRand() - 0.48) * 2.1 * vol;
    rawCloses.push(Math.max(1, prev * (1 + wave + shock)));
  }

  const lastHist = rawCloses[rawCloses.length - 1];
  const diff = anchorEnd - lastHist;

  const points: CandlePoint[] = [];
  // Fixed daily UTC anchor so bar timestamps remain constant across live ticks
  const dayStartSec = Math.floor(Date.now() / 86400000) * 86400;

  for (let i = 0; i < totalPoints; i++) {
    const isLast = i === totalPoints - 1;
    const progress = i / Math.max(1, totalPoints - 2);

    const prevBarClose = i === 0 ? startPrice : points[i - 1].close;
    const close = isLast
      ? stock.price
      : Number((rawCloses[i] + diff * progress).toFixed(2));

    const openGap = isLast ? 0 : (nextRand() - 0.5) * close * vol * 0.22;
    const open = Number(Math.max(1, prevBarClose + openGap).toFixed(2));

    const bodySize = Math.abs(close - open);
    const wickScale = Math.max(close * vol * 0.45, bodySize * 0.35);
    const upperWick = wickScale * (0.25 + nextRand() * 0.75);
    const lowerWick = wickScale * (0.25 + nextRand() * 0.75);

    const high = Number((Math.max(open, close) + upperWick).toFixed(2));
    const low = Number(Math.max(0.01, Math.min(open, close) - lowerWick).toFixed(2));
    const candleVol = Math.round(
      (stock.volume / totalPoints) * (0.55 + nextRand() * 1.15)
    );

    let barTimeSec: number;
    let label = '';

    if (timeframe === '1D') {
      // 9:30 to 16:00 session (evenly spaced across 390 minutes)
      const stepSec = Math.round((390 * 60) / (totalPoints - 1));
      barTimeSec = dayStartSec + 9 * 3600 + 30 * 60 + i * stepSec;
      const d = new Date(barTimeSec * 1000);
      const hr = d.getUTCHours();
      const min = d.getUTCMinutes();
      const suffix = hr >= 12 ? 'PM' : 'AM';
      const displayHr = hr > 12 ? hr - 12 : hr;
      label = `${displayHr}:${min.toString().padStart(2, '0')} ${suffix}`;
    } else if (timeframe === '1W') {
      const endSec = dayStartSec + 16 * 3600;
      barTimeSec = endSec - (totalPoints - 1 - i) * 9000;
      const d = new Date(barTimeSec * 1000);
      label = d.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        timeZone: 'UTC',
      });
    } else if (timeframe === '1Y') {
      const endSec = dayStartSec;
      barTimeSec = endSec - (totalPoints - 1 - i) * 5 * 86400;
      const d = new Date(barTimeSec * 1000);
      label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
        timeZone: 'UTC',
      });
    } else {
      const stepDays = timeframe === '3M' ? 2 : 1;
      const endSec = dayStartSec;
      barTimeSec = endSec - (totalPoints - 1 - i) * stepDays * 86400;
      const d = new Date(barTimeSec * 1000);
      label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }

    points.push({
      time: barTimeSec,
      label,
      open,
      high,
      low,
      close,
      volume: candleVol,
    });
  }

  return points;
}
