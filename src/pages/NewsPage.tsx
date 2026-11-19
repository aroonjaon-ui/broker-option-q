import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  Globe2,
  Newspaper,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import tradingDeskImg from '../assets/images/home_trading_desk_1794692664220.jpg';
import portfolioStudioImg from '../assets/images/home_portfolio_studio_1794692664964.jpg';
import fundingVaultImg from '../assets/images/home_funding_vault_1794692664965.jpg';
import { PageId } from '../types/broker';

interface NewsPageProps {
  onNavigate: (page: PageId) => void;
}

type Category = 'Markets' | 'Equities' | 'Economy' | 'Crypto' | 'Company';

interface NewsItem {
  id: number;
  category: Category;
  title: string;
  summary: string;
  source: string;
  time: string;
  tickers: string[];
  image: string;
  featured?: boolean;
}

const NEWS: NewsItem[] = [
  {
    id: 1,
    category: 'Markets',
    title: 'US stocks edge higher as investors weigh the latest inflation data',
    summary:
      'Major benchmarks advanced modestly in cautious trading, with technology shares leading gains while traders positioned ahead of the next central bank decision.',
    source: 'Xena Market Desk',
    time: '2 hours ago',
    tickers: ['SPY', 'QQQ', 'NVDA'],
    image: tradingDeskImg,
    featured: true,
  },
  {
    id: 2,
    category: 'Equities',
    title: 'Chipmakers rally on upbeat demand outlook',
    summary:
      'Semiconductor names moved higher after a round of optimistic commentary on AI-related demand and improving order books.',
    source: 'Market Wire',
    time: '4 hours ago',
    tickers: ['NVDA', 'AMD', 'MSFT'],
    image: portfolioStudioImg,
  },
  {
    id: 3,
    category: 'Economy',
    title: 'Treasury yields stabilise after a volatile week',
    summary:
      'Government bond yields held steady as markets digested a batch of economic indicators and recalibrated expectations for policy rates.',
    source: 'Global Brief',
    time: '6 hours ago',
    tickers: ['TLT', 'IEF'],
    image: fundingVaultImg,
  },
  {
    id: 4,
    category: 'Company',
    title: 'Apple supplier order book points to steady iPhone demand',
    summary:
      'A read-through from the supply chain suggests resilient demand for the latest devices, supporting a constructive view on the namesake stock.',
    source: 'Equity Notes',
    time: '8 hours ago',
    tickers: ['AAPL'],
    image: portfolioStudioImg,
  },
  {
    id: 5,
    category: 'Crypto',
    title: 'Bitcoin holds key level as digital assets see mixed flows',
    summary:
      'The largest cryptocurrency traded in a narrow range while broader digital-asset products recorded a split between inflows and outflows.',
    source: 'Digital Assets Daily',
    time: '11 hours ago',
    tickers: ['BTC', 'ETH'],
    image: tradingDeskImg,
  },
  {
    id: 6,
    category: 'Markets',
    title: 'Energy shares slip as crude prices retreat',
    summary:
      'Oil-linked equities weakened as crude futures gave back recent gains amid signs of softer near-term demand.',
    source: 'Market Wire',
    time: '1 day ago',
    tickers: ['XLE', 'CVX'],
    image: fundingVaultImg,
  },
  {
    id: 7,
    category: 'Equities',
    title: 'What a stronger dollar means for multinational earnings',
    summary:
      'Currency moves remain a key swing factor for globally exposed firms as reporting season approaches.',
    source: 'Xena Market Desk',
    time: '1 day ago',
    tickers: ['MSFT', 'AMZN', 'META'],
    image: portfolioStudioImg,
  },
];

const CATEGORIES: Array<'All' | Category> = [
  'All',
  'Markets',
  'Equities',
  'Economy',
  'Crypto',
  'Company',
];

export default function NewsPage({ onNavigate }: NewsPageProps) {
  const [category, setCategory] = useState<'All' | Category>('All');

  const filtered = useMemo(
    () => (category === 'All' ? NEWS : NEWS.filter((n) => n.category === category)),
    [category]
  );
  const featured = filtered.find((n) => n.featured) ?? filtered[0];
  const list = filtered.filter((n) => n.id !== featured?.id);

  return (
    <div className="-mx-3 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-8">
      {/* Header */}
      <section className="relative overflow-hidden bg-[#06182B] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-sky-500/15 blur-3xl"
        />
        <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] sm:text-xs font-semibold tracking-wide text-emerald-300">
            <Newspaper className="w-3.5 h-3.5" />
            Market intelligence
          </span>
          <h1 className="mt-5 font-display font-extrabold tracking-tight text-white text-[2.4rem] leading-[1.05] sm:text-5xl">
            News &amp; <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-sky-400 bg-clip-text text-transparent">market insights</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] sm:text-lg leading-relaxed text-slate-300">
            Stay informed with the stories moving equities, the economy and the markets you trade —
            all in one place.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-emerald-400 text-[#04231A] shadow-lg shadow-emerald-500/20'
                    : 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14 space-y-8">
        {featured && (
          <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]">
            <img
              src={featured.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-25 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--card)] via-[var(--card)]/90 to-transparent" />
            <div className="relative p-6 sm:p-9 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                <TrendingUp className="w-3 h-3" /> {featured.category} · Featured
              </span>
              <h2 className="mt-4 font-display text-xl sm:text-3xl font-bold leading-snug text-[var(--foreground)]">
                {featured.title}
              </h2>
              <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-[var(--muted-foreground)]">
                {featured.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">{featured.source}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="w-3.5 h-3.5" /> {featured.time}
                </span>
                {featured.tickers.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-[var(--border)] px-2 py-0.5 font-mono font-semibold"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </article>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {list.map((item) => (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5"
            >
              <div className="relative h-36 overflow-hidden">
                <img
                  src={item.image}
                  alt=""
                  className="h-full w-full object-cover opacity-80 transition-transform duration-500 hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-[#06182B]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {item.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-base font-bold leading-snug text-[var(--foreground)]">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                  {item.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[var(--muted)]">
                  <span className="font-semibold text-[var(--foreground)]">{item.source}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="w-3 h-3" /> {item.time}
                  </span>
                  {item.tickers.map((t) => (
                    <span key={t} className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('trade')}
                  className="mt-4 inline-flex items-center gap-1 self-start text-xs font-bold text-emerald-600 hover:text-emerald-500 cursor-pointer"
                >
                  Trade these markets <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted-foreground)]">
            No stories in this category yet.
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--subtle)] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">Trade the headlines</p>
              <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)]">
                Open the trade desk to act on the markets you follow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('trade')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-sm font-bold text-[#04231A] shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            Go to trade desk <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          News is provided for information only and is not investment advice. Prices shown in the
          trade desk are illustrative.
        </p>
      </div>
    </div>
  );
}
