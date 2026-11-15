import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  ArrowRight,
  Calendar,
  Check,
  ExternalLink,
  Globe,
  History,
  Instagram,
  LogOut,
  Mail,
  Shirt,
  SlidersHorizontal,
  Trash2,
  Twitter,
  UserRound,
} from 'lucide-react';
import {
  BODY_TYPES,
  BodyTypeId,
  DESIGNS,
  HeightFrame,
} from './data/wardrobeCatalog';
import {
  GenderOption,
  RecommendationModal,
  Top5AIResponse,
  WizardFormValues,
} from './components/RecommendationModal';
import { StylistChat } from './components/StylistChat';
import { AuthModal } from './components/AuthModal';
import {
  OperationType,
  SavedRecommendationRecord,
  deleteRecommendationRun,
  ensureUserProfile,
  getFirebase,
  handleFirestoreError,
  saveRecommendationRun,
  signOutUser,
} from './lib/firebase';

const HERO_VIDEO_URL =
  'https://designerstephen.github.io/public-assets/videos/observe-hero.mp4';

const ACCOUNT_CONTACT_EMAIL = 'rahul.kej05@gmail.com';

const DEFAULT_WIZARD_VALUES: WizardFormValues = {
  gender: 'Women',
  bodyType: 'hourglass',
  heightFrame: 'standard',
  usualSize: 'M',
  fitPreference: 'Balanced',
  occasion: 'Daily & Work',
  budgetPerPiece: '₹5,000 – ₹10,000',
  climate: 'Mild / Layering',
  preferences: ['Monochrome & Neutrals', 'Natural Fabrics Only'],
  extraNotes: '',
  deliveryPreference: 'Standard (3–5 Business Days)',
  targetDeliveryDate: '',
};

