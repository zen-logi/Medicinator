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
  createAccountWithEmail(email: string, password: string): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
    return onAuthStateChanged(auth, (nextUser) => {
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
      apiClient,
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
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (loginError) {
          const code =
            loginError instanceof Error && "code" in loginError
              ? String(loginError.code)
              : "";
          if (
            code === "auth/internal-error" ||
            code === "auth/popup-blocked" ||
            code === "auth/popup-closed-by-user" ||
            code === "auth/cancelled-popup-request"
          ) {
            await signInWithRedirect(auth, googleProvider);
            return;
          }
          throw loginError;
        }
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
