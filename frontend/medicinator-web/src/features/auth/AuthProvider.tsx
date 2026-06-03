import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { createApiClient, type ApiClient } from "@/shared/api/http-client";
import {
  getFirebaseAuth,
  googleProvider,
  isFirebaseConfigured,
} from "@/shared/api/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authError: string | null;
  apiClient: ApiClient;
  clearAuthError(): void;
  createAccountWithEmail(email: string, password: string): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = getFirebaseAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    const firebaseAuth = auth;

    void setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
      setAuthError(
        "ブラウザのストレージが利用できないためログイン状態を保存できません",
      );
    });

    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, [auth]);

  const apiClient = useMemo(
    () =>
      createApiClient(async () => {
        return user?.getIdToken();
      }),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authError,
      apiClient,
      clearAuthError() {
        setAuthError(null);
      },
      async createAccountWithEmail(email, password) {
        if (!auth) {
          throw new Error("Firebase Auth is not configured.");
        }
        setAuthError(null);
        await createUserWithEmailAndPassword(auth, email, password);
      },
      async signInWithEmail(email, password) {
        if (!auth) {
          throw new Error("Firebase Auth is not configured.");
        }
        setAuthError(null);
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signInWithGoogle() {
        if (!auth) {
          throw new Error("Firebase Auth is not configured.");
        }
        setAuthError(null);
        await signInWithPopup(auth, googleProvider);
      },
      async logout() {
        if (auth) {
          await signOut(auth);
        }
      },
    }),
    [apiClient, auth, authError, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
