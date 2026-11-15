import React, { useEffect, useState } from 'react';
import { Loader2, UserRound, X } from 'lucide-react';
import { signInAsGuest, signInWithGoogle } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loadingMode, setLoadingMode] = useState<'google' | 'guest' | null>(null);
  const [error, setError] = useState('');
  const [needsAnonymousConsoleHint, setNeedsAnonymousConsoleHint] =
    useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setNeedsAnonymousConsoleHint(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingMode) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loadingMode, onClose]);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setError('');
    setNeedsAnonymousConsoleHint(false);
    setLoadingMode('google');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setError('Sign-in popup was closed before completing.');
      } else {
        setError(msg);
      }
    } finally {
      setLoadingMode(null);
    }
  };

  const handleGuest = async () => {
    setError('');
    setNeedsAnonymousConsoleHint(false);
    setLoadingMode('guest');
    try {
      await signInAsGuest();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('operation-not-allowed') ||
        msg.includes('admin-restricted-operation')
      ) {
        setNeedsAnonymousConsoleHint(true);
        setError(
          'Anonymous (Guest) authentication is not enabled yet in Firebase Console.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Wardroby"
      onClick={() => !loadingMode && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#0A0A0A] border border-white/15 p-6 sm:p-8 text-white space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={Boolean(loadingMode)}
          onClick={onClose}
          aria-label="Close sign in"
          className="absolute top-5 right-5 w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/75 hover:text-white hover:border-white/40 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-2 pr-8">
          <h2 className="font-serif-instrument text-3xl sm:text-4xl text-white">
            Save your style history
          </h2>
          <p className="text-sm text-white/65 leading-relaxed">
            Sign in with Google or continue as a Guest to store your Top 5 recommendations and stylist chat history.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={Boolean(loadingMode)}
            onClick={handleGoogle}
            className="w-full bg-white text-black rounded-full py-3.5 px-6 text-sm font-medium hover:bg-white/90 transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
          >
            {loadingMode === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            disabled={Boolean(loadingMode)}
            onClick={handleGuest}
            className="w-full border border-white/25 hover:border-white/60 text-white rounded-full py-3.5 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {loadingMode === 'guest' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserRound className="w-4 h-4" />
            )}
            <span>Continue as Guest</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/15 text-xs text-white/85 space-y-1.5"
          >
            <p>{error}</p>
            {needsAnonymousConsoleHint && (
              <p className="text-white/60 leading-relaxed">
                To enable Guest sign-in: open Firebase Console → Authentication → Sign-in method → Anonymous → Enable, then click Continue as Guest again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
