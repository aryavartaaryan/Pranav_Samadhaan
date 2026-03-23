"use client";

import { useState, useEffect } from "react";
import { useOneSutraAuth } from "@/hooks/useOneSutraAuth";
import ProductForm from "@/components/product/ProductForm";
import Link from "next/link";
import DeleteProductButton from "@/components/product/DeleteProductButton";
import { getMockProducts } from "@/lib/mockStore";
import { ChevronLeft, Store } from "lucide-react";

export default function SellerDashboard() {
  const { user } = useOneSutraAuth();
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [approvedSellers, setApprovedSellers] = useState<any[]>([]);

  // Authorization check
  const isAdmin = user && [
    "studywithpwno.1@gmail.com", 
    "studywithpwno.1@gmaiil.com", 
    "aryavartaayan9@gmail.com"
  ].includes((user as any)?.email);

  // MOCK SELLER DATA from global store
  const myProducts = getMockProducts();

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/seller-requests")
        .then(res => res.json())
        .then(data => {
          const approved = data.filter((app: any) => app.status === "approved");
          setApprovedSellers(approved);
        })
        .catch(err => console.error("Failed to fetch developers:", err));
    }
  }, [isAdmin]);

  // If Admin and no specific seller is selected, show the list
  if (isAdmin && !selectedSeller) {
    return (
      <div className="page-container" style={{ padding: "2rem 1rem", color: "var(--text-main)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--accent-gold)", margin: 0 }}>
            🏪 Admin: Sellers Directory
          </h1>
        </div>

        {approvedSellers.length === 0 ? (
          <div style={{ padding: "2rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px", textAlign: "center" }}>
             <p style={{ color: "var(--text-muted)" }}>No approved sellers found.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {approvedSellers.map((seller: any, i: number) => (
              <button
                key={seller.id}
                onClick={() => setSelectedSeller(seller)}
                className="glass-panel"
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-start", 
                  padding: "1.5rem", 
                  borderRadius: "16px", 
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.5rem" }}>
                  <Store size={22} color="var(--accent-sage)" />
                  <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--text-main)" }}>
                    Seller {i + 1}: {seller.shopName || seller.name || "Unknown"}
                  </span>
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{seller.email}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Seller Dashboard View (for regular sellers, or for admin viewing a specific seller)
  return (
    <div className="page-container" style={{ padding: "2rem 1rem", color: "var(--text-main)" }}>
      {isAdmin && selectedSeller && (
        <button 
          onClick={() => setSelectedSeller(null)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", marginBottom: "1rem" }}
        >
          <ChevronLeft size={18} /> Back to Sellers Directory
        </button>
      )}

      <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--accent-gold)", marginBottom: "2.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1rem" }}>
        🏪 {isAdmin && selectedSeller ? `${selectedSeller.shopName || selectedSeller.name}'s Dashboard` : "My Seller Dashboard"}
      </h1>
      
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3rem" }}>
        <div className="glass-panel-heavy" style={{ flex: "1 1 400px", padding: "2.5rem", borderRadius: "20px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "2rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--accent-sage)" }}>●</span> Add New Product
          </h2>
          <ProductForm initialData={isAdmin ? { isAdmin: true } : undefined} />
        </div>

        <div className="glass-panel" style={{ flex: "1 1 400px", padding: "2.5rem", borderRadius: "20px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "2rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "var(--accent-saffron)" }}>⚡</span> {isAdmin && selectedSeller ? "Sellers Listed Products" : "My Listed Products"}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {myProducts.map((p: any) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <h3 style={{ fontWeight: "bold", color: "var(--text-main)", fontSize: "1.1rem" }}>{p.name}</h3>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{p.category}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ fontWeight: "bold", color: "var(--accent-amber)", fontSize: "1.2rem" }}>₹{p.price.toFixed(2)}</div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                     <Link 
                        href={`/swadesi-product/admin-products/${p.id}/edit`} 
                        style={{ color: "var(--accent-saffron)", fontWeight: "bold", textDecoration: "none", padding: "0.4rem 0.8rem", background: "rgba(255,119,34,0.1)", borderRadius: "6px" }}
                     >
                        Edit
                     </Link>
                     <DeleteProductButton productId={p.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
