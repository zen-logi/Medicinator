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

export function LoginPanel() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleEmailLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email, password);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "ログインに失敗しました",
      );
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
      setError(
        loginError instanceof Error
          ? loginError.message
          : "ログインに失敗しました",
      );
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
              <p>家族の服薬を、落ち着いて一緒に見守る記録アプリ</p>
            </div>
          </div>

          <div className="auth-form">
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
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="auth-submit w-full"
                disabled={!isFirebaseConfigured || busy}
                type="submit"
              >
                <Mail aria-hidden className="h-4 w-4" />
                メールでログイン
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
