import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type {
  Top5AIResponse,
  WizardFormValues,
} from '../components/RecommendationModal';

interface FirebaseRuntimeConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface FirebaseServices {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
}

let firebasePromise: Promise<FirebaseServices> | null = null;
let resolvedAuth: Auth | null = null;

async function testConnection(db: Firestore) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export function getFirebase(): Promise<FirebaseServices> {
  if (firebasePromise) return firebasePromise;

  firebasePromise = (async () => {
    const res = await fetch('/api/firebase-config', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Unable to load Firebase runtime configuration.');
    }
    const config = (await res.json()) as FirebaseRuntimeConfig;
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
    const db = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
    const auth = getAuth(app);
    resolvedAuth = auth;
    testConnection(db);
    return { app, db, auth };
  })().catch((err) => {
    firebasePromise = null;
    throw err;
  });

  return firebasePromise;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const activeUser = resolvedAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: activeUser?.uid,
      email: activeUser?.email,
      emailVerified: activeUser?.emailVerified,
      isAnonymous: activeUser?.isAnonymous,
      tenantId: activeUser?.tenantId,
      providerInfo:
        activeUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle() {
  const { auth } = await getFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signInAsGuest() {
  const { auth } = await getFirebase();
  const cred = await signInAnonymously(auth);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signOutUser() {
  const { auth } = await getFirebase();
  await signOut(auth);
}

export async function ensureUserProfile(user: User): Promise<void> {
  const { db } = await getFirebase();
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const authMode = user.isAnonymous ? 'guest' : 'google';
  const rawDisplay = user.isAnonymous
    ? 'Guest Stylist Session'
    : user.displayName?.trim() || 'Wardroby Member';
  const displayName = rawDisplay.slice(0, 80);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        authMode,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        userRef,
        {
          authMode,
          displayName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export interface SavedRecommendationRecord {
  id: string;
  uid: string;
  gender: string;
  bodyType: string;
  heightFrame: string;
  usualSize: string;
  fitPreference: string;
  occasion: string;
  budgetPerPiece: string;
  climate: string;
  preferences: string[];
  extraNotes: string;
  deliveryPreference: string;
  targetDeliveryDate: string;
  stylingOverview: string;
  outfits: Top5AIResponse['recommendations'];
  createdAtMs: number;
}

export async function saveRecommendationRun(
  user: User,
  values: WizardFormValues,
  result: Top5AIResponse
): Promise<string> {
  const { db } = await getFirebase();
  await ensureUserProfile(user);
  const collectionPath = `users/${user.uid}/recommendations`;

  const sanitizedPreferences = values.preferences
    .slice(0, 12)
    .map((p) => String(p).slice(0, 60));

  const sanitizedOutfits = result.recommendations.slice(0, 5).map((o, i) => ({
    rank: Number(o.rank || i + 1),
    outfitTitle: String(o.outfitTitle || '').slice(0, 180),
    piecesIncluded: Array.isArray(o.piecesIncluded)
      ? o.piecesIncluded.slice(0, 6).map((p) => String(p).slice(0, 100))
      : [],
    sellerName: String(o.sellerName || '').slice(0, 100),
    sellerCity: String(o.sellerCity || '').slice(0, 80),
    pricePerPieceEstimate: Number(o.pricePerPieceEstimate || 0),
    totalOutfitEstimate: Number(o.totalOutfitEstimate || 0),
    estimatedDelivery: String(o.estimatedDelivery || '').slice(0, 100),
    fitMatchScore: Number(o.fitMatchScore || 90),
    whyItWorksForYou: String(o.whyItWorksForYou || '').slice(0, 600),
    stylingTip: String(o.stylingTip || '').slice(0, 400),
    referenceDesignId: String(o.referenceDesignId || '').slice(0, 80),
  }));

  try {
    const docRef = await addDoc(collection(db, collectionPath), {
      uid: user.uid,
      gender: String(values.gender || 'Women').slice(0, 40),
      bodyType: String(values.bodyType || 'hourglass').slice(0, 40),
      heightFrame: String(values.heightFrame || 'standard').slice(0, 30),
      usualSize: String(values.usualSize || 'M').slice(0, 16),
      fitPreference: String(values.fitPreference || 'Balanced').slice(0, 40),
      occasion: String(values.occasion || 'Daily & Work').slice(0, 160),
      budgetPerPiece: String(values.budgetPerPiece || 'Flexible').slice(0, 60),
      climate: String(values.climate || 'Mild').slice(0, 60),
      preferences: sanitizedPreferences,
      extraNotes: String(values.extraNotes || '').slice(0, 500),
      deliveryPreference: String(values.deliveryPreference || 'Standard').slice(0, 80),
      targetDeliveryDate: String(values.targetDeliveryDate || '').slice(0, 32),
      stylingOverview: String(result.stylingOverview || 'Curated looks').slice(0, 1200),
      outfits: sanitizedOutfits,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
  }
}

export async function deleteRecommendationRun(
  userId: string,
  recId: string
): Promise<void> {
  const { db } = await getFirebase();
  const path = `users/${userId}/recommendations/${recId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'recommendations', recId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface ChatSource {
  title: string;
  url: string;
}

export interface StoredChatMessage {
  id: string;
  uid: string;
  role: 'user' | 'assistant';
  content: string;
  usedWebSearch: boolean;
  sources: ChatSource[];
  createdAtMs: number;
}

export async function saveChatMessage(
  user: User,
  payload: {
    role: 'user' | 'assistant';
    content: string;
    usedWebSearch?: boolean;
    sources?: ChatSource[];
  }
): Promise<string> {
  const { db } = await getFirebase();
  await ensureUserProfile(user);
  const collectionPath = `users/${user.uid}/chatMessages`;
  const cleanSources = (payload.sources ?? []).slice(0, 5).map((s) => ({
    title: String(s.title || 'Source').slice(0, 200),
    url: String(s.url || '').slice(0, 500),
  }));

  try {
    const docRef = await addDoc(collection(db, collectionPath), {
      uid: user.uid,
      role: payload.role,
      content: String(payload.content || '').slice(0, 4000) || ' ',
      usedWebSearch: Boolean(payload.usedWebSearch),
      sources: cleanSources,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
  }
}

export async function clearUserChatMessages(userId: string): Promise<void> {
  const { db } = await getFirebase();
  const collectionPath = `users/${userId}/chatMessages`;
  try {
    const q = query(
      collection(db, collectionPath),
      where('uid', '==', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, collectionPath);
  }
}
