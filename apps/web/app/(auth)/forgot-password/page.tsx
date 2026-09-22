"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Reset your password</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we'll send you a password reset link.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-lg bg-primary/10 p-4 text-sm text-primary">
            If an account exists for this email, you'll receive reset
            instructions.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>

              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Send reset link
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
