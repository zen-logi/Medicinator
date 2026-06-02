import { FormEvent, useState } from "react";
import {
  CalendarCheck,
  HeartPulse,
  Mail,
  Pill,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { isFirebaseConfigured } from "@/shared/api/firebase";
import { useAuth } from "./AuthProvider";

function getLoginErrorMessage(loginError: unknown) {
  if (!(loginError instanceof Error)) {
    return "ログインに失敗しました。時間をおいてもう一度お試しください";
  }

  const code = "code" in loginError ? String(loginError.code) : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが違います";
    case "auth/missing-email":
      return "メールアドレスを入力してください";
    case "auth/missing-password":
      return "パスワードを入力してください";
    case "auth/email-already-in-use":
      return "このメールアドレスはすでに登録されています。ログインを選んでください";
    case "auth/weak-password":
      return "パスワードは6文字以上で入力してください";
    case "auth/operation-not-allowed":
      return "このログイン方法が Firebase で有効になっていません";
    case "auth/popup-closed-by-user":
      return "Google ログインがキャンセルされました";
    case "auth/unauthorized-domain":
      return "このドメインは Firebase Auth で許可されていません";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/invalid-api-key":
    case "auth/internal-error":
      return "Firebase の設定を確認してください。API key、Auth domain、Authorized domains が一致していない可能性があります";
    default:
      return "ログインに失敗しました。設定または入力内容を確認してください";
  }
}

export function LoginPanel() {
  const {
    authError,
    createAccountWithEmail,
    signInWithEmail,
    signInWithGoogle,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const visibleError = error ?? authError;

  async function handleEmailLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await createAccountWithEmail(email, password);
        return;
      }
      await signInWithEmail(email, password);
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page min-h-screen overflow-hidden px-5 py-6 text-foreground sm:px-8">
      <div className="auth-glow auth-glow-coral" aria-hidden />
      <div className="auth-glow auth-glow-mint" aria-hidden />
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.03fr_0.97fr]">
        <section className="motion-enter hidden lg:block">
          <div className="auth-copy">
            <div className="auth-brand-mark">
              <HeartPulse aria-hidden className="h-6 w-6" />
            </div>
            <p className="auth-kicker">
              <Sparkles aria-hidden className="h-4 w-4" />
              family medication care
            </p>
            <h1>Medicinator</h1>
            <p>
              服薬の予定と記録を、家族で同じ温度感のまま見守る。忘れないことを、少しやさしい体験にする。
            </p>
          </div>
        </section>

        <section className="auth-card motion-sheet" aria-label="ログイン">
          <div className="auth-visual" aria-hidden>
            <div className="auth-visual-header">
              <div>
                <span>Today</span>
                <strong>朝食後</strong>
              </div>
              <div className="auth-visual-check">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="auth-dose-row auth-dose-row-primary">
              <span className="auth-dose-icon">
                <Pill className="h-4 w-4" />
              </span>
              <div>
                <strong>アムロジピン</strong>
                <span>5mg / 1錠</span>
              </div>
            </div>
            <div className="auth-dose-row">
              <span className="auth-dose-icon">
                <HeartPulse className="h-4 w-4" />
              </span>
              <div>
                <strong>メトホルミン</strong>
                <span>250mg / 1錠</span>
              </div>
            </div>
          </div>

          <div className="auth-form-header">
            <div className="auth-brand-mark lg:hidden">
              <HeartPulse aria-hidden className="h-5 w-5" />
            </div>
            <div>
              <p className="auth-kicker lg:hidden">
                <Sparkles aria-hidden className="h-4 w-4" />
                family medication care
              </p>
              <h1>Medicinator</h1>
              <p>
                {mode === "signup"
                  ? "アカウント作成後に Family を作るか、招待コードで参加できます"
                  : "家族の服薬を、落ち着いて一緒に見守る記録アプリ"}
              </p>
            </div>
          </div>

          <div className="auth-form">
            <div className="mb-4 grid grid-cols-2 rounded-lg bg-white/70 p-1 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <button
                className={`motion-press rounded-md px-3 py-2 transition-colors ${
                  mode === "login"
                    ? "bg-white text-pink-700 shadow-[0_8px_18px_rgba(234,115,149,0.14)]"
                    : "text-zinc-500 hover:text-pink-700"
                }`}
                onClick={() => {
                  setError(null);
                  setMode("login");
                }}
                type="button"
              >
                ログイン
              </button>
              <button
                className={`motion-press rounded-md px-3 py-2 transition-colors ${
                  mode === "signup"
                    ? "bg-white text-pink-700 shadow-[0_8px_18px_rgba(234,115,149,0.14)]"
                    : "text-zinc-500 hover:text-pink-700"
                }`}
                onClick={() => {
                  setError(null);
                  setMode("signup");
                }}
                type="button"
              >
                アカウント作成
              </button>
            </div>
            {!isFirebaseConfigured && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Firebase の環境変数を設定するとログインできます。
              </div>
            )}
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <label className="block space-y-2 text-sm font-semibold">
                <span>メールアドレス</span>
                <Input
                  autoComplete="email"
                  className="auth-input"
                  disabled={!isFirebaseConfigured || busy}
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                <span>パスワード</span>
                <Input
                  autoComplete="current-password"
                  className="auth-input"
                  disabled={!isFirebaseConfigured || busy}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </label>
              {visibleError && (
                <p className="text-sm text-destructive">{visibleError}</p>
              )}
              <Button
                className="auth-submit w-full"
                disabled={!isFirebaseConfigured || busy}
                type="submit"
              >
                <Mail aria-hidden className="h-4 w-4" />
                {mode === "signup"
                  ? "メールでアカウント作成"
                  : "メールでログイン"}
              </Button>
            </form>
            <Button
              className="auth-google mt-3 w-full"
              disabled={!isFirebaseConfigured || busy}
              onClick={handleGoogleLogin}
              type="button"
              variant="outline"
            >
              <ShieldCheck aria-hidden className="h-4 w-4" />
              Google でログイン
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
