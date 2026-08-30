import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { session } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark">✂</span> BarbFlow
      </Link>
      <div className="topbar-actions">
        {session ? (
          <>
            <Link to="/affiliate" className="btn btn-ghost">
              Affiliate
            </Link>
            <Link to="/tickets" className="btn btn-ghost">
              My tickets
            </Link>
            <button className="btn btn-ghost" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
