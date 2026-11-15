export type PageId =
  | 'home'
  | 'trade'
  | 'portfolio'
  | 'markets'
  | 'funding'
  | 'login'
  | 'signup'
  | 'complete-profile'
  | 'admin';

export type KycStatus = 'unverified' | 'verified';

export interface KycProfile {
  status: KycStatus;
  fullName: string;
  dateOfBirth: string;
  country: string;
  idType: 'Passport' | "Driver's License" | 'National ID';
  idLast4: string;
  address: string;
  verifiedAt?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  createdAt: string;
  hasCompletedProfile: boolean;
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export type ChartStyle = 'area' | 'candles';

export type OrderSide = 'buy' | 'sell';

export type OrderType = 'market' | 'limit';

export type OrderStatus = 'filled' | 'open' | 'cancelled';

export type TimeInForce = 'DAY' | 'GTC';

export type Sector =
  | 'Technology'
  | 'Semiconductors'
  | 'Financials'
  | 'Consumer'
  | 'Healthcare'
  | 'Energy';

export interface CandlePoint {
  time: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: 'NASDAQ' | 'NYSE';
  sector: Sector;
  price: number;
  previousClose: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  volume: number;
  marketCapBillions: number;
  peRatio: number;
  dividendYield: number;
  description: string;
  sparkline: number[];
}

export interface MarketIndex {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  isYield?: boolean;
}

export interface Position {
  symbol: string;
  shares: number;
  avgCost: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  limitPrice?: number;
  fillPrice?: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  createdAt: string;
  filledAt?: string;
  total: number;
}

export type LedgerType = 'deposit' | 'withdrawal' | 'trade_buy' | 'trade_sell';

export type LedgerStatus = 'completed' | 'pending' | 'approved';

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  description: string;
  reference: string;
  timestamp: string;
  balanceAfter: number;
  status?: LedgerStatus;
}

export interface BankAccount {
  id: string;
  institution: string;
  accountLabel: string;
  last4: string;
}

export interface BrokerState {
  cashBalance: number;
  positions: Record<string, Position>;
  orders: Order[];
  watchlist: string[];
  ledger: LedgerEntry[];
  bankAccounts: BankAccount[];
}
