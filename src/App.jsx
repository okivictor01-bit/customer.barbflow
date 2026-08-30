import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/Home.jsx";
import ShopPage from "./pages/ShopPage.jsx";
import AuthScreen from "./pages/AuthScreen.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import BookingConfirm from "./pages/BookingConfirm.jsx";
import AffiliateDashboard from "./pages/AffiliateDashboard.jsx";
import PayoutAccountPage from "./pages/PayoutAccountPage.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop/:shopId" element={<ShopPage />} />
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/booking/confirm" element={<BookingConfirm />} />
        <Route path="/affiliate" element={<AffiliateDashboard />} />
        <Route path="/payout-account" element={<PayoutAccountPage />} />
      </Routes>
    </div>
  );
}
