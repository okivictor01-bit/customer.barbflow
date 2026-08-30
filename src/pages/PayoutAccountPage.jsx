import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "50515", name: "Moniepoint Microfinance Bank" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

export default function PayoutAccountPage() {
  const { session, loading: authLoading } = useAuth();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!bankCode || accountNumber.length !== 10) return;
    const timeout = setTimeout(() => resolveAccountName(), 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCode, accountNumber]);

  async function loadAccount() {
    const { data } = await supabase
      .from("payout_accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (data) {
      setBankCode(data.bank_code);
      setAccountNumber(data.account_number);
      setAccountName(data.account_name);
    }
    setLoading(false);
  }

  async function resolveAccountName() {
    setResolving(true);
    setResolveError(null);
    setAccountName("");

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-bank-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResolveError(data.error ?? "Could not resolve account name.");
        return;
      }
      setAccountName(data.account_name);
    } catch (err) {
      setResolveError("Could not reach the verification service. You can enter the name manually.");
    } finally {
      setResolving(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const { error: saveError } = await supabase.from("payout_accounts").upsert(
      {
        user_id: session.user.id,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
      },
      { onConflict: "user_id" }
    );

    setSaving(false);

    if (saveError) {
      setError(saveError.message ?? "Could not save bank details.");
      return;
    }
    setMessage("Bank details saved.");
  }

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="auth-wrap">
      <div className="auth-eyebrow">Payout account</div>
      <h1 className="auth-title">Where should we send your earnings?</h1>
      <p className="auth-sub">
        This is used for any affiliate commission you earn. If you're also a
        shop owner, this is separate from your shop's own payout account.
      </p>

      {loading ? (
        <p style={{ color: "var(--parchment-200)", opacity: 0.6 }}>Loading…</p>
      ) : (
        <form onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="bank">Bank</label>
            <select
              id="bank"
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setAccountName("");
                setResolveError(null);
              }}
              required
            >
              <option value="">Select your bank</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="accountNumber">Account number</label>
            <input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, ""));
                setAccountName("");
                setResolveError(null);
              }}
              maxLength={10}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="accountName">
              Account name {resolving && <span style={{ opacity: 0.6, fontWeight: 400 }}>— verifying…</span>}
            </label>
            <input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={resolving ? "Looking up account name…" : "Enter bank + account number to auto-fill"}
              required
            />
            {resolveError && <p className="error-text" style={{ marginTop: 6 }}>{resolveError}</p>}
            {!resolving && !resolveError && accountName && (
              <p className="success-text" style={{ marginTop: 6 }}>
                Verified against {BANKS.find((b) => b.code === bankCode)?.name}.
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={saving || resolving}>
            {saving ? "Saving…" : "Save payout account"}
          </button>

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
        </form>
      )}
    </div>
  );
}
