import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

export default function Home() {
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [shops, setShops] = useState([]);
  const [featuredShop, setFeaturedShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadFeatured();
    loadShops();
  }, []);

  async function loadFeatured() {
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("featured_shop_id")
      .single();

    if (settings?.featured_shop_id) {
      const { data: shop } = await supabase
        .from("shops")
        .select("*")
        .eq("id", settings.featured_shop_id)
        .eq("status", "active")
        .maybeSingle();
      setFeaturedShop(shop);
    }
  }

  async function loadShops(filterCity, filterArea) {
    setLoading(true);
    let query = supabase.from("shops").select("*").eq("status", "active");

    if (filterCity) query = query.ilike("city", `%${filterCity}%`);
    if (filterArea) query = query.ilike("area", `%${filterArea}%`);

    const { data: shopsData, error } = await query.order("created_at", { ascending: false }).limit(30);
    if (error) {
      console.error("Failed to load shops:", error);
      setShops([]);
      setLoading(false);
      return;
    }

    const shopIds = (shopsData ?? []).map((s) => s.id);
    let ratingsById = {};
    if (shopIds.length > 0) {
      const { data: ratings } = await supabase
        .from("shop_ratings")
        .select("*")
        .in("shop_id", shopIds);
      ratingsById = Object.fromEntries((ratings ?? []).map((r) => [r.shop_id, r]));
    }

    setShops((shopsData ?? []).map((s) => ({ ...s, rating: ratingsById[s.id] ?? null })));
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    setHasSearched(true);
    loadShops(city, area);
  }

  return (
    <div className="container container-wide">
      <div className="hero">
        <h1 className="hero-title">Find a barbershop worth the trip</h1>
        <p className="hero-sub">Search by city and area, see real prices, book ahead.</p>

        <form onSubmit={handleSearch} className="search-bar">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (e.g. Lagos)"
          />
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Area (e.g. Ikeja)"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {!hasSearched && featuredShop && (
        <Link to={`/shop/${featuredShop.id}`} className="featured-banner">
          <span className="featured-label">Featured</span>
          <h3>{featuredShop.name}</h3>
          <span className="card-sub">
            {featuredShop.city}, {featuredShop.area}
          </span>
        </Link>
      )}

      <div className="section-header">
        <h2 className="section-title">{hasSearched ? "Search results" : "Recently added shops"}</h2>
      </div>

      {loading ? (
        <p style={{ color: "var(--parchment-200)", opacity: 0.6 }}>Loading…</p>
      ) : shops.length === 0 ? (
        <div className="empty-state">
          <h3>No shops found</h3>
          <p>Try a different city or area, or check back soon as more shops join.</p>
        </div>
      ) : (
        <div className="shop-grid">
          {shops.map((shop) => (
            <Link to={`/shop/${shop.id}`} key={shop.id} className="shop-card">
              <h3>{shop.name}</h3>
              <p className="card-sub">
                {shop.city}, {shop.area}
              </p>
              {shop.rating ? (
                <p className="rating-line">
                  ★ {shop.rating.avg_rating} ({shop.rating.review_count} review
                  {shop.rating.review_count === 1 ? "" : "s"})
                </p>
              ) : (
                <p className="rating-line" style={{ opacity: 0.5 }}>
                  No reviews yet
                </p>
              )}
              {shop.description && <p className="card-sub">{shop.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
