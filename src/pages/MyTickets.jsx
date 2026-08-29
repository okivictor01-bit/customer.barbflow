import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function MyTickets() {
  const { session, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [disputeTicketId, setDisputeTicketId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [reviewTicketId, setReviewTicketId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const loadTickets = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from("tickets")
      .select("*, shops(name), services(name), reviews(id)")
      .eq("customer_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Failed to load tickets:", error);
    setTickets(data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function runAction(ticketId, rpcName, extraArgs = {}) {
    setActioningId(ticketId);
    setActionError(null);
    const { error } = await supabase.rpc(rpcName, { p_ticket_id: ticketId, ...extraArgs });
    setActioningId(null);
    if (error) {
      setActionError(error.message ?? "Action failed. Try again.");
      return;
    }
    loadTickets();
  }

  async function submitDispute(ticketId) {
    if (!disputeReason.trim()) return;
    setActioningId(ticketId);
    setActionError(null);
    const { error } = await supabase.rpc("open_dispute", {
      p_ticket_id: ticketId,
      p_reason: disputeReason,
    });
    setActioningId(null);
    if (error) {
      setActionError(error.message ?? "Could not open dispute.");
      return;
    }
    setDisputeTicketId(null);
    setDisputeReason("");
    loadTickets();
  }

  async function submitReview(ticket) {
    setActioningId(ticket.id);
    setActionError(null);
    const { error } = await supabase.from("reviews").insert({
      ticket_id: ticket.id,
      shop_id: ticket.shop_id,
      customer_id: session.user.id,
      rating: reviewRating,
      comment: reviewComment || null,
    });
    setActioningId(null);
    if (error) {
      setActionError(error.message ?? "Could not submit review.");
      return;
    }
    setReviewTicketId(null);
    setReviewComment("");
    setReviewRating(5);
    loadTickets();
  }

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="container">
        <p style={{ color: "var(--parchment-200)", opacity: 0.6 }}>Loading your tickets…</p>
      </div>
    );
  }

  return (
    <div className="container container-wide">
      <div className="section-header">
        <h2 className="section-title">My tickets</h2>
      </div>

      {actionError && <p className="error-text">{actionError}</p>}

      {tickets.length === 0 ? (
        <div className="empty-state">
          <h3>No tickets yet</h3>
          <p>When you book a service, it'll show up here.</p>
        </div>
      ) : (
        tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            busy={actioningId === ticket.id}
            onSubmit={() => runAction(ticket.id, "submit_ticket")}
            onConfirm={() => runAction(ticket.id, "confirm_ticket")}
            onOpenDispute={() => setDisputeTicketId(ticket.id)}
            disputeOpen={disputeTicketId === ticket.id}
            disputeReason={disputeReason}
            setDisputeReason={setDisputeReason}
            onSubmitDispute={() => submitDispute(ticket.id)}
            onCancelDispute={() => setDisputeTicketId(null)}
            reviewOpen={reviewTicketId === ticket.id}
            onOpenReview={() => setReviewTicketId(ticket.id)}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewComment={reviewComment}
            setReviewComment={setReviewComment}
            onSubmitReview={() => submitReview(ticket)}
            onCancelReview={() => setReviewTicketId(null)}
          />
        ))
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  busy,
  onSubmit,
  onConfirm,
  onOpenDispute,
  disputeOpen,
  disputeReason,
  setDisputeReason,
  onSubmitDispute,
  onCancelDispute,
  reviewOpen,
  onOpenReview,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  onSubmitReview,
  onCancelReview,
}) {
  const shortId = ticket.id.slice(0, 8);
  const canDispute =
    !ticket.customer_confirmed_at && ["approved", "customer_confirmed", "shop_confirmed"].includes(ticket.status);
  const canReview = ticket.customer_confirmed_at && !ticket.reviews?.length;

  return (
    <div className="ticket-stub">
      <div className="ticket-stub-side">
        <span className={`status-pill status-${statusPillClass(ticket.status)}`}>
          {formatStatus(ticket.status)}
        </span>
        <span className="ticket-stub-id">#{shortId}</span>
      </div>
      <div className="ticket-stub-body" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div className="ticket-info">
            <h4>{ticket.services?.name || "Service"}</h4>
            <div className="ticket-meta">{ticket.shops?.name || "Shop"}</div>
          </div>
          <div className="ticket-amount">₦{Number(ticket.amount).toLocaleString()}</div>
        </div>

        <div className="ticket-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
          {ticket.status === "paid" && (
            <button className="btn btn-primary" disabled={busy} onClick={onSubmit}>
              I've arrived — submit ticket
            </button>
          )}

          {["approved", "customer_confirmed", "shop_confirmed"].includes(ticket.status) &&
            !ticket.customer_confirmed_at && (
              <button className="btn btn-primary" disabled={busy} onClick={onConfirm}>
                Mark service complete
              </button>
            )}

          {ticket.customer_confirmed_at && ticket.status !== "released" && (
            <span className="ticket-meta">Waiting on shop to confirm (or auto-releases in 24h)</span>
          )}

          {canDispute && !disputeOpen && (
            <button className="btn btn-ghost" disabled={busy} onClick={onOpenDispute}>
              Something wrong? Open a dispute
            </button>
          )}

          {canReview && !reviewOpen && (
            <button className="btn btn-ghost" disabled={busy} onClick={onOpenReview}>
              Leave a review
            </button>
          )}
        </div>

        {disputeOpen && (
          <div style={{ marginTop: 14, borderTop: "1px solid var(--charcoal-700)", paddingTop: 14 }}>
            <div className="field">
              <label htmlFor={`dispute-${ticket.id}`}>What went wrong?</label>
              <textarea
                id={`dispute-${ticket.id}`}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain briefly — an admin will review this."
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-danger" disabled={busy} onClick={onSubmitDispute}>
                Submit dispute
              </button>
              <button className="btn btn-ghost" onClick={onCancelDispute}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {reviewOpen && (
          <div style={{ marginTop: 14, borderTop: "1px solid var(--charcoal-700)", paddingTop: 14 }}>
            <div className="field">
              <label htmlFor={`rating-${ticket.id}`}>Rating</label>
              <select
                id={`rating-${ticket.id}`}
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)}
                    {"☆".repeat(5 - n)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`comment-${ticket.id}`}>Comment (optional)</label>
              <textarea
                id={`comment-${ticket.id}`}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={busy} onClick={onSubmitReview}>
                Submit review
              </button>
              <button className="btn btn-ghost" onClick={onCancelReview}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatStatus(status) {
  return status.replace(/_/g, " ");
}

function statusPillClass(status) {
  if (status === "released") return "active";
  if (["refunded", "disputed"].includes(status)) return "suspended";
  return "pending";
}
