import React from "react";
import { Link } from "react-router-dom";

export default function BookingConfirm() {
  return (
    <div className="auth-wrap">
      <div className="auth-eyebrow">Payment received</div>
      <h1 className="auth-title">Almost there</h1>
      <p className="auth-sub">
        We're confirming your payment — this usually takes just a few
        seconds. Once confirmed, your ticket will appear on your tickets
        page, ready for when you arrive at the shop.
      </p>
      <Link to="/tickets" className="btn btn-primary btn-block">
        View my tickets
      </Link>
    </div>
  );
}
