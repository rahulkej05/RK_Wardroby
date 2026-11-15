import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { BODY_TYPES, BodyTypeId, HeightFrame } from '../data/wardrobeCatalog';

export type GenderOption =
  | 'Women'
  | 'Men'
  | 'Unisex / Androgynous'
  | 'Prefer not to say';

export interface Top5OutfitRecommendation {
  rank: number;
  outfitTitle: string;
  piecesIncluded: string[];
  sellerName: string;
  sellerCity: string;
  pricePerPieceEstimate: number;
  totalOutfitEstimate: number;
  estimatedDelivery: string;
  fitMatchScore: number;
  whyItWorksForYou: string;
  stylingTip: string;
  referenceDesignId: string;
}

export interface Top5AIResponse {
  stylingOverview: string;
  recommendations: Top5OutfitRecommendation[];
}

export interface WizardFormValues {
  gender: GenderOption;
  bodyType: BodyTypeId;
  heightFrame: HeightFrame;
  usualSize: string;
  fitPreference: string;
  occasion: string;
  budgetPerPiece: string;
  climate: string;
  preferences: string[];
  extraNotes: string;
  deliveryPreference: string;
  targetDeliveryDate: string;
}

interface RecommendationModalProps {
  isOpen: boolean;
  initialValues: WizardFormValues;
  onClose: () => void;
  onSuccess: (values: WizardFormValues, result: Top5AIResponse) => void;
}

const STEP_LABELS = [
  'Gender & Body Profile',
  'Occasion & Budget',
  'Preferences',
  'Delivery & Generate',
];

const GENDER_OPTIONS: GenderOption[] = [
  'Women',
  'Men',
  'Unisex / Androgynous',
  'Prefer not to say',
];

const HEIGHT_OPTIONS: { id: HeightFrame; label: string }[] = [
  { id: 'petite', label: 'Petite (< 5\'4")' },
  { id: 'standard', label: 'Standard (5\'4"–5\'9")' },
  { id: 'tall', label: 'Tall (> 5\'9")' },
];

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const FIT_OPTIONS = ['Tailored / Structured', 'Balanced', 'Relaxed / Draped'];

const OCCASION_PRESETS = [
  'Daily & Work',
  'Evening & Dinner',
  'Wedding / Formal',
  'Travel & Weekend',
  'Party / Social',
  'Seasonal Capsule',
];

const BUDGET_OPTIONS = [
  'Under $150',
  '$150 – $300',
  '$300 – $500',
  '$500+',
  'Flexible',
];

const CLIMATE_OPTIONS = [
  'Warm & Breathable',
  'Mild / Layering',
  'Cold / Outerwear',
];

const MULTI_PREFERENCES = [
  'Monochrome & Neutrals',
  'Earthy & Warm Tones',
  'Natural Fabrics Only',
  'No Polyester',
  'Defined Waist',
  'Structured Shoulders',
  'Flowing / Bias Drape',
  'Wrinkle-Resistant Travel',
  'Petite-Friendly Hems',
  'Longline Silhouettes',
];

const DELIVERY_OPTIONS = [
  'Express (1–2 Business Days)',
  'Standard (3–5 Business Days)',
  'Flexible (1–2 Weeks)',
  'Needed By Specific Date',
];

