import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const configuredDatabaseId = firebaseConfig.firestoreDatabaseId?.trim();
export const db =
  configuredDatabaseId && configuredDatabaseId !== '(default)'
    ? getFirestore(app, configuredDatabaseId)
    : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_ALLOWED_EMAILS = [
  'adminarefin808@gmail.com',
  'a.b.tanvirul808@gmail.com',
];

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_ALLOWED_EMAILS.includes(email.trim().toLowerCase());
}

export function redactSensitiveEmails(text: string): string {
  let cleaned = text;
  for (const adminEmail of ADMIN_ALLOWED_EMAILS) {
    const escaped = adminEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escaped, 'gi'), '[authorized-admin]');
  }
  return cleaned;
}

export function formatLiveSyncError(
  error: unknown,
  fallback = 'Live sync could not be completed. Please sign in with an authorized admin Google account.'
): string {
  const raw = error instanceof Error ? error.message : String(error || '');
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('{')) {
    return fallback;
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('permission') || lower.includes('insufficient')) {
    return 'Live sync permission denied. Please connect an authorized admin Google account.';
  }
  if (lower.includes('offline') || lower.includes('network')) {
    return 'Unable to reach live cloud database. Please check your internet connection.';
  }
  if (lower.includes('unauthorized-domain')) {
    return 'This site domain is not authorized in Firebase Authentication settings.';
  }
  if (lower.includes('popup-closed-by-user')) {
    return 'Google sign-in popup was closed before finishing.';
  }

  // Never expose any email address in Live Sync UI error banners
  const withoutEmails = redactSensitiveEmails(trimmed).replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[redacted]'
  );

  if (withoutEmails.includes('[authorized-admin]') || withoutEmails.includes('[redacted]')) {
    return fallback;
  }
  return withoutEmails || fallback;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  const rawEmail = auth.currentUser?.email;
  const safeEmail = rawEmail && isAuthorizedAdminEmail(rawEmail) ? '[authorized-admin]' : rawEmail;
  const rawMessage = error instanceof Error ? error.message : String(error);

  const errInfo: FirestoreErrorInfo = {
    error: redactSensitiveEmails(rawMessage),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: safeEmail,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email:
            provider.email && isAuthorizedAdminEmail(provider.email)
              ? '[authorized-admin]'
              : provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
