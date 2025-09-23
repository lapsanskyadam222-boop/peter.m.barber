
'use client';

import { useEffect, useMemo, useState } from 'react';

type WindowItem = { start: string; end: string };

function isHM(v: string) { return /^\d{2}:\d{2}$/.test(v); }
function pad(n: number) { return n<10?`0${n}`:`${n}`; }
function toYMD(d=new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

export default function Mode2Panel() {
  const [date, setDate] = useState<string>(toYMD());
  const [windows, setWindows] = useState<WindowItem[]>([{ start: '09:00', end: '12:00' }]);
  const [slotLen, setSlotLen] = useState<number>(15);
  const [gap, setGap] = useState<number>(5);
  const [services, setServices] = useState<{id:string;name:string;duration_min:number;active:boolean}[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string|undefined>();

  async function loadPlan() {
    setMsg(undefined);
    const res = await fetch(`/api/work-plan/${date}`);
    if (res.ok) {
      const j = await res.json();
      setWindows(j.plan?.windows ?? []);
      setSlotLen(j.plan?.slot_len_min ?? 15);
      setGap(j.plan?.break_min ?? 0);
    }
  }
  async function savePlan() {
    setBusy(true); setMsg(undefined);
    const res = await fetch(`/api/work-plan/${date}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ windows, slot_len: slotLen, break_min: gap })
    });
    const j = await res.json();
    setBusy(false);
    setMsg(res.ok ? 'Plán uložený.' : (j.error || 'Chyba pri ukladaní.'));
  }
  async function generateSlots() {
    setBusy(true); setMsg(undefined);
    const res = await fetch('/api/slots2', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date, windows, slot_len_min: slotLen, break_min: gap })
    });
    const j = await res.json();
    setBusy(false);
    setMsg(res.ok ? `Vytvorených/aktualizovaných slotov: ${j.total}` : (j.error || 'Chyba pri generovaní.'));
  }
  async function loadServices() {
    const r = await fetch('/api/services');
    const j = await r.json();
    if (r.ok) setServices(j.services || []);
  }
  useEffect(()=>{ loadPlan(); loadServices(); }, [date]);

  function setWin(i: number, key: 'start'|'end', val: string) {
    setWindows(w => w.map((x,idx)=> idx===i? { ...x, [key]: val } : x));
  }
  function addWin() { setWindows(w => [...w, { start: '13:00', end: '16:00' }]); }
  function rmWin(i: number) { setWindows(w => w.filter((_,idx)=> idx!==i)); }

  async function addService() {
    const name = prompt('Názov služby:');
    const dur = Number(prompt('Trvanie (min):'));
    if (!name || !Number.isFinite(dur)) return;
    const r = await fetch('/api/services', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ name, duration_min: dur }) });
    if (r.ok) loadServices();
  }
  async function delService(id: string) {
    if (!confirm('Zmazať službu?')) return;
    const r = await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
    if (r.ok) loadServices();
  }

  return (
    <section className="rounded-2xl border p-4 space-y-6">
      <h2 className="text-lg font-semibold">Režim 2 – pracovné okná + služby</h2>

      <div className="flex gap-3 items-center">
        <label className="text-sm">Dátum:</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border rounded px-2 py-1" />
        <button onClick={loadPlan} className="px-3 py-1 border rounded">Načítať</button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Pracovné okná</h3>
        {windows.map((w,i)=>(
          <div key={i} className="flex gap-2 items-center">
            <input value={w.start} onChange={e=>setWin(i,'start',e.target.value)} placeholder="HH:MM" className="border rounded px-2 py-1 w-24" />
            <span>–</span>
            <input value={w.end} onChange={e=>setWin(i,'end',e.target.value)} placeholder="HH:MM" className="border rounded px-2 py-1 w-24" />
            <button onClick={()=>rmWin(i)} className="px-2 py-1 border rounded">X</button>
          </div>
        ))}
        <button onClick={addWin} className="px-3 py-1 border rounded">+ Okno</button>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">Dĺžka slotu
          <input type="number" min={5} step={5} value={slotLen} onChange={e=>setSlotLen(Number(e.target.value))} className="border rounded px-2 py-1 w-24" />
          min
        </label>
        <label className="flex items-center gap-2 text-sm">Medzera
          <input type="number" min={0} step={5} value={gap} onChange={e=>setGap(Number(e.target.value))} className="border rounded px-2 py-1 w-24" />
          min
        </label>
      </div>

      <div className="flex gap-3">
        <button onClick={savePlan} disabled={busy} className="px-3 py-2 border rounded">{busy? 'Ukladám…':'Uložiť plán'}</button>
        <button onClick={generateSlots} disabled={busy} className="px-3 py-2 border rounded">{busy? 'Generujem…':'Vygenerovať sloty'}</button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Služby</h3>
        <div className="flex flex-col gap-2">
          {services.map(s=> (
            <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2">
              <div><b>{s.name}</b> — {s.duration_min} min {s.active ? '' : '(neaktívna)'}</div>
              <button onClick={()=>delService(s.id)} className="px-2 py-1 border rounded">Zmazať</button>
            </div>
          ))}
        </div>
        <button onClick={addService} className="px-3 py-2 border rounded">+ Pridať službu</button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
    </section>
  );
}
