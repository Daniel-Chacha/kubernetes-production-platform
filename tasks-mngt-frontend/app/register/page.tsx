
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type ApiError = {
  detail?: unknown;
  accountCreated?: unknown;
};

function getErrorMessage(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data
  ) {
    const detail = (data as ApiError).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (typeof detail === "object" && detail !== null) {
      const messages = Object.values(detail).flatMap((value) =>
        Array.isArray(value)
          ? value.filter(
              (item): item is string => typeof item === "string",
            )
          : typeof value === "string"
            ? [value]
            : [],
      );

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  }

  return "Unable to create your account. Please review your details.";
}

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
        cache: "no-store",
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const accountCreated =
          typeof data === "object" &&
          data !== null &&
          "accountCreated" in data &&
          (data as ApiError).accountCreated === true;

        if (accountCreated) {
          window.location.assign("/login");
          return;
        }

        setError(getErrorMessage(data));
        return;
      }

      window.location.assign("/");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          Taskflow<span>.</span>
        </Link>

        <div className="auth-heading">
          <p className="auth-eyebrow">GET STARTED</p>
          <h1>Create your account</h1>
          <p>Set up your account to organize your tasks.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a strong password"
              minLength={8}
              required
              disabled={isSubmitting}
            />
            <span className="auth-hint">
              Use at least 8 characters. Django may enforce additional
              password requirements.
            </span>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
