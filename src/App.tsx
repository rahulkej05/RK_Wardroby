import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  ArrowRight,
  Calendar,
  Check,
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

const DEFAULT_WIZARD_VALUES: WizardFormValues = {
  gender: 'Women',
  bodyType: 'hourglass',
  heightFrame: 'standard',
  usualSize: 'M',
  fitPreference: 'Balanced',
  occasion: 'Daily & Work',
  budgetPerPiece: '$250 – $500',
  climate: 'Mild / Layering',
  preferences: ['Monochrome & Neutrals', 'Natural Fabrics Only'],
  extraNotes: '',
  deliveryPreference: 'Standard (3–5 Business Days)',
  targetDeliveryDate: '',
};

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
  const [contactRefId, setContactRefId] = useState<string | null>(null);

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
                budgetPerPiece: String(data.budgetPerPiece || '$250 – $500'),
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
    setContactSending(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          message: contactMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not send message.');
      }
      setContactRefId(data.referenceId);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      setContactError(
        err instanceof Error ? err.message : 'Unable to send message.'
      );
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
            Answer four quick steps — our AI curates your top 5 outfits from independent sellers.
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
                Tell us your body type, height frame, usual size, budget per piece, occasion, style preferences, and delivery timeline. Gemini AI selects five complete outfits matched across sellers.
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
                              ~${outfit.pricePerPieceEstimate}/piece · ${outfit.totalOutfitEstimate} look
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
                          <span className="inline-flex items-center gap-1.5 text-white/80 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{outfit.estimatedDelivery}</span>
                          </span>
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
                        Sellers:{' '}
                        {design.sellerListings
                          .map((s) => `${s.sellerName} ($${s.price})`)
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
            <div className="flex items-center gap-2.5 text-sm text-white/80 pt-2">
              <Mail className="w-4 h-4 text-white/60" />
              <span>hello@wardroby.app</span>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-white/15">
              {contactRefId ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-white text-black mx-auto flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-base font-medium text-white">
                    Message sent ({contactRefId})
                  </p>
                  <p className="text-xs text-white/60">
                    We will reply to your email shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactRefId(null)}
                    className="bg-white text-black rounded-full px-5 py-2 text-xs font-medium cursor-pointer"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleContactSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      aria-label="Your name"
                      className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-4 py-3 text-sm text-white placeholder:text-white/35"
                    />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Your email"
                      aria-label="Your email"
                      className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-4 py-3 text-sm text-white placeholder:text-white/35"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Your message"
                    aria-label="Your message"
                    className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-4 py-3 text-sm text-white placeholder:text-white/35 resize-none"
                  />
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
