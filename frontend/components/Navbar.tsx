"use client";

import { useSmoothRouter } from "@/components/UseSmoothRouter";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";


export default function Navbar() {
  const { push } = useSmoothRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    window.location.href = "/login";
  };

  useEffect(() => {
    const storedRole = sessionStorage.getItem("role");
    setRole(storedRole);
  }, []);

  const isActive = (path: string) => pathname === path;

  const navBtnClass = (path: string) =>
    `px-3 py-1.5 rounded-lg transition-colors ${
      isActive(path)
        ? "bg-white/15 text-white font-semibold"
        : "text-white/80 hover:text-white hover:bg-white/8"
    }`;

  return (
    <div className="w-full flex justify-between items-center px-6 py-4 
    bg-white/5 backdrop-blur-xl border-b border-white/10">

      <h1 className="text-xl font-bold">🚀 Travel Dashboard</h1>

      <div className="flex gap-2 text-sm items-center">

        <button onClick={() => push("/")} className={navBtnClass("/")}>
          Dashboard
        </button>

        <button onClick={() => push("/insights")} className={navBtnClass("/insights")}>
          Insights
        </button>

        <button onClick={() => push("/monthly")} className={navBtnClass("/monthly")}>
          Monthly
        </button>

        {role === "admin" && (
        <button onClick={() => push("/trips")} className={navBtnClass("/trips")}>
          Trips
        </button>
        )}

        <button onClick={() => push("/expenses")} className={navBtnClass("/expenses")}>
          Expenses
        </button>
        <button onClick={() => push("/calendar")} className={navBtnClass("/calendar")}>
          Calendar
        </button>

        {role === "admin" && (
        <button onClick={() => push("/crm")} className={navBtnClass("/crm")}>
          CRM
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/drivers")} className={navBtnClass("/drivers")}>
          Drivers
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/cars")} className={navBtnClass("/cars")}>
          Cars
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/attendants")} className={navBtnClass("/attendants")}>
          Attendants
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/users")} className={navBtnClass("/users")}>
          Users
        </button>
        )}

        {/* 🔥 LOGOUT BUTTON */}
        <button
          onClick={logout}
          className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 ml-2"
        >
          Logout-end
        </button>

      </div>
    </div>
  );
}
