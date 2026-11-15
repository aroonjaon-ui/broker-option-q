import { useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { UserAccount } from '../types/broker';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onSwitchMode: (mode: 'login' | 'signup') => void;
  onLogin: (email: string, password: string) => { ok: boolean; message?: string };
  onSignup: (name: string, email: string, password: string) => { ok: boolean; message?: string };
  onDemoLogin: () => void;
}

export default function AuthPage({
  mode,
  onSwitchMode,
  onLogin,
  onSignup,
  onDemoLogin,
}: AuthPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
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
      if (name.trim().length < 2) {
        setError('Enter your full legal name.');
        return;
      }
      if (!acceptedTerms) {
        setError('Please acknowledge the brokerage account agreement to continue.');
        return;
      }
      const res = onSignup(name.trim(), trimmedEmail, password);
      if (!res.ok && res.message) {
        setError(res.message);
      }
    } else {
      const res = onLogin(trimmedEmail, password);
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Alex Mercer"
                className="w-full px-3.5 py-2.5 text-[15px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          )}

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
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
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
