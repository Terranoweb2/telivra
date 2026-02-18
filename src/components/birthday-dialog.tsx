"use client";

import { useEffect, useState } from "react";
import { Cake, Gift, X } from "lucide-react";

interface BirthdayClient {
  id: string;
  name: string;
  age: number;
  orderCount: number;
  phone: string | null;
}

export function BirthdayDialog() {
  const [clients, setClients] = useState<BirthdayClient[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `birthday-dialog-${today}`;
    if (sessionStorage.getItem(key)) return;

    fetch("/api/birthdays/today")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BirthdayClient[]) => {
        if (data.length > 0) {
          setClients(data);
          setOpen(true);
          sessionStorage.setItem(key, "1");
        }
      })
      .catch(() => {});
  }, []);

  if (!open || clients.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cake className="w-6 h-6 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Anniversaires du jour</h2>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-white font-medium">{c.name}</p>
                <p className="text-sm text-gray-400">
                  {c.age} ans &middot; {c.orderCount} commande{c.orderCount > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setOpen(false)}
          className="mt-4 w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
