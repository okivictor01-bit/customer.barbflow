import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AffiliateDashboard() {
  const { session, loading: authLoading } = useAuth();
  const [referralCode, setReferralCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [becoming, setBecoming] = useState(false);
  const [error, setError] = useState(null);
  const [referredShops, setReferredShops] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session) loadAffiliateInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadAffiliateInfo() {
    setLoading(true);

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("referral_code, id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (affiliate) {
      setReferralCode(affiliate.referral_code);

      const { data: shops } = await supabase.rpc("get_my_referred_shops");
      setReferredShops(shops ?? []);

      const { data: payouts } = await supabase
        .from("payouts")
        .select("amount, status")
        .eq("payee_type", "affiliate")
        .eq("payee_id", affiliate.id);

      const total = (payouts ?? [])
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      setTotalEarned(total);
    }

    setLoading(false);
  }

  async function handleBecomeAffiliate() {
    setBecoming(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("become_affiliate");
    setBecoming(false);

    if (rpcError) {
      setError(rpcError.message ?? "Could not set up your affiliate account.");
      return;
    }
    setReferralCode(data);
    loadAffiliateInfo();
  }

  function handleCopy() {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="container">
        <p style={{ color: "var(--parchment-200)", opacity: 0.6 }}>Loading…</p>
      </div>
    );
  }

  if (!referralCode) {
    return (
      <div className="auth-wrap">
        <div className="auth-eyebrow">Affiliate program</div>
        <h1 className="auth-title">Bring in shops, earn commission</h1>
        <p className="auth-sub">
          Get a referral link. When a shop signs up through it, you earn 4%
          commission on that shop's first 10 completed bookings — no approval
          needed, you can start right away.
        </p>
        <button className="btn btn-primary btn-block" disabled={becoming} onClick={handleBecomeAffiliate}>
          {becoming ? "Setting up…" : "Get my referral link"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  return (
    <div className="container container-wide">
      <div className="section-header">
        <h2 className="section-title">Your affiliate dashboard</h2>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <p className="card-sub" style={{ marginBottom: 10 }}>
          Share this link with barbershop owners. When they sign up through
          it, you're automatically credited as their referrer.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              flex: 1,
              minWidth: 200,
              padding: "11px 13px",
              borderRadius: 8,
              border: "1px solid var(--charcoal-700)",
              background: "var(--charcoal-900)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {referralLink}
          </div>
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 28 }}>
        <div className="card">
          <div className="card-sub">Shops referred</div>
          <div style={{ fontSize: "1.8rem", fontFamily: "var(--font-display)" }}>
            {referredShops.length}
          </div>
        </div>
        <div className="card">
          <div className="card-sub">Total earned so far</div>
          <div style={{ fontSize: "1.8rem", fontFamily: "var(--font-display)", color: "var(--brass-300)" }}>
            ₦{totalEarned.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title" style={{ fontSize: "1.2rem" }}>
          Shops you've referred
        </h2>
      </div>

      {referredShops.length === 0 ? (
        <div className="empty-state">
          <h3>No shops yet</h3>
          <p>Share your link above — once a shop signs up through it, they'll show up here.</p>
        </div>
      ) : (
        referredShops.map((shop) => (
          <div className="card" key={shop.shop_id}>
            <div className="card-row">
              <div>
                <div className="card-title">{shop.shop_name}</div>
                <span className={`status-pill status-${shop.shop_status}`}>{shop.shop_status}</span>
              </div>
              <div className="card-sub">
                {Math.min(shop.released_ticket_count, 10)}/10 commission-eligible tickets
                {shop.released_ticket_count >= 10 && " — commission window closed"}
              </div>
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: 32 }}>
        <Link to="/payout-account" className="btn btn-ghost">
          Set up payout account
        </Link>
      </div>
    </div>
  );
}
