import { useState, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export type SocialProvider = 'google' | 'apple' | 'facebook';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  onSignup: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  onDemoLogin: () => void;
  onSocialAuth: (provider: SocialProvider, mode: 'login' | 'signup') => Promise<void>;
  socialError: string | null;
  socialBusy: SocialProvider | null;
}

const SOCIAL_PROVIDERS: { id: SocialProvider; label: string; icon: ReactNode }[] = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path fill="#4285F4" d="M23.5 12.23c0-.82-.07-1.6-.21-2.36H12v4.47h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.74Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.76-2.11-6.7-4.94H1.3v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.3 14.31a7.2 7.2 0 0 1 0-4.62v-3.1H1.3a12 12 0 0 0 0 10.82l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.43-3.43A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.3 6.59l4 3.1C6.24 6.86 8.88 4.75 12 4.75Z" />
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Apple',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-slate-900" aria-hidden="true">
        <path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.6a4.6 4.6 0 0 0-3.6-1.9c-1.5-.2-3 .9-3.7.9s-1.9-.9-3.2-.9a4.8 4.8 0 0 0-4 2.4c-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.4 4.4 0 0 1-2.5-3.9ZM14.3 5.9a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-3 1.5 4.2 4.2 0 0 0-1 3.1 3.7 3.7 0 0 0 3-1.4Z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.9V12h2.2V9.8c0-2.2 1.3-3.4 3.3-3.4 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.4V12h2.5l-.4 3.5h-2.1v8.4A12 12 0 0 0 24 12Z" />
      </svg>
    ),
  },
];

export default function AuthPage({
  mode,
  onSwitchMode,
  onLogin,
  onSignup,
  onDemoLogin,
  onSocialAuth,
  socialError,
  socialBusy,
}: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!acceptedTerms) {
        setError('Please acknowledge the brokerage account agreement to continue.');
        return;
      }
      const res = await onSignup(trimmedEmail, password);
      if (!res.ok && res.message) {
        setError(res.message);
      }
    } else {
      const res = await onLogin(trimmedEmail, password);
      if (!res.ok && res.message) {
        setError(res.message);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10">
      <div className="bg-gradient-to-b from-white via-white to-blue-50/40 border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Segmented Login / Sign Up Switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              onSwitchMode('login');
              setError(null);
            }}
            className={`py-2.5 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              onSwitchMode('signup');
              setError(null);
            }}
            className={`py-2.5 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="mt-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'login' ? 'Sign in to Xena Broker' : 'Open your brokerage account'}
          </h1>
          <p className="mt-2 text-sm sm:text-[15px] text-slate-600">
            {mode === 'login'
              ? 'Access your cash funding, live stock charts, and portfolio.'
              : 'Create an individual cash account and proceed straight to funding.'}
          </p>
        </div>

        {/* Clerk handles social sign-up / sign-in */}
        <div className="mt-6 space-y-2.5">
          {SOCIAL_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={socialBusy !== null}
              onClick={() => {
                setError(null);
                void onSocialAuth(provider.id, mode);
              }}
              className="w-full py-2.5 px-4 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {provider.icon}
              <span>
                {socialBusy === provider.id
                  ? 'Connecting…'
                  : `Continue with ${provider.label}`}
              </span>
            </button>
          ))}
          {socialError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-900 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{socialError}</span>
            </div>
          )}
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            or use email
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 text-[15px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          )}

          {mode === 'login' && (
            <div>
              <label htmlFor="auth-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 text-[15px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 text-[15px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          )}

          {mode === 'login' && (
            <div>
              <label htmlFor="auth-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 text-[15px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>
                I understand Xena Broker provides simulated equities execution and individual cash account management.
              </span>
            </label>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-900 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xs hover:from-blue-700 hover:to-indigo-600 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {mode === 'login' ? 'Log In & Go to Funding' : 'Create Account & Fund'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <button
            type="button"
            onClick={onDemoLogin}
            className="w-full py-2.5 px-4 text-sm font-semibold text-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/70 border border-slate-200 rounded-xl hover:from-slate-100 hover:to-blue-100/70 transition-all cursor-pointer"
          >
            Sign in with Demo Account (Alex Mercer)
          </button>

          <p className="text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <>
                New to Xena Broker?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode('signup');
                    setError(null);
                  }}
                  className="font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Open an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onSwitchMode('login');
                    setError(null);
                  }}
                  className="font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}