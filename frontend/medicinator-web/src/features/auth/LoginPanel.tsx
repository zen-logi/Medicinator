import { FormEvent, useState } from "react";
import { HeartPulse, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/card";
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
      setError(loginError instanceof Error ? loginError.message : "ログインに失敗しました");
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
      setError(loginError instanceof Error ? loginError.message : "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse aria-hidden className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Medicinator</CardTitle>
            <CardDescription>家族の服薬を、落ち着いて一緒に見守るための記録アプリです。</CardDescription>
          </CardHeader>
          <CardContent>
            {!isFirebaseConfigured && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Firebase の環境変数を設定するとログインできます。
              </div>
            )}
            <form className="space-y-3" onSubmit={handleEmailLogin}>
              <label className="block space-y-1.5 text-sm font-medium">
                <span>メールアドレス</span>
                <Input
                  autoComplete="email"
                  disabled={!isFirebaseConfigured || busy}
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                <span>パスワード</span>
                <Input
                  autoComplete="current-password"
                  disabled={!isFirebaseConfigured || busy}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={!isFirebaseConfigured || busy} type="submit">
                <Mail aria-hidden className="h-4 w-4" />
                メールでログイン
              </Button>
            </form>
            <Button
              className="mt-3 w-full"
              disabled={!isFirebaseConfigured || busy}
              onClick={handleGoogleLogin}
              type="button"
              variant="outline"
            >
              <ShieldCheck aria-hidden className="h-4 w-4" />
              Google でログイン
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
