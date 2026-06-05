import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import {
  get,
  getDatabase,
  limitToFirst,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  type Database,
} from 'firebase/database';

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  createdAt?: unknown;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
}

const demoEntries: LeaderboardEntry[] = [
  { id: 'demo-1', name: 'Mina', score: 187 },
  { id: 'demo-2', name: 'Jun', score: 214 },
  { id: 'demo-3', name: 'Soo', score: 246 },
  { id: 'demo-4', name: 'You', score: 301 },
];

export function hasFirebaseConfig() {
  return isConfigured;
}

export async function loadLeaderboard() {
  if (!db) {
    const localEntries = readLocalEntries();
    return [...localEntries, ...demoEntries].sort((a, b) => a.score - b.score).slice(0, 10);
  }

  const snapshot = await get(query(ref(db, 'scores'), orderByChild('score'), limitToFirst(10)));

  if (!snapshot.exists()) {
    return [];
  }

  const entries: LeaderboardEntry[] = [];
  snapshot.forEach((child) => {
    entries.push({
      id: child.key ?? crypto.randomUUID(),
      ...(child.val() as Omit<LeaderboardEntry, 'id'>),
    });
  });

  return entries;
}

export async function saveScore(name: string, score: number) {
  const cleanName = name.trim().slice(0, 16) || 'Player';

  if (!db || !auth) {
    const entries = readLocalEntries();
    const nextEntry = { id: crypto.randomUUID(), name: cleanName, score };
    localStorage.setItem('reaction-rank:scores', JSON.stringify([...entries, nextEntry]));
    return nextEntry;
  }

  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const scoreRef = await push(ref(db, 'scores'), {
    name: cleanName,
    score,
    createdAt: serverTimestamp(),
  });

  return { id: scoreRef.key ?? crypto.randomUUID(), name: cleanName, score };
}

function readLocalEntries() {
  const rawEntries = localStorage.getItem('reaction-rank:scores');

  if (!rawEntries) {
    return [];
  }

  try {
    return JSON.parse(rawEntries) as LeaderboardEntry[];
  } catch {
    return [];
  }
}
