import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export interface CompleteProfileFormData {
  firstName: string;
  lastName: string;
  country: string;
  email: string;
  termsAccepted: boolean;
}

export default function CompleteProfile({
  initialEmail,
  onComplete,
  onSkip,
}: {
  initialEmail?: string;
  onComplete: (formData: CompleteProfileFormData) => void;
  onSkip: () => void;
}) {
  const [formData, setFormData] = useState<CompleteProfileFormData>({
    firstName: '',
    lastName: '',
    country: '',
    email: initialEmail || '',
    termsAccepted: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    country?: string;
    terms?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: any = {};

    if (!formData.firstName?.trim() || formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }
    if (!formData.lastName?.trim() || formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }
    if (!formData.country) {
      newErrors.country = 'Country is required';
    }
    if (!formData.termsAccepted) {
      newErrors.terms = 'Must accept terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleTermsChange = (e: any) => {
    setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }));
    if (errors.terms) {
      const newErrors = { ...errors };
      delete newErrors.terms;
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    // Call the onComplete callback with the form data
    if (onComplete) {
      onComplete(formData);
    }

    setShowSuccess(true);

    // Navigate after delay
    setTimeout(() => {
      // In real app: navigateTo('home')
      console.log('Profile completed:', formData);
    }, 1500);
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--card)] rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--secondary)] to-[var(--primary)] mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-[var(--primary-foreground)]" />
          </div>
          <h3 className="font-display text-xl font-bold text-[var(--foreground)]">Profile Complete!</h3>
          <p className="text-[var(--muted-foreground)] mb-4">
            Welcome to Xena Broker, {formData.firstName}!
          </p>
          <p className="text-[var(--muted-foreground)]">
            Your profile has been saved and you can now start trading.
          </p>
          <button
            type="button"
            onClick={() => console.log('Navigate to home')}
            className="px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-md mx-auto">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-[var(--shadow)]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[var(--primary-foreground)]" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-[var(--foreground)]">Complete Your Profile</h2>
          <p className="text-[var(--muted-foreground)] mt-1">
            Help us personalize your Xena Broker experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[var(--muted-foreground)] block mb-2">First Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                placeholder="John"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs text-[var(--destructive)] mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="text-[var(--muted-foreground)] block mb-2">Last Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                placeholder="Doe"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs text-[var(--destructive)] mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-[var(--muted-foreground)] block mb-2">Country <span className="text-red-500">*</span></label>
            <select
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 text-[var(--foreground)] bg-[var(--input)] border border-[var(--border)] rounded-xl focus:bg-[var(--card)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              aria-invalid={!!errors.country}
            >
              <option value="">Select country</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
            </select>
            {errors.country && (
              <p className="text-xs text-[var(--destructive)] mt-1">{errors.country}</p>
            )}
          </div>

          <div className="flex items-start gap-2 mb-6">
            <input
              type="checkbox"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleTermsChange}
              className="w-4 h-4 rounded border-[var(--border)] focus:ring-[var(--primary)]"
              required
            />
            <span className="text-[var(--muted-foreground)] flex items-center gap-2">
              I agree to the <a href="#" className="text-[var(--primary)] hover:underline">Terms of Service</a> and <a href="#" className="text-[var(--primary)] hover:underline">Privacy Policy</a>
            </span>
          </div>

          {errors.terms && (
            <p className="text-xs text-[var(--destructive)] mt-1">Must accept terms and conditions</p>
          )}

          <div className="flex gap-3 pt-6 border-t border-[var(--border)]">
            <button
              type="submit"
              className="flex-1 py-2.5 text-sm font-medium text-[var(--primary-foreground)] bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)] rounded-xl shadow-sm hover:from-[var(--primary-100)] hover:via-[var(--secondary-100)] hover:to-[var(--accent-100)] transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>
            <button
              type="button"
              className="py-2.5 text-sm font-medium text-[var(--muted)] bg-[var(--subtle)] border border-[var(--border)] rounded-xl hover:bg-[var(--white)] hover:border-[var(--primary)] transition-all cursor-pointer"
              onClick={onSkip}
            >
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}