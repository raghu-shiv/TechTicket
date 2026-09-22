"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const result = await signUp.email({
      name,
      email,
      password,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Unable to create account.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-8">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            TT
          </div>

          <h1 className="text-2xl font-semibold">Create your account</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Create your SupportDesk workspace account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>

            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>

            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
