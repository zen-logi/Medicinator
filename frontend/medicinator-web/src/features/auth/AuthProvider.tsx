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
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithRedirect,
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
  apiClient: ApiClient;
  clearAuthError(): void;
  createAccountWithEmail(email: string, password: string): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const googleRedirectSessionKey = "medicinator:google-redirect";

function isGoogleRedirectPending() {
  try {
    return sessionStorage.getItem(googleRedirectSessionKey) === "1";
  } catch {
    return false;
  }
}

function markGoogleRedirectPending() {
  try {
    sessionStorage.setItem(googleRedirectSessionKey, "1");
  } catch {
    // セッションストレージが使えない場合も redirect 自体は Firebase に委ねる
  }
}

function clearGoogleRedirectPending() {
  try {
    sessionStorage.removeItem(googleRedirectSessionKey);
  } catch {
    // セッションストレージが使えないブラウザでは削除不要
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = getFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    void setPersistence(auth, browserLocalPersistence);
    void getRedirectResult(auth).catch((error: unknown) => {
      console.error("Firebase redirect sign-in failed", error);
    });

<<<<<<< Updated upstream
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
=======
    async function initializeAuth() {
      setLoading(true);
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
        if (isGoogleRedirectPending()) {
          clearGoogleRedirectPending();
          const redirectResult = await getRedirectResult(firebaseAuth);
          if (!disposed && redirectResult?.user) {
            setUser(redirectResult.user);
            setAuthError(null);
            setLoading(false);
          }
        }
      } catch (error) {
        if (!disposed) {
          setAuthError(getRedirectErrorMessage(error));
          setLoading(false);
        }
      }

      if (!disposed) {
        unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
          setUser(nextUser);
          setLoading(false);
        });
      }
    }

    void initializeAuth();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
>>>>>>> Stashed changes
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
      apiClient,
      clearAuthError() {
        setAuthError(null);
      },
      async createAccountWithEmail(email, password) {
        if (!auth) {
          throw new Error("Firebase Auth is not configured.");
        }
        await createUserWithEmailAndPassword(auth, email, password);
      },
      async signInWithEmail(email, password) {
        if (!auth) {
          throw new Error("Firebase Auth is not configured.");
        }
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signInWithGoogle() {
        if (!auth) {
          throw new Error("Firebase Auth is not configured.");
        }
<<<<<<< Updated upstream
        await signInWithRedirect(auth, googleProvider);
=======
        setAuthError(null);
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          const code =
            error instanceof Error && "code" in error ? String(error.code) : "";
          if (
            code === "auth/popup-blocked" ||
            code === "auth/popup-closed-by-user"
          ) {
            markGoogleRedirectPending();
            await signInWithRedirect(auth, googleProvider);
            return;
          }
          throw error;
        }
>>>>>>> Stashed changes
      },
      async logout() {
        if (auth) {
          await signOut(auth);
        }
      },
    }),
    [apiClient, auth, loading, user],
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
