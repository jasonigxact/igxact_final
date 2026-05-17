"use client";

import { useSmoothRouter } from "@/components/UseSmoothRouter";
import { useEffect, useState } from "react";


export default function Navbar() {
  const { push } = useSmoothRouter();
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

  return (
    <div className="w-full flex justify-between items-center px-6 py-4 
    bg-white/5 backdrop-blur-xl border-b border-white/10">

      <h1 className="text-xl font-bold">🚀 Travel Dashboard</h1>

      <div className="flex gap-6 text-sm items-center">

        <button onClick={() => push("/")}>
          Dashboard
        </button>

        <button onClick={() => push("/insights")}>
          Insights
        </button>

        <button onClick={() => push("/monthly")}>
          Monthly
        </button>

        {role === "admin" && (
        <button onClick={() => push("/trips")}>
          Trips
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/calendar")}>
          Calendar
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/crm")}>
          CRM
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/drivers")}>
          Drivers
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/cars")}>
          Cars
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/attendants")}>
          Attendants
        </button>
        )}

        {role === "admin" && (
        <button onClick={() => push("/users")}>
          Users
        </button>
        )}

        {/* 🔥 LOGOUT BUTTON */}
        <button
          onClick={logout}
          className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
        >
          Logout-end
        </button>

      </div>
    </div>
  );
}