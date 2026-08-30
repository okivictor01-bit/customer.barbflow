import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ShopPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [shop, setShop] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(null);
  const [loyaltyProgress, setLoyaltyProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingServiceId, setBookingServiceId] = useState(null);
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    loadShop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function loadShop() {
    setLoading(true);

    const { data: shopData } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .eq("status", "active")
      .maybeSingle();
    setShop(shopData);

    const { data: photosData } = await supabase
      .from("shop_photos")
      .select("*")
      .eq("shop_id", shopId)
      .order("position", { ascending: true });
    setPhotos(photosData ?? []);

    // Query the price-respecting view, not the raw services table — this
    // is what actually honors each shop's prices_public setting.
    const { data: servicesData } = await supabase
      .from("services_public")
      .select("*")
      .eq("shop_id", shopId);
    setServices(servicesData ?? []);

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(20);
    setReviews(reviewsData ?? []);

    const { data: ratingData } = await supabase
      .from("shop_ratings")
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();
    setRating(ratingData);

    if (session) {
      const { data: loyaltyData } = await supabase
        .from("loyalty_progress")
        .select("visit_count")
        .eq("shop_id", shopId)
        .eq("customer_id", session.user.id)
        .maybeSingle();
      setLoyaltyProgress(loyaltyData?.visit_count ?? 0);
    }

    setLoading(false);
  }

  async function handleBook(service) {
    if (!session) {
      navigate("/login", { state: { redirectTo: `/shop/${shopId}` } });
      return;
    }

    setBookingServiceId(service.id);
    setBookingError(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initialize-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ shop_id: shopId, service_id: service.id }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.error ?? "Could not start payment. Try again.");
        setBookingServiceId(null);
        return;
      }

      window.location.href = data.authorization_url;
    } catch (err) {
      setBookingError("Could not reach the payment service. Try again.");
      setBookingServiceId(null);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <p style={{ color: "var(--parchment-200)", opacity: 0.6 }}>Loading…</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container">
        <div className="empty-state">
          <h3>Shop not found</h3>
          <p>It may have been removed or isn't currently active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container container-wide">
      <h1 className="shop-page-title">{shop.name}</h1>
      <p className="card-sub" style={{ marginBottom: 6 }}>
        {shop.address ? `${shop.address}, ` : ""}
        {shop.city}, {shop.area}
      </p>
      {rating && (
        <p className="rating-line" style={{ marginBottom: 16 }}>
          ★ {rating.avg_rating} ({rating.review_count} review{rating.review_count === 1 ? "" : "s"})
        </p>
      )}
      {shop.description && <p style={{ marginBottom: 28, color: "var(--parchment-200)" }}>{shop.description}</p>}

      {photos.length > 0 && (
        <div className="photo-strip">
          {photos.map((p) => (
            <img key={p.id} src={p.url} alt="" onError={(e) => (e.target.style.display = "none")} />
          ))}
        </div>
      )}

      <div className="section-header">
        <h2 className="section-title">Services</h2>
      </div>

      {session && loyaltyProgress !== null && services.some((s) => s.category === "haircut") && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--brass-400)" }}>
          <p style={{ margin: 0 }}>
            {loyaltyProgress >= 3
              ? "Your free haircut is ready — look for it on your tickets page next time you visit."
              : `${loyaltyProgress}/3 haircut visits here — your 4th haircut at this shop is free.`}
          </p>
        </div>
      )}

      {bookingError && <p className="error-text">{bookingError}</p>}

      {services.length === 0 ? (
        <div className="empty-state">
          <h3>No services listed yet</h3>
          <p>Check back soon.</p>
        </div>
      ) : (
        services.map((service) => (
          <div className="card" key={service.id}>
            <div className="card-row">
              <div>
                <div className="card-title">{service.name}</div>
                {service.description && <div className="card-sub">{service.description}</div>}
                {service.duration_minutes && <div className="card-sub">{service.duration_minutes} min</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {service.price !== null ? (
                  <span className="price-tag">₦{Number(service.price).toLocaleString()}</span>
                ) : (
                  <span className="card-sub">Price on visit</span>
                )}
                <button
                  className="btn btn-primary"
                  disabled={bookingServiceId === service.id}
                  onClick={() => handleBook(service)}
                >
                  {bookingServiceId === service.id ? "Starting…" : "Book & pay"}
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="section-header" style={{ marginTop: 32 }}>
        <h2 className="section-title">Reviews</h2>
      </div>

      {reviews.length === 0 ? (
        <p className="card-sub">No reviews yet — be the first after your visit.</p>
      ) : (
        reviews.map((review) => (
          <div className="card" key={review.id}>
            <p className="rating-line" style={{ marginBottom: 6 }}>
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </p>
            {review.comment && <p style={{ margin: 0 }}>{review.comment}</p>}
          </div>
        ))
      )}
    </div>
  );
}
