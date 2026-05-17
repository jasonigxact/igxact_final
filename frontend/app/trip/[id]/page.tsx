"use client";

import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function TripDetail() {
  const params = useParams();
  const id = params?.id;

  const [trip, setTrip]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    apiFetch(`/trips?trip_id=${id}`)
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Error ${res.status}`);
        }
        return res.json();
      })
      .then(data => { setTrip(data.trips?.[0] || null); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); toast.error("Failed to load trip"); });
  }, [id]);

  if (!id) return <div className="p-6">Invalid Trip ID</div>;
  if (!trip) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">
        Trip #{trip["trip id"]}
      </h1>

      <p>{trip["Customer Name"]}</p>
      <p>{trip["Cust. Contact Number"]}</p>
    </div>
  );
}