"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getToken, removeToken } from "../lib/auth";
import { fetchWithAuth } from "../lib/fetchWithAuth";
import { API_BASE } from "../lib/config";
import Image from "next/image";

type User = {
  id: number;
  full_name?: string;
  fullName?: string;
  username: string;
  role: "Admin" | "Doctor" | "Nurse" | "Receptionist";
};

const navItems = [
  {
    section: "Main",
    links: [
      {
        label: "Dashboard",
        href: "/main/dashboard",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="15" height="15">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        label: "Patients",
        href: "/main/patients",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="15" height="15">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Records",
    links: [
      {
        label: "History",
        href: "/main/history",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="15" height="15">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l3 3" />
          </svg>
        ),
      },
      {
        label: "Visits",
        href: "/main/visits",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="15" height="15">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        ),
      },
      {
        label: "Prescriptions",
        href: "/main/prescriptions",
        icon: (
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="15" height="15">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const token = getToken();
        if (!token) {
          console.warn("Sidebar: No token found, skipping fetch.");
          return;
        }

        // Use fetchWithAuth so token refresh happens automatically
        const res = await fetchWithAuth(`${API_BASE}/auth/me`);

        if (res.ok) {
          const result = await res.json();
          const userData = result.data || result;
          setUser(userData);
        } else if (res.status === 401) {
          // Already handled by fetchWithAuth (will redirect to login)
          console.error("Sidebar: Unauthorized");
        } else {
          console.error("Failed to fetch user. Status:", res.status);
        }
      } catch (err) {
        console.error("Failed to fetch user error:", err);
      }
    }
    fetchUser();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleGradient = (role: string) => {
    switch (role) {
      case "Admin":
        return "linear-gradient(135deg, #EF4444, #F97316)";
      case "Doctor":
        return "linear-gradient(135deg, #3B82F6, #8B5CF6)";
      case "Nurse":
        return "linear-gradient(135deg, #10B981, #14B8A6)";
      case "Receptionist":
        return "linear-gradient(135deg, #F59E0B, #EAB308)";
      default:
        return "linear-gradient(135deg, #6B7280, #9CA3AF)";
    }
  };

  const handleLogout = () => {
    removeToken();
    router.push("/auth/login");
  };

  return (
    <aside
      className="w-[210px] flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: "#0D1117", fontFamily: "Arial, sans-serif" }}
    >
      {/* Brand */}
      <div
        className="px-5 py-6"
        style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Image src="/MediLink Logo.png" alt="MediLink Logo" height={40} width={40}/>
          <span
            className="text-white text-lg font-semibold"
            style={{ fontFamily: "Arial" }}
          >
            MediLink
          </span>
        </div>
        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          Barangay Clinic
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.section} className="mb-4">
            <p
              className="text-xs uppercase tracking-widest px-2 mb-1.5 font-medium"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              {group.section}
            </p>
            {group.links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-all duration-150"
                  style={{
                    color: isActive ? "#fff" : "rgba(255,255,255,0.48)",
                    background: isActive ? "rgba(59,130,246,0.18)" : "transparent",
                    border: isActive
                      ? "0.5px solid rgba(59,130,246,0.28)"
                      : "0.5px solid transparent",
                  }}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User / Logout */}
      <div
        className="px-3 py-4"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}
      >
        {user ? (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ background: getRoleGradient(user.role) }}
            >
              {getInitials(user.full_name || user.fullName || user.username)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: "rgba(255,255,255,0.65)" }}>
                {user.full_name || user.fullName || user.username || "User"}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md transition-all"
              style={{ color: "rgba(255,255,255,0.28)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
              title="Logout"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 animate-pulse"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <div className="flex-1">
              <div
                className="h-3 rounded w-20 mb-1.5 animate-pulse"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
              <div
                className="h-2.5 rounded w-14 animate-pulse"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}