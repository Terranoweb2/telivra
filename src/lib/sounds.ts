export type SoundType =
  | "new-order"
  | "accepted"
  | "cook-accepted"
  | "order-ready"
  | "picked-up"
  | "delivered"
  | "arriving"
  | "connection-lost"
  | "connection-restored"
  | "new-message";

// Singleton AudioContext — créé seulement au premier geste utilisateur
let _ctx: AudioContext | null = null;
let _unlocked = false;
let _pendingSound: SoundType | null = null;

function getCtx(): AudioContext | null {
  if (!_unlocked) return null;
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

// Débloquer l'AudioContext au premier geste utilisateur
function unlockAudio() {
  if (_unlocked) return;
  _unlocked = true;
  _ctx = new AudioContext();
  // Jouer un son silencieux pour débloquer complètement
  const osc = _ctx.createOscillator();
  const gain = _ctx.createGain();
  gain.gain.setValueAtTime(0, _ctx.currentTime);
  osc.connect(gain);
  gain.connect(_ctx.destination);
  osc.start();
  osc.stop(_ctx.currentTime + 0.01);
  // Jouer le son en attente s'il y en a un
  if (_pendingSound) {
    const s = _pendingSound;
    _pendingSound = null;
    setTimeout(() => _playNow(s), 100);
  }
}

// Auto-unlock au premier clic/toucher/scroll (côté client)
if (typeof window !== "undefined") {
  const doUnlock = () => {
    unlockAudio();
    window.removeEventListener("click", doUnlock);
    window.removeEventListener("touchstart", doUnlock);
    window.removeEventListener("touchend", doUnlock);
    window.removeEventListener("keydown", doUnlock);
    window.removeEventListener("scroll", doUnlock, true);
  };
  window.addEventListener("click", doUnlock);
  window.addEventListener("touchstart", doUnlock);
  window.addEventListener("touchend", doUnlock);
  window.addEventListener("keydown", doUnlock);
  window.addEventListener("scroll", doUnlock, true);
}

function _playNow(type: SoundType) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case "new-order":
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        break;

      case "accepted":
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
        break;

      case "cook-accepted":
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(523, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
        break;

      case "order-ready":
        osc.type = "sine";
        osc.frequency.setValueAtTime(784, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.7);
        break;

      case "picked-up":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(659, ctx.currentTime);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        break;

      case "delivered": {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
        osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.36);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.36);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.9);
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(784, ctx.currentTime + 0.36);
        osc2.frequency.setValueAtTime(1047, ctx.currentTime + 0.48);
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.36);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc2.start(ctx.currentTime + 0.36);
        osc2.stop(ctx.currentTime + 0.9);
        break;
      }

      case "arriving":
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(700, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        break;

      case "connection-lost":
        // Son descendant grave — alerte perte connexion
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(400, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
        break;

      case "connection-restored":
        // Son ascendant joyeux — connexion retrouvee
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.24);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        break;

      case "new-message":
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(900, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
    }
  } catch {}
}

export function playSound(type: SoundType = "new-order") {
  if (!_unlocked) {
    // Pas encore débloqué — garder le dernier son en attente
    _pendingSound = type;
    return;
  }
  _playNow(type);
}