function getIndianStoreUrl(
  sourceUrl: string | undefined,
  sellerName: string,
  outfitTitle: string
): string {
  if (sourceUrl && sourceUrl.startsWith('https://')) {
    return sourceUrl;
  }
  const lower = sellerName.toLowerCase();
  const encoded = encodeURIComponent(outfitTitle || 'minimalist outfit');
  const slug = (outfitTitle || 'clothing')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
  if (lower.includes('zara')) {
    return `https://www.zara.com/in/en/search?searchTerm=${encoded}`;
  }
  if (lower.includes('h&m') || lower.includes('hm')) {
    return `https://www2.hm.com/en_in/search-results.html?q=${encoded}`;
  }
  if (lower.includes('uniqlo')) {
    return `https://www.uniqlo.com/in/en/search?q=${encoded}`;
  }
  if (lower.includes('mango')) {
    return `https://shop.mango.com/in/en/search?kw=${encoded}`;
  }
  if (lower.includes('nykaa')) {
    return `https://www.nykaafashion.com/catalogsearch/result/?q=${encoded}`;
  }
  if (lower.includes('ajio')) {
    return `https://www.ajio.com/search/?text=${encoded}`;
  }
  if (lower.includes('tata') || lower.includes('cliq')) {
    return `https://www.tatacliq.com/search/?searchCategory=all&text=${encoded}`;
  }
  return `https://www.myntra.com/${slug || 'clothing'}`;
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const designsRef = useRef<HTMLElement | null>(null);
  const contactRef = useRef<HTMLElement | null>(null);

  // Auth & Firestore persistence state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [savedRuns, setSavedRuns] = useState<SavedRecommendationRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [savingRun, setSavingRun] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

  // 4-step AI Outfit Recommender state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardValues, setWizardValues] = useState<WizardFormValues>(
    DEFAULT_WIZARD_VALUES
  );
  const [aiResult, setAiResult] = useState<Top5AIResponse | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactFieldErrors, setContactFieldErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});
  const [contactRefId, setContactRefId] = useState<string | null>(null);
  const [contactMailtoUrl, setContactMailtoUrl] = useState<string | null>(null);
  const [contactEmailedDirectly, setContactEmailedDirectly] = useState(false);

  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = 0.5;
    const enforceSpeed = () => {
      video.playbackRate = 0.5;
    };
    video.addEventListener('loadeddata', enforceSpeed);
    return () => {
      video.removeEventListener('loadeddata', enforceSpeed);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    getFirebase()
      .then(({ auth }) => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setAuthReady(true);
          if (user) {
            ensureUserProfile(user).catch((err) => {
              console.error('Could not sync user profile:', err);
            });
          } else {
            setSavedRuns([]);
            setActiveRunId(null);
          }
        });
      })
      .catch((err) => {
        console.error('Failed to initialize Firebase auth:', err);
        if (!cancelled) {
          setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !currentUser) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const path = `users/${currentUser.uid}/recommendations`;

    getFirebase()
      .then(({ db }) => {
        if (cancelled) return;
        const q = query(collection(db, path), where('uid', '==', currentUser.uid));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const runs: SavedRecommendationRecord[] = snapshot.docs.map((d) => {
              const data = d.data({ serverTimestamps: 'estimate' });
              const createdAtMs =
                data.createdAt && typeof data.createdAt.toMillis === 'function'
                  ? data.createdAt.toMillis()
                  : Date.now();
              return {
                id: d.id,
                uid: String(data.uid || currentUser.uid),
                gender: String(data.gender || 'Women'),
                bodyType: String(data.bodyType || 'hourglass'),
                heightFrame: String(data.heightFrame || 'standard'),
                usualSize: String(data.usualSize || 'M'),
                fitPreference: String(data.fitPreference || 'Balanced'),
                occasion: String(data.occasion || 'Daily & Work'),
                budgetPerPiece: String(data.budgetPerPiece || '₹5,000 – ₹10,000'),
                climate: String(data.climate || 'Mild / Layering'),
                preferences: Array.isArray(data.preferences)
                  ? data.preferences.map(String)
                  : [],
                extraNotes: String(data.extraNotes || ''),
                deliveryPreference: String(
                  data.deliveryPreference || 'Standard (3–5 Business Days)'
                ),
                targetDeliveryDate: String(data.targetDeliveryDate || ''),
                stylingOverview: String(data.stylingOverview || ''),
                outfits: Array.isArray(data.outfits) ? data.outfits : [],
                createdAtMs,
              };
            });

            runs.sort((a, b) => b.createdAtMs - a.createdAtMs);
            setSavedRuns(runs);
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, path);
          }
        );
      })
      .catch((err) => {
        console.error('Failed to initialize recommendations listener:', err);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [authReady, currentUser]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeBodyProfile =
    BODY_TYPES.find((b) => b.id === wizardValues.bodyType) ?? BODY_TYPES[0];

  const handleRecommendationsSuccess = async (
    submittedValues: WizardFormValues,
    result: Top5AIResponse
  ) => {
    setWizardValues(submittedValues);
    setAiResult(result);
    setActiveRunId(null);
    setWizardOpen(false);
    requestAnimationFrame(() => {
      scrollTo(resultsRef);
    });

    if (currentUser) {
      setSavingRun(true);
      try {
        const newId = await saveRecommendationRun(
          currentUser,
          submittedValues,
          result
        );
        setActiveRunId(newId);
      } catch (err) {
        console.error('Failed to save recommendation run:', err);
      } finally {
        setSavingRun(false);
      }
    }
  };

  const handleLoadSavedRun = (run: SavedRecommendationRecord) => {
    setWizardValues({
      gender: run.gender as GenderOption,
      bodyType: run.bodyType as BodyTypeId,
      heightFrame: run.heightFrame as HeightFrame,
      usualSize: run.usualSize,
      fitPreference: run.fitPreference,
      occasion: run.occasion,
      budgetPerPiece: run.budgetPerPiece,
      climate: run.climate,
      preferences: run.preferences,
      extraNotes: run.extraNotes,
      deliveryPreference: run.deliveryPreference,
      targetDeliveryDate: run.targetDeliveryDate,
    });
    setAiResult({
      stylingOverview: run.stylingOverview,
      recommendations: run.outfits,
    });
    setActiveRunId(run.id);
    requestAnimationFrame(() => {
      scrollTo(resultsRef);
    });
  };

  const handleDeleteSavedRun = async (
    event: React.MouseEvent,
    runId: string
  ) => {
    event.stopPropagation();
    if (!currentUser || deletingRunId) return;
    setDeletingRunId(runId);
    try {
      await deleteRecommendationRun(currentUser.uid, runId);
      if (activeRunId === runId) {
        setActiveRunId(null);
      }
    } finally {
      setDeletingRunId(null);
    }
  };

  const handleOpenWithDesignNote = (designTitle: string) => {
    setWizardValues((prev) => ({
      ...prev,
      extraNotes: `Inspired by: ${designTitle}`,
    }));
    setWizardOpen(true);
  };

  const handleContactSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setContactError('');

    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail.trim();
    const trimmedMessage = contactMessage.trim();

    const nextFieldErrors: {
      name?: string;
      email?: string;
      message?: string;
    } = {};

    if (!trimmedName) {
      nextFieldErrors.name = 'Please enter your name.';
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextFieldErrors.email =
        'Please enter a valid email address (e.g. name@example.com).';
    }
    if (trimmedMessage.length < 5) {
      nextFieldErrors.message =
        'Please write a message of at least 5 characters.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setContactFieldErrors(nextFieldErrors);
      return;
    }

    setContactFieldErrors({});
    setContactSending(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      });

      const rawText = await res.text();
      let data: {
        error?: string;
        referenceId?: string;
        recipientEmail?: string;
        emailedDirectly?: boolean;
      } | null = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText) as {
            error?: string;
            referenceId?: string;
            recipientEmail?: string;
            emailedDirectly?: boolean;
          };
        } catch {
          data = null;
        }
      }

      if (!res.ok || !data?.referenceId) {
        throw new Error(
          data?.error ||
            `Unable to send your message right now. Please try again or email ${ACCOUNT_CONTACT_EMAIL}.`
        );
      }

      const recipient = data.recipientEmail || ACCOUNT_CONTACT_EMAIL;
      const subject = `[Wardroby ${data.referenceId}] Message from ${trimmedName}`;
      const body = `Name: ${trimmedName}\nEmail: ${trimmedEmail}\nReference: ${data.referenceId}\n\n${trimmedMessage}`;
      const mailtoHref = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      if (!data.emailedDirectly) {
        const mailLink = document.createElement('a');
        mailLink.href = mailtoHref;
        mailLink.style.display = 'none';
        document.body.appendChild(mailLink);
        mailLink.click();
        mailLink.remove();
      }

      setContactRefId(data.referenceId);
      setContactMailtoUrl(mailtoHref);
      setContactEmailedDirectly(Boolean(data.emailedDirectly));
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg || msg.toLowerCase().includes('expected pattern')) {
        setContactError(
          `Unable to reach the contact service right now. Please try again or email ${ACCOUNT_CONTACT_EMAIL}.`
        );
      } else {
        setContactError(msg);
      }
    } finally {
      setContactSending(false);
    }
  };

  return (
    <div className="bg-black text-white min-h-screen selection:bg-white selection:text-black">
      {/* Liquid Glass Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-30 px-4 sm:px-6 pt-5 pointer-events-none">
        <div className="liquid-glass rounded-full max-w-5xl mx-auto pl-5 sm:pl-6 pr-1.5 py-1.5 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <a
              href="#top"
              className="flex items-center gap-2 text-white whitespace-nowrap shrink-0"
              aria-label="Wardroby home"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="w-6 h-6 shrink-0"
              >
                <path
                  d="M4.21 16.5 A9 9 0 0 1 16.5 4.21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M16.5 4.21 A9 9 0 0 1 19.79 16.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="2.4 2.3"
                />
                <path
                  d="M19.79 16.5 A9 9 0 0 1 4.21 16.5"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeDasharray="0.01 4.7"
                />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
              <span className="font-semibold text-lg tracking-tight whitespace-nowrap shrink-0">
                Wardroby
              </span>
            </a>

            <div className="hidden md:flex items-center gap-7 ml-8">
              <a
                href="#recommendations"
                className="text-white/80 hover:text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Recommendations
              </a>
              <a
                href="#designs"
                className="text-white/80 hover:text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Designs
              </a>
              <a
                href="#contact"
                className="text-white/80 hover:text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Contact us
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {authReady &&
              (currentUser ? (
                <div className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border border-white/15 text-xs text-white/85 whitespace-nowrap shrink-0">
                  <UserRound className="w-3.5 h-3.5 text-white/65 shrink-0" />
                  <span className="max-w-[96px] truncate">
                    {currentUser.isAnonymous
                      ? 'Guest'
                      : currentUser.displayName?.split(' ')[0] || 'Member'}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    aria-label="Sign out"
                    title="Sign out"
                    className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/65 hover:text-white transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="rounded-full border border-white/20 hover:border-white/50 px-4 py-2 text-white text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              ))}

            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="bg-white rounded-full px-5 py-2 text-black text-sm font-medium whitespace-nowrap shrink-0 hover:bg-white/90 transition-colors cursor-pointer"
            >
              Get Recommendations
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with 0.5x Looping Video */}
      <section
        id="top"
        className="min-h-screen h-screen relative overflow-hidden flex flex-col pt-24"
      >
        <video
          ref={videoRef}
          id="hero-video"
          src={HERO_VIDEO_URL}
          className="absolute inset-0 w-full h-full object-cover object-bottom"
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[8%]">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif-instrument tracking-tight whitespace-nowrap mb-4"
            style={{
              textShadow:
                '0 0 72px rgba(0, 0, 0, 0.42), 0 4px 28px rgba(0, 0, 0, 0.28)',
            }}
          >
            See the shape of your <em className="italic">style</em>
          </h1>

          <p
            className="text-white/75 text-sm leading-relaxed max-w-2xl md:whitespace-nowrap mb-10"
            style={{
              textShadow:
                '0 0 30px rgba(0, 0, 0, 0.32), 0 1px 10px rgba(0, 0, 0, 0.20)',
            }}
          >
            Answer four quick steps — our AI curates your top 5 outfits in INR from Indian fashion platforms.
          </p>

          <div className="liquid-glass rounded-full p-1.5 inline-flex items-center">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="bg-white rounded-full px-8 py-3.5 text-black text-sm font-medium whitespace-nowrap hover:scale-105 transition-transform duration-300 inline-flex items-center gap-2.5 cursor-pointer"
            >
              <span>Get Your Clothes Recommendations</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex justify-center gap-4 pb-10">
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            aria-label="Start outfit questionnaire"
            className="liquid-glass-circle w-14 h-14 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Instagram className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(designsRef)}
            aria-label="Explore designs"
            className="liquid-glass-circle w-14 h-14 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Twitter className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(contactRef)}
            aria-label="Contact us"
            className="liquid-glass-circle w-14 h-14 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Globe className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Top 5 AI Outfit Recommendations Section */}
      <section
        id="recommendations"
        ref={resultsRef}
        className="border-t border-white/10 bg-black py-20 px-6"
      >
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs text-white/55 tracking-wide">
                AI Outfit Curation
              </p>
              <h2 className="font-serif-instrument text-4xl sm:text-5xl tracking-tight text-white mt-2">
                {aiResult
                  ? `Your Top 5 Outfits · ${activeBodyProfile.label}`
                  : 'Personalized top 5 outfit recommendations'}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium whitespace-nowrap hover:bg-white/90 transition-colors inline-flex items-center gap-2 cursor-pointer self-start md:self-auto"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>
                {aiResult
                  ? 'Update Inputs & Re-run'
                  : 'Get Your Clothes Recommendations'}
              </span>
            </button>
          </div>

          {!aiResult ? (
            <div className="rounded-3xl bg-[#0A0A0A] border border-white/15 p-8 sm:p-12 text-center space-y-5">
              <h3 className="font-serif-instrument text-3xl sm:text-4xl text-white">
                4 quick steps to your top 5 looks
              </h3>
              <p className="text-sm text-white/65 max-w-xl mx-auto leading-relaxed">
                Tell us your gender presentation, body type, height frame, usual size, INR budget per piece, occasion, style preferences, and delivery timeline. AI curates five complete outfits sourced across Indian sites like Myntra, Zara India, H&M, Uniqlo, Mango, and Nykaa Fashion.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="bg-white text-black rounded-full px-8 py-3.5 text-sm font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Get Your Clothes Recommendations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {authReady && !currentUser && (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="border border-white/25 hover:border-white/60 text-white rounded-full px-6 py-3.5 text-sm font-medium transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <UserRound className="w-4 h-4" />
                    <span>Sign In to Save Runs</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Sign-in save prompt for signed-out users */}
              {authReady && !currentUser && (
                <div className="p-4 sm:px-6 rounded-2xl bg-white/[0.04] border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs sm:text-sm text-white/80">
                    Sign in with Google or continue as a Guest to save your recommendations and chat history.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="bg-white text-black rounded-full px-5 py-2 text-xs font-medium whitespace-nowrap hover:bg-white/90 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    Sign In (Google / Guest)
                  </button>
                </div>
              )}

              {/* Styling Overview & Active Profile Summary */}
              <div className="p-6 sm:p-7 rounded-3xl bg-[#0A0A0A] border border-white/15 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55">
                    <span>{wizardValues.gender}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeBodyProfile.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>Size {wizardValues.usualSize}</span>
                    <span aria-hidden="true">·</span>
                    <span>{wizardValues.occasion}</span>
                    <span aria-hidden="true">·</span>
                    <span>{wizardValues.budgetPerPiece}</span>
                    <span aria-hidden="true">·</span>
                    <span>{wizardValues.deliveryPreference}</span>
                  </div>
                  {currentUser && (
                    savingRun || activeRunId ? (
                      <span className="text-[11px] text-white/55">
                        {savingRun ? 'Saving...' : 'Saved to history'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!aiResult || savingRun) return;
                          setSavingRun(true);
                          try {
                            const newId = await saveRecommendationRun(
                              currentUser,
                              wizardValues,
                              aiResult
                            );
                            setActiveRunId(newId);
                          } catch (err) {
                            console.error('Failed to save run:', err);
                          } finally {
                            setSavingRun(false);
                          }
                        }}
                        className="text-[11px] text-white/80 hover:text-white underline underline-offset-4 cursor-pointer"
                      >
                        Save to history
                      </button>
                    )
                  )}
                </div>
                <p className="text-base text-white leading-relaxed">
                  {aiResult.stylingOverview}
                </p>
              </div>

              {/* Top 5 Ranked Outfits */}
              <div className="space-y-5">
                {aiResult.recommendations.map((outfit, index) => {
                  const matchedRef = DESIGNS.find(
                    (d) => d.id === outfit.referenceDesignId
                  );
                  const displayRank = outfit.rank || index + 1;

                  return (
                    <article
                      key={`${outfit.outfitTitle}-${displayRank}`}
                      className="rounded-3xl bg-[#0B0B0B] border border-white/15 overflow-hidden grid grid-cols-1 md:grid-cols-12"
                    >
                      {matchedRef && !failedImages[matchedRef.id] && (
                        <div className="md:col-span-4 aspect-[4/3] md:aspect-auto bg-[#121212] overflow-hidden">
                          <img
                            src={matchedRef.image}
                            alt={matchedRef.imageAlt}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({
                                ...prev,
                                [matchedRef.id]: true,
                              }))
                            }
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div
                        className={`${
                          matchedRef && !failedImages[matchedRef.id]
                            ? 'md:col-span-8'
                            : 'md:col-span-12'
                        } p-6 sm:p-8 flex flex-col justify-between gap-5`}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
                            <span className="tabular-nums text-white font-medium">
                              0{displayRank}. {outfit.sellerName} ({outfit.sellerCity})
                            </span>
                            <span className="tabular-nums text-white font-medium">
                              {outfit.fitMatchScore}% Fit Match
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                            <h3 className="font-serif-instrument text-3xl text-white">
                              {outfit.outfitTitle}
                            </h3>
                            <div className="text-sm font-semibold tabular-nums text-white shrink-0">
                              ~₹{Number(outfit.pricePerPieceEstimate || 0).toLocaleString('en-IN')}/piece · ₹{Number(outfit.totalOutfitEstimate || 0).toLocaleString('en-IN')} look
                            </div>
                          </div>

                          {/* Pieces Included */}
                          <p className="text-xs text-white/65">
                            Includes: {outfit.piecesIncluded.join(' · ')}
                          </p>

                          <p className="text-sm text-white/80 leading-relaxed pt-1">
                            {outfit.whyItWorksForYou}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/60">
                          <span>Styling note: {outfit.stylingTip}</span>
                          <div className="flex flex-wrap items-center gap-4 shrink-0">
                            <span className="inline-flex items-center gap-1.5 text-white/80">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{outfit.estimatedDelivery}</span>
                            </span>
                            <a
                              href={getIndianStoreUrl(
                                outfit.sourceUrl,
                                outfit.sellerName,
                                outfit.outfitTitle
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-white font-medium hover:text-white/80 underline underline-offset-4"
                            >
                              <span>Check on {outfit.sellerName}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved Recommendations History */}
          {currentUser && savedRuns.length > 0 && (
            <div className="pt-4 space-y-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <History className="w-4 h-4 text-white/65" />
                  <span>Saved Recommendations History ({savedRuns.length})</span>
                </div>
                <span className="text-xs text-white/50">
                  Click any saved run to view its Top 5 outfits
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedRuns.map((run) => {
                  const isActive = activeRunId === run.id;
                  const topOutfitTitle =
                    run.outfits[0]?.outfitTitle || 'Top 5 Curated Looks';
                  const formattedDate = new Date(
                    run.createdAtMs
                  ).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={run.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleLoadSavedRun(run)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLoadSavedRun(run);
                        }
                      }}
                      className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'bg-white/[0.08] border-white/55'
                          : 'bg-[#0A0A0A] border-white/15 hover:border-white/35'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-white/50">
                          <span>
                            {run.occasion} · {formattedDate}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedRun(e, run.id)}
                            disabled={deletingRunId === run.id}
                            aria-label={`Delete saved recommendation for ${run.occasion}`}
                            className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/45 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h4 className="text-sm font-medium text-white line-clamp-1">
                          {topOutfitTitle}
                        </h4>
                        <p className="text-xs text-white/60 line-clamp-1">
                          {run.gender} · {run.bodyType} · Size {run.usualSize} ·{' '}
                          {run.budgetPerPiece}
                        </p>
                      </div>
                      <span className="text-[11px] text-white/75 font-medium">
                        {isActive ? 'Currently viewing' : 'Load Top 5 outfits →'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Simple Design Reference Gallery */}
      <section
        id="designs"
        ref={designsRef}
        className="border-t border-white/10 bg-[#050505] py-20 px-6"
      >
        <div className="max-w-6xl mx-auto space-y-10">
          <div>
            <h2 className="font-serif-instrument text-4xl sm:text-5xl tracking-tight text-white">
              Reference silhouettes
            </h2>
            <p className="text-sm text-white/60 mt-2">
              Use any signature piece below as inspiration for your Top 5 recommendation run.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {DESIGNS.map((design) => {
              const broken = failedImages[design.id];
              return (
                <article
                  key={design.id}
                  className="rounded-3xl bg-[#0B0B0B] border border-white/10 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[3/4] bg-[#121212] overflow-hidden">
                      {!broken ? (
                        <img
                          src={design.image}
                          alt={design.imageAlt}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [design.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                          <Shirt className="w-8 h-8 text-white/35 mb-2" />
                          <span className="text-xs text-white/60">
                            {design.title}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-6 space-y-2">
                      <div className="text-xs text-white/55">
                        {design.category} · {design.fabric}
                      </div>
                      <h3 className="text-base font-medium text-white">
                        {design.title}
                      </h3>
                      <p className="text-xs text-white/55">
                        Available on:{' '}
                        {design.sellerListings
                          .map(
                            (s) =>
                              `${s.sellerName} (₹${s.price.toLocaleString('en-IN')})`
                          )
                          .join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <button
                      type="button"
                      onClick={() => handleOpenWithDesignNote(design.title)}
                      className="w-full rounded-full border border-white/25 hover:bg-white hover:text-black text-white py-2.5 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Recommend Looks Like This
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section
        id="contact"
        ref={contactRef}
        className="border-t border-white/10 bg-black py-20 px-6"
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <h2 className="font-serif-instrument text-4xl tracking-tight text-white">
              Contact us
            </h2>
            <p className="text-sm text-white/65 leading-relaxed">
              Questions about sizing, seller partnerships, or custom styling? Reach our team directly.
            </p>
            <a
              href={`mailto:${ACCOUNT_CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2.5 text-sm text-white/80 hover:text-white transition-colors pt-2"
            >
              <Mail className="w-4 h-4 text-white/60" />
              <span>{ACCOUNT_CONTACT_EMAIL}</span>
            </a>
          </div>

          <div className="md:col-span-7">
            <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-white/15">
              {contactRefId ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-white text-black mx-auto flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-base font-medium text-white">
                    {contactEmailedDirectly
                      ? `Message sent to ${ACCOUNT_CONTACT_EMAIL} (${contactRefId})`
                      : `Email prepared for ${ACCOUNT_CONTACT_EMAIL} (${contactRefId})`}
                  </p>
                  <p className="text-xs text-white/60">
                    {contactEmailedDirectly
                      ? 'Your message has been delivered. We will reply shortly.'
                      : 'Your default mail app was triggered with your message pre-filled.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    {contactMailtoUrl && !contactEmailedDirectly && (
                      <a
                        href={contactMailtoUrl}
                        className="bg-white text-black rounded-full px-5 py-2 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white/90 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Open in Mail App</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setContactRefId(null);
                        setContactMailtoUrl(null);
                        setContactEmailedDirectly(false);
                      }}
                      className="border border-white/25 hover:border-white/50 text-white rounded-full px-5 py-2 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Send Another
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleContactSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-name"
                        className="block text-xs text-white/65"
                      >
                        Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        autoComplete="name"
                        value={contactName}
                        onChange={(e) => {
                          setContactName(e.target.value);
                          setContactError('');
                          if (contactFieldErrors.name) {
                            setContactFieldErrors((prev) => ({
                              ...prev,
                              name: undefined,
                            }));
                          }
                        }}
                        placeholder="e.g. Alex Morgan"
                        className={`w-full rounded-2xl bg-black border outline-none px-4 py-3 text-sm text-white placeholder:text-white/35 transition-colors ${
                          contactFieldErrors.name
                            ? 'border-white/60'
                            : 'border-white/15 focus:border-white/50'
                        }`}
                      />
                      {contactFieldErrors.name && (
                        <p className="text-xs text-white/80">
                          {contactFieldErrors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="contact-email"
                        className="block text-xs text-white/65"
                      >
                        Email
                      </label>
                      <input
                        id="contact-email"
                        type="text"
                        inputMode="email"
                        autoComplete="email"
                        value={contactEmail}
                        onChange={(e) => {
                          setContactEmail(e.target.value);
                          setContactError('');
                          if (contactFieldErrors.email) {
                            setContactFieldErrors((prev) => ({
                              ...prev,
                              email: undefined,
                            }));
                          }
                        }}
                        placeholder="you@example.com"
                        className={`w-full rounded-2xl bg-black border outline-none px-4 py-3 text-sm text-white placeholder:text-white/35 transition-colors ${
                          contactFieldErrors.email
                            ? 'border-white/60'
                            : 'border-white/15 focus:border-white/50'
                        }`}
                      />
                      {contactFieldErrors.email && (
                        <p className="text-xs text-white/80">
                          {contactFieldErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="contact-message" className="text-white/65">
                        Message
                      </label>
                      <span className="text-white/40">
                        {contactMessage.trim().length < 5
                          ? `${contactMessage.trim().length}/5 min characters`
                          : 'Ready to send'}
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => {
                        setContactMessage(e.target.value);
                        setContactError('');
                        if (contactFieldErrors.message) {
                          setContactFieldErrors((prev) => ({
                            ...prev,
                            message: undefined,
                          }));
                        }
                      }}
                      placeholder="How can our styling or support team help?"
                      className={`w-full rounded-2xl bg-black border outline-none px-4 py-3 text-sm text-white placeholder:text-white/35 resize-none transition-colors ${
                        contactFieldErrors.message
                          ? 'border-white/60'
                          : 'border-white/15 focus:border-white/50'
                      }`}
                    />
                    {contactFieldErrors.message && (
                      <p className="text-xs text-white/80">
                        {contactFieldErrors.message}
                      </p>
                    )}
                  </div>

                  {contactError && (
                    <p role="alert" className="text-xs text-white/90">
                      {contactError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={contactSending}
                    className="bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {contactSending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-white/10 bg-black py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <span className="font-semibold text-white">Wardroby</span>
          <div className="flex items-center gap-6">
            <a
              href="#recommendations"
              className="hover:text-white transition-colors"
            >
              Recommendations
            </a>
            <a href="#designs" className="hover:text-white transition-colors">
              Designs
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Contact us
            </a>
          </div>
          <span>© 2026 Wardroby</span>
        </div>
      </footer>

      {/* 4-Step AI Outfit Recommender Modal */}
      <RecommendationModal
        isOpen={wizardOpen}
        initialValues={wizardValues}
        onClose={() => setWizardOpen(false)}
        onSuccess={handleRecommendationsSuccess}
      />

      {/* Google & Guest Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* AI Stylist Chatbot */}
      <StylistChat
        user={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
      />
    </div>
  );
}
