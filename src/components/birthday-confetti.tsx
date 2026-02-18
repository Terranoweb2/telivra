"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function BirthdayConfetti() {
  const { data: session } = useSession();
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (!session?.user || fired) return;

    const today = new Date().toISOString().slice(0, 10);
    const key = `birthday-confetti-${today}`;
    if (sessionStorage.getItem(key)) return;

    // Vérifier si c'est l'anniversaire de l'utilisateur
    fetch("/api/settings/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.dateOfBirth) return;
        const dob = new Date(data.dateOfBirth);
        const now = new Date();
        if (dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate()) {
          sessionStorage.setItem(key, "1");
          setFired(true);
          launchConfetti();
          toast.success("Joyeux anniversaire ! Un cadeau vous attend !", { duration: 8000 });
        }
      })
      .catch(() => {});
  }, [session, fired]);

  return null;
}

async function launchConfetti() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    // Premier tir
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    // Deuxième tir décalé
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, origin: { y: 0.5, x: 0.3 } });
    }, 400);
    setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, origin: { y: 0.5, x: 0.7 } });
    }, 700);
  } catch {}
}
