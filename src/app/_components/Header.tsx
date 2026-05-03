"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PillBtn, IcoHeart, FONT } from "./ui";
import { loadFavs } from "@/lib/favs";

export function Navbar() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      padding: "20px 120px", display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: "1.15rem", color: "#fff", letterSpacing: "-0.3px", textDecoration: "none", width: 187 }}>
          OPIc Learn
        </Link>
        {(["Bắt đầu", "Tính năng", "Hướng dẫn", "Cấp độ"] as const).map(label => (
          <Link
            key={label}
            href={label === "Hướng dẫn" ? "/guide" : "/"}
            style={{ display: "flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 14, fontWeight: 500, fontFamily: FONT, whiteSpace: "nowrap", textDecoration: "none" }}
          >
            {label}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <path d="M3 5l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
      <PillBtn label="Bắt đầu học" onClick={() => { window.location.href = "/"; }} />
    </nav>
  );
}

export function InnerHeader() {
  const pathname = usePathname();
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    setFavCount(loadFavs().length);
    // Re-check on storage changes (favs saved from other tabs)
    const handler = () => setFavCount(loadFavs().length);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "18px 48px", display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <Link href="/" style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.2px", color: "#fff", textDecoration: "none" }}>
        OPIc Learn
      </Link>

      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,0.07)" }}>
        {([
          ["/", "Trang chủ"],
          ["/guide", "Hướng dẫn"],
          ["/favs", null],
        ] as [string, string | null][]).map(([href, label]) => {
          if (href === "/favs") return (
            <Link
              key={href}
              href="/favs"
              style={{
                padding: "5px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 5,
                background: pathname === "/favs" ? "rgba(255,255,255,0.1)" : "transparent",
                color: pathname === "/favs" ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: "0.8rem", fontWeight: 600, fontFamily: FONT, textDecoration: "none",
              }}
            >
              <IcoHeart filled={favCount > 0} />
              Đã lưu
              {favCount > 0 && (
                <span style={{ background: "rgba(255,255,255,0.14)", borderRadius: 20, fontSize: "0.6rem", fontWeight: 700, padding: "1px 7px" }}>
                  {favCount}
                </span>
              )}
            </Link>
          );
          return (
            <Link
              key={href}
              href={href}
              style={{
                padding: "5px 14px", borderRadius: 8,
                background: pathname === href ? "rgba(255,255,255,0.1)" : "transparent",
                color: pathname === href ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: "0.8rem", fontWeight: 500, fontFamily: FONT, textDecoration: "none",
              }}
            >{label}</Link>
          );
        })}
      </div>
    </header>
  );
}
