import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

export default function AuthScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || "/";

  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from("users").update({ full_name: fullName, phone }).eq("id", data.user.id);
        }

        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
          setMode("signin");
        } else {
          navigate(redirectTo);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate(redirectTo);
      }
    } catch (err) {
      setError(err.message ?? "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-eyebrow">BarbFlow</div>
      <h1 className="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="auth-sub">
        {mode === "signup"
          ? "You can browse and search freely — an account is only needed to book."
          : "Sign in to book, track tickets, and leave reviews."}
      </p>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <>
            <div className="field">
              <label htmlFor="fullName">Your name</label>
              <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}
      </form>

      <p className="auth-switch">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("signin")}>
              Sign in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button type="button" onClick={() => setMode("signup")}>
              Create an account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
