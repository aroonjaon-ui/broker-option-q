import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopNav from './components/TopNav';
import WithdrawalToastFeed from './components/WithdrawalToastFeed';
import PlatformModals, { AppModalKind } from './components/PlatformModals';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import CompleteProfile from './pages/CompleteProfile';
import TradePage from './pages/TradePage';
import PortfolioPage from './pages/PortfolioPage';
import MarketsPage from './pages/MarketsPage';
import FundingPage from './pages/FundingPage';
import AdminPage from './pages/AdminPage';
import {
  INITIAL_INDICES,
  INITIAL_STOCKS,
  createFreshCashBrokerState,
  createInitialBrokerState,
} from './data/stocks';
import {
  BrokerState,
  KycProfile,
  MarketIndex,
  Order,
  OrderSide,
  OrderType,
  PageId,
  Stock,
  TimeInForce,
  UserAccount,
} from './types/broker';
import { formatCurrency } from './utils/formatters';
import {
  ensureCloudUser,
  getSessionUser,
  pullSnapshot,
  pushBalance,
  pushPositions,
  pushProfile,
  signInCloud,
  signOutCloud,
  signUpCloud,
  submitDepositRequest,
  submitWithdrawalRequest,
} from './cloud';

const STORAGE_KEY = 'xena_broker_state_v1';
const USER_STORAGE_KEY = 'xena_broker_user_v1';
const ACCOUNTS_STORAGE_KEY = 'xena_broker_accounts_v1';
const KYC_STORAGE_KEY = 'xena_broker_kyc_v1';
const DAILY_SPIN_SHOWN_KEY = 'xena_broker_daily_spin_last_shown_v1';
const PLATFORM_INFO_SEEN_KEY = 'xena_broker_platform_seen_v1';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function isDailySpinDue(): boolean {
  try {
    const raw = localStorage.getItem(DAILY_SPIN_SHOWN_KEY);
    if (!raw) return true;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts >= TWENTY_FOUR_HOURS_MS;
  } catch {
    return false;
  }
}

