"use client";

import { useMemo, useState, useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

type Slot = {
  id: string;
  date: string;
  time: string;
  locked: boolean;
};

// --- Mode switch + services (Mode 2) ---
type Service = { id: string; name: string; duration_min: number; active: boolean };
const [mode, setMode] = useState<1 | 2>(1);
const [services, setServices] = useState<Service[]>([]);
const [serviceId, setServiceId] = useState<string>("");

useMemo(() => {}, [mode]); // keep React happy

async function loadMode() {
  try {
    const r = await fetch("/api/rs-settings");
    const j = await r.json();
    if (r.ok && (j.reservationMode === 1 || j.reservationMode === 2))
      setMode(j.reservationMode);
  } catch {}
}
async function loadServices() {
  try {
    const r = await fetch("/api/services");
    const j = await r.json();
    if (r.ok) setServices((j.services || []).filter((s: Service) => s.active !== false));
  } catch {}
}
useEffect(() => {
  loadMode();
  loadServices();
}, []);

// compute which times are valid for a selected service in Mode 2
function toMin(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}
function validStartsForService(slots: Slot[], durationMin: number) {
  const byTime = [...slots].sort((a, b) => a.time.localeCompare(b.time));
  const steps =
    byTime.length > 1 ? toMin(byTime[1].time) - toMin(byTime[0].time) : 0;
  if (!steps) return byTime;
  const need = Math.max(1, Math.ceil(durationMin / steps));
  const out: Slot[] = [];
  for (let i = 0; i < byTime.length; i++) {
    const chain = byTime.slice(i, i + need);
    if (chain.length < need) break;
    if (chain.some((s) => s.locked)) continue;
    out.push(byTime[i]);
  }
  return out;
}

export default function Client({
  slotsFor,
  selectedDate,
}: {
  slotsFor: (date: string) => Slot[];
  selectedDate: string | null;
}) {
  const [selectedTime, setSelectedTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [okCaptcha, setOkCaptcha] = useState(false);

  let times = slotsFor(selectedDate);
  if (mode === 2) {
    const svc = services.find((s) => s.id === serviceId);
    if (svc) times = validStartsForService(times, svc.duration_min);
  }

  const canSubmit =
    !!selectedTime &&
    !!name &&
    !!email &&
    !!phone &&
    okCaptcha &&
    (mode === 1 || !!serviceId);

  async function handleSubmit() {
    const service = services.find((s) => s.id === serviceId);
    let res;
    if (mode === 2 && service) {
      res = await fetch("/api/book-seq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          start: selectedTime,
          duration_min: service.duration_min,
          name,
          email,
          phone,
        }),
      });
    } else {
      res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          name,
          email,
          phone,
        }),
      });
    }
    const j = await res.json();
    if (!res.ok) {
      alert(j.error || "Nepodarilo sa rezervovať.");
    } else {
      alert("Rezervácia prebehla úspešne.");
      window.location.href = "/";
    }
  }

  return (
    <div>
      {mode === 2 && (
        <div className="mb-3">
          <label className="block text-sm mb-1">Služba</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full border rounded px-2 py-2"
          >
            <option value="">-- vyberte službu --</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_min} min)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {times.map((t) => (
          <button
            key={t.id}
            className={`px-2 py-1 border rounded ${
              selectedTime === t.time ? "bg-blue-500 text-white" : ""
            }`}
            disabled={t.locked}
            onClick={() => setSelectedTime(t.time)}
          >
            {t.time}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <input
          className="w-full border px-2 py-1 rounded"
          placeholder="Meno"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full border px-2 py-1 rounded"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border px-2 py-1 rounded"
          placeholder="Telefón"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="mt-3">
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY!}
          onSuccess={() => setOkCaptcha(true)}
        />
      </div>

      <button
        className="mt-3 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        Rezervovať
      </button>
    </div>
  );
}