export function RecommendationModal({
  isOpen,
  initialValues,
  onClose,
  onSuccess,
}: RecommendationModalProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardFormValues>(initialValues);
  const [customOccasion, setCustomOccasion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
      setStep(0);
      setError('');
    }
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const activeBodyLabel =
    BODY_TYPES.find((b) => b.id === values.bodyType)?.label ?? 'Hourglass';

  const togglePreference = (pref: string) => {
    setValues((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter((p) => p !== pref)
        : [...prev.preferences, pref],
    }));
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && !values.occasion.trim() && !customOccasion.trim()) {
      setError('Please pick or enter an occasion.');
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const finalOccasion = customOccasion.trim()
      ? `${values.occasion} (${customOccasion.trim()})`
      : values.occasion;

    const payload = {
      ...values,
      bodyType: activeBodyLabel,
      occasion: finalOccasion,
    };

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate recommendations.');
      }

      onSuccess({ ...values, occasion: finalOccasion }, data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate recommendations right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Get Your Clothes Recommendations"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0A0A0A] border border-white/15 text-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & 4-Step Progress */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-white/50 tabular-nums">
              Step {step + 1} of 4 · {STEP_LABELS[step]}
            </span>
            <h2 className="font-serif-instrument text-2xl sm:text-3xl text-white mt-0.5">
              Get Your Clothes Recommendations
            </h2>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            aria-label="Close questionnaire"
            className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/75 hover:text-white hover:border-white/40 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Bars */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {STEP_LABELS.map((label, idx) => (
            <button
              key={label}
              type="button"
              disabled={loading}
              onClick={() => {
                setError('');
                setStep(idx);
              }}
              className={`flex-1 h-1.5 rounded-full transition-colors cursor-pointer ${
                idx <= step ? 'bg-white' : 'bg-white/15'
              }`}
              aria-label={`Go to step ${idx + 1}: ${label}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* STEP 1: Gender, Body Type, Height Frame, Usual Size, Fit */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="block text-xs font-medium text-white/75">
                  1. Gender / Style Presentation
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GENDER_OPTIONS.map((g) => {
                    const selected = values.gender === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({ ...prev, gender: g }))
                        }
                        className={`px-3 py-2.5 rounded-2xl border text-xs font-medium transition-colors cursor-pointer ${
                          selected
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white/80 border-white/15 hover:border-white/40'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-medium text-white/75">
                  2. What is your body type?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BODY_TYPES.map((profile) => {
                    const selected = values.bodyType === profile.id;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({ ...prev, bodyType: profile.id }))
                        }
                        className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                          selected
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white border-white/15 hover:border-white/35'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {profile.label}
                          </span>
                          {selected && <Check className="w-4 h-4" />}
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            selected ? 'text-black/70' : 'text-white/55'
                          }`}
                        >
                          {profile.proportionSummary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="wiz-height"
                    className="block text-xs font-medium text-white/75 mb-2"
                  >
                    Height Frame
                  </label>
                  <select
                    id="wiz-height"
                    value={values.heightFrame}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        heightFrame: e.target.value as HeightFrame,
                      }))
                    }
                    className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-3.5 py-2.5 text-sm text-white"
                  >
                    {HEIGHT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-black">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wiz-size"
                    className="block text-xs font-medium text-white/75 mb-2"
                  >
                    Usual Size
                  </label>
                  <select
                    id="wiz-size"
                    value={values.usualSize}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        usualSize: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-3.5 py-2.5 text-sm text-white"
                  >
                    {SIZE_OPTIONS.map((sz) => (
                      <option key={sz} value={sz} className="bg-black">
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wiz-fit"
                    className="block text-xs font-medium text-white/75 mb-2"
                  >
                    Fit Preference
                  </label>
                  <select
                    id="wiz-fit"
                    value={values.fitPreference}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        fitPreference: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-3.5 py-2.5 text-sm text-white"
                  >
                    {FIT_OPTIONS.map((fit) => (
                      <option key={fit} value={fit} className="bg-black">
                        {fit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Occasion, Budget Per Piece & Climate */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <span className="block text-xs font-medium text-white/75">
                  3. What is the occasion?
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OCCASION_PRESETS.map((occ) => {
                    const selected = values.occasion === occ;
                    return (
                      <button
                        key={occ}
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({ ...prev, occasion: occ }))
                        }
                        className={`px-3 py-2.5 rounded-2xl border text-xs font-medium transition-colors cursor-pointer ${
                          selected
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white/80 border-white/15 hover:border-white/40'
                        }`}
                      >
                        {occ}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={customOccasion}
                  onChange={(e) => setCustomOccasion(e.target.value)}
                  placeholder="Optional detail (e.g. outdoor art gallery dinner, summer wedding)"
                  className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-4 py-2.5 text-sm text-white placeholder:text-white/35 mt-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="wiz-budget"
                    className="block text-xs font-medium text-white/75 mb-2"
                  >
                    Budget Per Piece
                  </label>
                  <select
                    id="wiz-budget"
                    value={values.budgetPerPiece}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        budgetPerPiece: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-3.5 py-2.5 text-sm text-white"
                  >
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-black">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wiz-climate"
                    className="block text-xs font-medium text-white/75 mb-2"
                  >
                    Weather / Climate
                  </label>
                  <select
                    id="wiz-climate"
                    value={values.climate}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        climate: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-3.5 py-2.5 text-sm text-white"
                  >
                    {CLIMATE_OPTIONS.map((clm) => (
                      <option key={clm} value={clm} className="bg-black">
                        {clm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Multiple-Select Preferences */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/75">
                    4. Style & material preferences (select multiple)
                  </span>
                  <span className="text-xs text-white/50 tabular-nums">
                    {values.preferences.length} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {MULTI_PREFERENCES.map((pref) => {
                    const selected = values.preferences.includes(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => togglePreference(pref)}
                        className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                          selected
                            ? 'bg-white text-black'
                            : 'border border-white/20 text-white/75 hover:border-white/45'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        <span>{pref}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="wiz-notes"
                  className="block text-xs font-medium text-white/75 mb-2"
                >
                  Anything else you want or want to avoid? (optional)
                </label>
                <textarea
                  id="wiz-notes"
                  rows={3}
                  value={values.extraNotes}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      extraNotes: e.target.value,
                    }))
                  }
                  placeholder="e.g. Prefer breathable trousers over skirts, avoid bright prints..."
                  className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-4 py-3 text-sm text-white placeholder:text-white/35 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Delivery Date Preferences & Summary */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <span className="block text-xs font-medium text-white/75">
                  5. Delivery date preference
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DELIVERY_OPTIONS.map((opt) => {
                    const selected = values.deliveryPreference === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            deliveryPreference: opt,
                          }))
                        }
                        className={`p-3 rounded-2xl border text-left text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                          selected
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white/80 border-white/15 hover:border-white/40'
                        }`}
                      >
                        <span>{opt}</span>
                        {selected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="wiz-date"
                  className="block text-xs font-medium text-white/75 mb-2"
                >
                  Target needed-by date (optional)
                </label>
                <input
                  id="wiz-date"
                  type="date"
                  value={values.targetDeliveryDate}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      targetDeliveryDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl bg-black border border-white/15 focus:border-white/50 outline-none px-4 py-2.5 text-sm text-white [color-scheme:dark]"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/75 space-y-1">
                <p>
                  <strong className="text-white">Profile:</strong> {values.gender} ·{' '}
                  {activeBodyLabel} ·{' '}
                  {HEIGHT_OPTIONS.find((h) => h.id === values.heightFrame)?.label} · Size{' '}
                  {values.usualSize} · {values.fitPreference}
                </p>
                <p>
                  <strong className="text-white">Brief:</strong> {values.occasion} ·{' '}
                  {values.budgetPerPiece} · {values.climate}
                </p>
                <p>
                  <strong className="text-white">Preferences:</strong>{' '}
                  {values.preferences.length > 0
                    ? values.preferences.join(', ')
                    : 'Open'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-white/90">
              {error}
            </p>
          )}

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
            {step > 0 ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError('');
                  setStep((s) => Math.max(0, s - 1));
                }}
                className="rounded-full border border-white/25 hover:border-white/60 text-white px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-white/45">4 quick steps</span>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {loading
                    ? 'Generating Top 5 Outfits...'
                    : 'Get Top 5 Recommendations'}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