function markDailySpinShown(): void {
  try {
    localStorage.setItem(DAILY_SPIN_SHOWN_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

function hasSeenPlatformInfo(): boolean {
  try {
    return localStorage.getItem(PLATFORM_INFO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markPlatformInfoSeen(): void {
  try {
    localStorage.setItem(PLATFORM_INFO_SEEN_KEY, '1');
  } catch {
    // Ignore storage errors
  }
}

interface StoredCredential {
  user: UserAccount;
  password: string;
}

function loadSavedState(): BrokerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialBrokerState();
    const parsed = JSON.parse(raw) as BrokerState;
    if (
      typeof parsed.cashBalance === 'number' &&
      parsed.positions &&
      Array.isArray(parsed.orders) &&
      Array.isArray(parsed.watchlist) &&
      Array.isArray(parsed.ledger) &&
      Array.isArray(parsed.bankAccounts)
    ) {
      return parsed;
    }
  } catch {
    // Fallback to initial state
  }
  return createInitialBrokerState();
}

function loadSavedUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserAccount;
    if (parsed && parsed.email && parsed.name) return parsed;
  } catch {
    // Ignore parse error
  }
  return null;
}

function loadSavedCredentials(): StoredCredential[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredCredential[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return [
    {
      user: {
        id: 'usr-demo',
        name: 'Alex Mercer',
        email: 'alex.mercer@xenabroker.com',
        accountNumber: 'XN-482910',
        createdAt: new Date().toISOString(),
        hasCompletedProfile: true,
      },
      password: 'password123',
    },
  ];
}

function fillOrderIntoState(
  prev: BrokerState,
  order: Order,
  fillPrice: number
): BrokerState {
  const nowIso = new Date().toISOString();
  const total = Number((order.qty * fillPrice).toFixed(2));

  if (order.side === 'buy') {
    if (prev.cashBalance < total - 0.001) {
      return prev;
    }

    const existing = prev.positions[order.symbol];
    const nextShares = (existing?.shares ?? 0) + order.qty;
    const prevCostTotal = (existing?.shares ?? 0) * (existing?.avgCost ?? 0);
    const nextAvgCost = Number(((prevCostTotal + total) / nextShares).toFixed(4));
    const nextCash = Number((prev.cashBalance - total).toFixed(2));

    const updatedOrder: Order = {
      ...order,
      fillPrice,
      total,
      status: 'filled',
      filledAt: nowIso,
    };

    const existingIdx = prev.orders.findIndex((o) => o.id === order.id);
    const nextOrders =
      existingIdx >= 0
        ? prev.orders.map((o) => (o.id === order.id ? updatedOrder : o))
        : [updatedOrder, ...prev.orders];

    return {
      ...prev,
      cashBalance: nextCash,
      positions: {
        ...prev.positions,
        [order.symbol]: {
          symbol: order.symbol,
          shares: nextShares,
          avgCost: nextAvgCost,
        },
      },
      orders: nextOrders,
      ledger: [
        {
          id: `LDG-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'trade_buy',
          amount: -total,
          description: `Bought ${order.qty} ${order.symbol} @ ${formatCurrency(fillPrice)}`,
          reference: order.id,
          timestamp: nowIso,
          balanceAfter: nextCash,
        },
        ...prev.ledger,
      ],
    };
  } else {
    const existing = prev.positions[order.symbol];
    if (!existing || existing.shares < order.qty) {
      return prev;
    }

    const remainingShares = existing.shares - order.qty;
    const nextPositions = { ...prev.positions };
    if (remainingShares <= 0) {
      delete nextPositions[order.symbol];
    } else {
      nextPositions[order.symbol] = {
        ...existing,
        shares: remainingShares,
      };
    }

    const nextCash = Number((prev.cashBalance + total).toFixed(2));
    const updatedOrder: Order = {
      ...order,
      fillPrice,
      total,
      status: 'filled',
      filledAt: nowIso,
    };

    const existingIdx = prev.orders.findIndex((o) => o.id === order.id);
    const nextOrders =
      existingIdx >= 0
        ? prev.orders.map((o) => (o.id === order.id ? updatedOrder : o))
        : [updatedOrder, ...prev.orders];

    return {
      ...prev,
      cashBalance: nextCash,
      positions: nextPositions,
      orders: nextOrders,
      ledger: [
        {
          id: `LDG-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'trade_sell',
          amount: total,
          description: `Sold ${order.qty} ${order.symbol} @ ${formatCurrency(fillPrice)}`,
          reference: order.id,
          timestamp: nowIso,
          balanceAfter: nextCash,
        },
        ...prev.ledger,
      ],
    };
  }
}

function loadSavedKyc(): KycProfile | null {
  try {
    const raw = localStorage.getItem(KYC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KycProfile;
    if (parsed && parsed.status) return parsed;
  } catch {
    // Ignore parse error
  }
  return null;
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
  const [tradeSide, setTradeSide] = useState<OrderSide>('buy');
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [indices, setIndices] = useState<MarketIndex[]>(INITIAL_INDICES);
  const [isLiveQuotes, setIsLiveQuotes] = useState<boolean>(true);
  const [broker, setBroker] = useState<BrokerState>(loadSavedState);
  const [user, setUser] = useState<UserAccount | null>(loadSavedUser);
  const [credentials, setCredentials] = useState<StoredCredential[]>(loadSavedCredentials);
  const [kyc, setKyc] = useState<KycProfile | null>(loadSavedKyc);
  const [modalQueue, setModalQueue] = useState<AppModalKind[]>([]);
  const cloudUserIdRef = useRef<string | null>(null);
  const lastLocalMoneyChangeRef = useRef<number>(0);

  // Deep-link straight into the admin console with #admin
  useEffect(() => {
    if (window.location.hash.toLowerCase() === '#admin') {
      setActivePage('admin');
    }
  }, []);

  // Restore an existing Supabase session on first load and hydrate from the cloud
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supaUser = await getSessionUser();
      if (!supaUser || cancelled) return;

      cloudUserIdRef.current = supaUser.id;
      await ensureCloudUser({ userId: supaUser.id, email: supaUser.email ?? '' });
      const snap = await pullSnapshot(supaUser.id);
      if (!snap || cancelled) return;

      const fullName = [snap.profile?.first_name, snap.profile?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      setUser(
        (prev): UserAccount => ({
          id: supaUser.id,
          name: fullName || prev?.name || (supaUser.email ?? '').split('@')[0] || 'Trader',
          email: supaUser.email ?? prev?.email ?? '',
          accountNumber: prev?.accountNumber ?? `XN-${supaUser.id.slice(0, 6).toUpperCase()}`,
          createdAt: prev?.createdAt ?? new Date().toISOString(),
          hasCompletedProfile:
            snap.profile?.has_completed_profile ?? prev?.hasCompletedProfile ?? false,
        })
      );

      setBroker((prev) => ({
        ...prev,
        cashBalance: snap.cashBalance,
        positions: snap.positions,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const enqueueModals = useCallback((kinds: AppModalKind[]) => {
    setModalQueue((prev) => {
      const next = [...prev];
      for (const k of kinds) {
        if (!next.includes(k)) next.push(k);
      }
      return next;
    });
  }, []);

  const closeActiveModal = useCallback(() => {
    setModalQueue((prev) => prev.slice(1));
  }, []);

  // Platform Overview is shown once on the first visit.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasSeenPlatformInfo()) {
        markPlatformInfoSeen();
        enqueueModals(['platform_info']);
      }
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [enqueueModals]);

  // The Daily Reward Draw is a member reward: it never appears for visitors who
  // are not signed in, and it waits until the profile step is finished.
  const spinShownRef = useRef(false);
  useEffect(() => {
    if (!user || activePage === 'complete-profile' || activePage === 'admin') return;
    if (spinShownRef.current || !isDailySpinDue()) return;
    spinShownRef.current = true;
    markDailySpinShown();
    enqueueModals(['daily_spin']);
  }, [user, activePage, enqueueModals]);

  useEffect(() => {
    try {
      if (kyc) {
        localStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(kyc));
      } else {
        localStorage.removeItem(KYC_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [kyc]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(broker));
    } catch {
      // Ignore storage quota errors
    }
  }, [broker]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(credentials));
    } catch {
      // Ignore storage errors
    }
  }, [credentials]);

  // Simulated market tick engine + automatic limit order execution
  useEffect(() => {
    if (!isLiveQuotes) return;

    const timer = window.setInterval(() => {
      setStocks((prevStocks) => {
        const updatedStocks = prevStocks.map((stock) => {
          const pctMove = (Math.random() - 0.495) * 0.0045;
          const rawNext = stock.price * (1 + pctMove);
          const nextPrice = Math.max(1, Number(rawNext.toFixed(2)));
          const nextSparkline = [...stock.sparkline.slice(0, -1), nextPrice];
          return {
            ...stock,
            price: nextPrice,
            dayHigh: Math.max(stock.dayHigh, nextPrice),
            dayLow: Math.min(stock.dayLow, nextPrice),
            volume: stock.volume + Math.floor(Math.random() * 14000),
            sparkline: nextSparkline,
          };
        });

        setBroker((prevBroker) => {
          const openOrders = prevBroker.orders.filter((o) => o.status === 'open');
          if (openOrders.length === 0) return prevBroker;

          let nextState = prevBroker;
          for (const ord of openOrders) {
            const matchStock = updatedStocks.find((s) => s.symbol === ord.symbol);
            if (!matchStock || ord.limitPrice === undefined) continue;

            const shouldFill =
              (ord.side === 'buy' && matchStock.price <= ord.limitPrice) ||
              (ord.side === 'sell' && matchStock.price >= ord.limitPrice);

            if (shouldFill) {
              const fillPrice =
                ord.side === 'buy'
                  ? Math.min(ord.limitPrice, matchStock.price)
                  : Math.max(ord.limitPrice, matchStock.price);
              nextState = fillOrderIntoState(nextState, ord, Number(fillPrice.toFixed(2)));
            }
          }
          return nextState;
        });

        return updatedStocks;
      });

      setIndices((prevIndices) =>
        prevIndices.map((idx) => {
          const move = (Math.random() - 0.495) * (idx.isYield ? 0.01 : idx.value * 0.0006);
          const nextVal = Number((idx.value + move).toFixed(2));
          const basePrev = idx.value - idx.change;
          const nextChange = Number((nextVal - basePrev).toFixed(2));
          const nextPct = basePrev !== 0 ? Number(((nextChange / basePrev) * 100).toFixed(2)) : 0;
          return {
            ...idx,
            value: nextVal,
            change: nextChange,
            changePercent: nextPct,
          };
        })
      );
    }, 2500);

    return () => window.clearInterval(timer);
  }, [isLiveQuotes]);

  const reservedCash = useMemo(() => {
    return broker.orders
      .filter((o) => o.status === 'open' && o.side === 'buy')
      .reduce((sum, o) => sum + o.total, 0);
  }, [broker.orders]);

  const totalPortfolioValue = useMemo(() => {
    const stockMap = new Map(stocks.map((s) => [s.symbol, s.price]));
    const equitiesVal = Object.values(broker.positions).reduce((sum, pos) => {
      const price = stockMap.get(pos.symbol) ?? pos.avgCost;
      return sum + pos.shares * price;
    }, 0);
    return broker.cashBalance + equitiesVal;
  }, [stocks, broker.positions, broker.cashBalance]);

  // Mirror cash + positions to Supabase so the cloud stays the source of truth
  useEffect(() => {
    const uid = cloudUserIdRef.current;
    if (!uid) return;

    const timer = window.setTimeout(() => {
      void pushBalance(uid, broker.cashBalance, reservedCash);
      void pushPositions(uid, broker.positions);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [broker.cashBalance, broker.positions, reservedCash]);

  // Pick up admin balance adjustments without clobbering a fresh local change
  useEffect(() => {
    const timer = window.setInterval(async () => {
      const uid = cloudUserIdRef.current;
      if (!uid) return;
      if (Date.now() - lastLocalMoneyChangeRef.current < 12000) return;

      const snap = await pullSnapshot(uid);
      if (!snap) return;

      setBroker((prev) =>
        Math.abs(prev.cashBalance - snap.cashBalance) > 0.009
          ? { ...prev, cashBalance: snap.cashBalance }
          : prev
      );
    }, 20000);

    return () => window.clearInterval(timer);
  }, []);

  const navigateTo = useCallback((page: PageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSignup = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
      const exists = credentials.some((c) => c.user.email.toLowerCase() === email);
      if (exists) {
        return { ok: false, message: 'An account with this email already exists. Please log in.' };
      }

      const displayName = email
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Create the account in Supabase Auth (so data lives in the cloud)
      const cloud = await signUpCloud(email, password);
      const cloudUserId = (cloud as { userId?: string | null }).userId ?? null;

      if (!cloud.ok && /already registered|already exists/i.test(cloud.message ?? '')) {
        return { ok: false, message: 'That email is already registered. Please log in.' };
      }

      if (cloudUserId) {
        cloudUserIdRef.current = cloudUserId;
        await ensureCloudUser({ userId: cloudUserId, email, name: displayName });
      }

      const newUser: UserAccount = {
        id: cloudUserId ?? `usr-${Date.now()}`,
        name: displayName,
        email,
        accountNumber: `XN-${Math.floor(100000 + Math.random() * 899999)}`,
        createdAt: new Date().toISOString(),
        hasCompletedProfile: false,
      };
      setCredentials((prev) => [...prev, { user: newUser, password }]);
      setUser(newUser);
      // Redirect to CompleteProfile to collect missing profile information
      navigateTo('complete-profile');

      markPlatformInfoSeen();
      const postSignupModals: AppModalKind[] = ['signup_bonus'];
      enqueueModals(postSignupModals);

      return { ok: true };
    },
    [credentials, navigateTo, enqueueModals]
  );

  const handleCreditBonus = useCallback(
    (amount: number, description: string, reference: string) => {
      // The welcome bonus is granted once by Supabase (claim_signup_bonus).
      // Skip the local credit so cloud users don't get it twice.
      if (reference === 'XN-BONUS500' && cloudUserIdRef.current) {
        return;
      }

      lastLocalMoneyChangeRef.current = Date.now();
      const nowIso = new Date().toISOString();
      setBroker((prev) => {
        const nextCash = Number((prev.cashBalance + amount).toFixed(2));
        return {
          ...prev,
          cashBalance: nextCash,
          ledger: [
            {
              id: `LDG-${Math.floor(1000 + Math.random() * 9000)}`,
              type: 'deposit',
              amount,
              description,
              reference,
              timestamp: nowIso,
              balanceAfter: nextCash,
            },
            ...prev.ledger,
          ],
        };
      });
    },
    []
  );

  const handleLogin = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
      const local = credentials.find(
        (c) => c.user.email.toLowerCase() === email && c.password === password
      );

      // Sign in to Supabase first so cloud sync + persistence are active
      const cloud = await signInCloud(email, password);

      if (cloud.ok && cloud.userId) {
        cloudUserIdRef.current = cloud.userId;
        await ensureCloudUser({
          userId: cloud.userId,
          email,
          name: local?.user.name,
        });
        const snap = await pullSnapshot(cloud.userId);

        const merged: UserAccount = {
          id: cloud.userId,
          name:
            local?.user.name ||
            [snap?.profile?.first_name, snap?.profile?.last_name].filter(Boolean).join(' ').trim() ||
            email.split('@')[0],
          email,
          accountNumber:
            local?.user.accountNumber ?? `XN-${cloud.userId.slice(0, 6).toUpperCase()}`,
          createdAt: local?.user.createdAt ?? new Date().toISOString(),
          hasCompletedProfile:
            snap?.profile?.has_completed_profile ?? local?.user.hasCompletedProfile ?? false,
        };

        setUser(merged);
        setCredentials((prev) => {
          const idx = prev.findIndex((c) => c.user.email.toLowerCase() === email);
          if (idx >= 0) {
            return prev.map((c, i) => (i === idx ? { ...c, user: merged, password } : c));
          }
          return [...prev, { user: merged, password }];
        });

        if (snap) {
          setBroker((prev) => ({
            ...prev,
            cashBalance: snap.cashBalance,
            positions: snap.positions,
          }));
        }

        navigateTo(merged.hasCompletedProfile ? 'funding' : 'complete-profile');
        return { ok: true };
      }

      // Fall back to the local account list (demo account, offline use)
      if (local) {
        setUser(local.user);
        navigateTo(local.user.hasCompletedProfile ? 'funding' : 'complete-profile');
        return { ok: true };
      }

      return {
        ok: false,
        message: cloud.message ?? 'Invalid email or password. Try the demo account below or sign up.',
      };
    },
    [credentials, navigateTo]
  );

  const handleDemoLogin = useCallback(() => {
    const demo = credentials[0]?.user ?? {
      id: 'usr-demo',
      name: 'Alex Mercer',
      email: 'alex.mercer@xenabroker.com',
      accountNumber: 'XN-482910',
      createdAt: new Date().toISOString(),
      hasCompletedProfile: true,
    };
    setUser(demo);
    navigateTo('funding');
  }, [credentials, navigateTo]);

  const handleLogout = useCallback(() => {
    void signOutCloud();
    cloudUserIdRef.current = null;
    setUser(null);
    navigateTo('home');
  }, [navigateTo]);

  const handleUpdateProfile = useCallback(
    (name: string, email: string) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, name, email, hasCompletedProfile: true };
        setCredentials((creds) =>
          creds.map((c) => (c.user.id === prev.id ? { ...c, user: updated } : c))
        );
        return updated;
      });

      const uid = cloudUserIdRef.current;
      if (uid) {
        const [firstName, ...rest] = name.trim().split(/\s+/);
        void pushProfile(uid, {
          email,
          firstName: firstName ?? '',
          lastName: rest.join(' '),
          hasCompletedProfile: true,
        });
      }
    },
    []
  );

  const handlePlaceOrder = useCallback(
    (params: {
      symbol: string;
      side: OrderSide;
      type: OrderType;
      qty: number;
      limitPrice?: number;
      timeInForce: TimeInForce;
    }): { ok: boolean; message: string } => {
      const stock = stocks.find((s) => s.symbol === params.symbol);
      if (!stock) {
        return { ok: false, message: 'Selected symbol not found.' };
      }

      const availableCash = Math.max(0, broker.cashBalance - reservedCash);
      const ownedShares = broker.positions[params.symbol]?.shares ?? 0;

      const openSellShares = broker.orders
        .filter((o) => o.status === 'open' && o.side === 'sell' && o.symbol === params.symbol)
        .reduce((acc, o) => acc + o.qty, 0);

      if (params.side === 'sell' && params.qty > ownedShares - openSellShares) {
        return {
          ok: false,
          message: `Insufficient uncommitted shares. Available to sell: ${Math.max(0, ownedShares - openSellShares)} shares.`,
        };
      }

      const targetPrice =
        params.type === 'market' ? stock.price : (params.limitPrice ?? stock.price);
      const estimatedTotal = Number((params.qty * targetPrice).toFixed(2));

      if (params.side === 'buy' && estimatedTotal > availableCash + 0.001) {
        return {
          ok: false,
          message: `Insufficient buying power (${formatCurrency(availableCash)} available).`,
        };
      }

      const orderId = `XN-${Math.floor(85000 + Math.random() * 14999)}`;
      const nowIso = new Date().toISOString();

      const isImmediateLimitFill =
        params.type === 'limit' &&
        params.limitPrice !== undefined &&
        ((params.side === 'buy' && stock.price <= params.limitPrice) ||
          (params.side === 'sell' && stock.price >= params.limitPrice));

      if (params.type === 'market' || isImmediateLimitFill) {
        const fillPrice = stock.price;
        const order: Order = {
          id: orderId,
          symbol: params.symbol,
          side: params.side,
          type: params.type,
          qty: params.qty,
          limitPrice: params.limitPrice,
          fillPrice,
          status: 'filled',
          timeInForce: params.timeInForce,
          createdAt: nowIso,
          filledAt: nowIso,
          total: Number((params.qty * fillPrice).toFixed(2)),
        };

        setBroker((prev) => fillOrderIntoState(prev, order, fillPrice));

        return {
          ok: true,
          message: `Filled: ${params.side === 'buy' ? 'Bought' : 'Sold'} ${params.qty} ${params.symbol} @ ${formatCurrency(fillPrice)}.`,
        };
      }

      const pendingOrder: Order = {
        id: orderId,
        symbol: params.symbol,
        side: params.side,
        type: 'limit',
        qty: params.qty,
        limitPrice: params.limitPrice,
        status: 'open',
        timeInForce: params.timeInForce,
        createdAt: nowIso,
        total: estimatedTotal,
      };

      setBroker((prev) => ({
        ...prev,
        orders: [pendingOrder, ...prev.orders],
      }));

      return {
        ok: true,
        message: `Limit order placed: ${params.side.toUpperCase()} ${params.qty} ${params.symbol} @ ${formatCurrency(targetPrice)}.`,
      };
    },
    [stocks, broker.cashBalance, broker.positions, broker.orders, reservedCash]
  );

  const handleCancelOrder = useCallback((orderId: string) => {
    setBroker((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId && o.status === 'open' ? { ...o, status: 'cancelled' } : o
      ),
    }));
  }, []);

  const handleExecuteLimitNow = useCallback(
    (orderId: string) => {
      const targetOrder = broker.orders.find((o) => o.id === orderId && o.status === 'open');
      if (!targetOrder) return;
      const stock = stocks.find((s) => s.symbol === targetOrder.symbol);
      if (!stock) return;

      setBroker((prev) => fillOrderIntoState(prev, targetOrder, stock.price));
    },
    [broker.orders, stocks]
  );

  const handleToggleWatchlist = useCallback((symbol: string) => {
    setBroker((prev) => {
      const exists = prev.watchlist.includes(symbol);
      return {
        ...prev,
        watchlist: exists
          ? prev.watchlist.filter((s) => s !== symbol)
          : [...prev.watchlist, symbol],
      };
    });
  }, []);

  const handleTradeSymbol = useCallback(
    (symbol: string, side: OrderSide) => {
      setSelectedSymbol(symbol);
      setTradeSide(side);
      navigateTo('trade');
    },
    [navigateTo]
  );

  const handleTransferFunds = useCallback(
    (params: {
      direction: 'deposit' | 'withdrawal';
      amount: number;
      bankAccountId: string;
    }): { ok: boolean; message: string } => {
      const bank =
        broker.bankAccounts.find((b) => b.id === params.bankAccountId) ??
        broker.bankAccounts[0];
      const bankRef = bank
        ? `${bank.institution} ••••${bank.last4}`
        : 'Linked Bank Account';

      if (params.direction === 'deposit') {
        const nowIso = new Date().toISOString();
        setBroker((prev) => ({
          ...prev,
          ledger: [
            {
              id: `LDG-${Math.floor(1000 + Math.random() * 9000)}`,
              type: 'deposit',
              amount: params.amount,
              description: 'Custody Deposit Transfer',
              reference: bankRef,
              timestamp: nowIso,
              balanceAfter: prev.cashBalance,
              status: 'pending',
            },
            ...prev.ledger,
          ],
        }));

        const uid = cloudUserIdRef.current;
        if (uid) {
          lastLocalMoneyChangeRef.current = Date.now();
          void submitDepositRequest({
            userId: uid,
            amount: params.amount,
            method: bankRef,
            reference: 'XN-DEP',
            notes: 'Custody deposit transfer',
          });
        }

        return {
          ok: true,
          message: `Deposit of ${formatCurrency(params.amount)} submitted — Pending Under Review. Funds will be credited once approved by admin.`,
        };
      }

      const available = Math.max(0, broker.cashBalance - reservedCash);
      if (params.amount > available + 0.001) {
        return {
          ok: false,
          message: `Withdrawal exceeds available unsettled-free cash (${formatCurrency(available)}).`,
        };
      }

      const nowIso = new Date().toISOString();
      const delta = -params.amount;

      const uid = cloudUserIdRef.current;
      if (uid) {
        lastLocalMoneyChangeRef.current = Date.now();
        void submitWithdrawalRequest({
          userId: uid,
          amount: params.amount,
          method: bankRef,
          reference: 'XN-WDR',
        });
      }

      setBroker((prev) => {
        const nextCash = Number((prev.cashBalance + delta).toFixed(2));
        return {
          ...prev,
          cashBalance: nextCash,
          ledger: [
            {
              id: `LDG-${Math.floor(1000 + Math.random() * 9000)}`,
              type: 'withdrawal',
              amount: delta,
              description: 'ACH Bank Withdrawal',
              reference: bankRef,
              timestamp: nowIso,
              balanceAfter: nextCash,
              status: 'pending',
            },
            ...prev.ledger,
          ],
        };
      });

      return {
        ok: true,
        message: `Withdrawal of ${formatCurrency(params.amount)} to ${bankRef} submitted — pending admin approval.`,
      };
    },
    [broker.bankAccounts, broker.cashBalance, reservedCash]
  );

  const handleApproveDeposit = useCallback((ledgerId: string) => {
    const nowIso = new Date().toISOString();
    setBroker((prev) => {
      const target = prev.ledger.find(
        (entry) => entry.id === ledgerId && entry.type === 'deposit' && entry.status === 'pending'
      );
      if (!target) return prev;
      const nextCash = Number((prev.cashBalance + target.amount).toFixed(2));
      return {
        ...prev,
        cashBalance: nextCash,
        ledger: prev.ledger.map((entry) =>
          entry.id === ledgerId
            ? {
                ...entry,
                status: 'approved',
                balanceAfter: nextCash,
                timestamp: nowIso,
              }
            : entry
        ),
      };
    });
  }, []);

  const handleAddBankAccount = useCallback(
    (institution: string, accountLabel: string, last4: string) => {
      setBroker((prev) => ({
        ...prev,
        bankAccounts: [
          ...prev.bankAccounts,
          {
            id: `bank-${Date.now()}`,
            institution,
            accountLabel,
            last4,
          },
        ],
      }));
    },
    []
  );

  const handleResetAccount = useCallback((mode: 'starter' | 'fresh') => {
    setBroker(
      mode === 'fresh' ? createFreshCashBrokerState() : createInitialBrokerState()
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-x-hidden">
      <TopNav
        activePage={activePage}
        onNavigate={navigateTo}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activePage === 'home' && (
          <HomePage
            user={user}
            stocks={stocks}
            indices={indices}
            cashBalance={broker.cashBalance}
            totalPortfolioValue={totalPortfolioValue}
            onNavigate={navigateTo}
            onTradeSymbol={handleTradeSymbol}
          />
        )}

        {(activePage === 'login' || activePage === 'signup') && (
          <AuthPage
            mode={activePage}
            onSwitchMode={(mode) => navigateTo(mode)}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onDemoLogin={handleDemoLogin}
          />
        )}

        {/* Dedicated profile completion step (never overlays other pages) */}
        {activePage === 'complete-profile' && (
          <CompleteProfile
            initialEmail={user?.email}
            onComplete={(formData) => {
              handleUpdateProfile(
                `${formData.firstName} ${formData.lastName}`.trim(),
                formData.email || user?.email || ''
              );
              navigateTo('funding');
            }}
            onSkip={() => navigateTo('home')}
          />
        )}

        {activePage === 'admin' && <AdminPage onExit={() => navigateTo('home')} />}

        {activePage === 'trade' && (
          <TradePage
            stocks={stocks}
            selectedSymbol={selectedSymbol}
            initialSide={tradeSide}
            onSelectSymbol={setSelectedSymbol}
            cashBalance={broker.cashBalance}
            reservedCash={reservedCash}
            positions={broker.positions}
            orders={broker.orders}
            watchlist={broker.watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onPlaceOrder={handlePlaceOrder}
            onCancelOrder={handleCancelOrder}
            onExecuteLimitNow={handleExecuteLimitNow}
            isLiveQuotes={isLiveQuotes}
            onToggleLiveQuotes={() => setIsLiveQuotes((v) => !v)}
          />
        )}

        {activePage === 'portfolio' && (
          <PortfolioPage
            user={user}
            kyc={kyc}
            onSaveKyc={(next) => {
              setKyc(next);
              const uid = cloudUserIdRef.current;
              if (uid) void pushProfile(uid, { hasCompletedProfile: next.status === 'verified' });
            }}
            stocks={stocks}
            positions={broker.positions}
            cashBalance={broker.cashBalance}
            reservedCash={reservedCash}
            isLiveQuotes={isLiveQuotes}
            onToggleLiveQuotes={() => setIsLiveQuotes((v) => !v)}
            onUpdateProfile={handleUpdateProfile}
            onResetAccount={handleResetAccount}
            onLogout={handleLogout}
            onOpenAuth={(mode) => navigateTo(mode)}
            onTradeSymbol={handleTradeSymbol}
            onBrowseMarkets={() => navigateTo('markets')}
            onNavigateFunding={() => navigateTo('funding')}
          />
        )}

        {activePage === 'markets' && (
          <MarketsPage
            stocks={stocks}
            watchlist={broker.watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onTradeSymbol={handleTradeSymbol}
          />
        )}

        {activePage === 'funding' && (
          <FundingPage
            user={user}
            cashBalance={broker.cashBalance}
            reservedCash={reservedCash}
            bankAccounts={broker.bankAccounts}
            ledger={broker.ledger}
            onTransferFunds={handleTransferFunds}
            onApproveDeposit={handleApproveDeposit}
            onAddBankAccount={handleAddBankAccount}
            onGoToTrade={() => navigateTo('trade')}
            onGoToPortfolio={() => navigateTo('portfolio')}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-gradient-to-r from-[#070D19] via-[#0B1221] to-[#0F1E3D] text-slate-300 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="font-medium text-slate-200">
            <span className="font-display font-bold text-white">
              Xena <span className="text-blue-400">Broker</span>
            </span>{' '}
            <span aria-hidden="true" className="text-slate-500">·</span>{' '}
            <span className="text-slate-400">US Equities Trading &amp; Portfolio Platform</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-medium">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('trade')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Trade
            </button>
            <button
              type="button"
              onClick={() => navigateTo('portfolio')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Portfolio
            </button>
            <button
              type="button"
              onClick={() => navigateTo('markets')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Markets
            </button>
            <button
              type="button"
              onClick={() => navigateTo('funding')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Funding
            </button>
            <button
              type="button"
              onClick={() => enqueueModals(['platform_info'])}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About Platform
            </button>
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className="text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              Admin
            </button>
            {!user && (
              <>
                <button
                  type="button"
                  onClick={() => navigateTo('login')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('signup')}
                  className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      <WithdrawalToastFeed />

      <PlatformModals
        activeModal={modalQueue[0] ?? null}
        userName={user?.name}
        onClose={closeActiveModal}
        onCreditBonus={handleCreditBonus}
        onNavigate={navigateTo}
      />
    </div>
  );
}
