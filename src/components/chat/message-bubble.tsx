"use client";

import { cn } from "@/lib/utils";
import { CheckCheck, Play, Pause, Mic, Reply, Pencil, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ReplyToData {
  id: string;
  content: string;
  sender: string;
  guestName?: string | null;
  fileUrl?: string | null;
  user?: { name: string } | null;
}

interface MessageData {
  id: string;
  content: string;
  sender: "CLIENT" | "DRIVER" | "ADMIN" | "SYSTEM";
  createdAt: string;
  user?: { id: string; name: string; role: string } | null;
  guestName?: string | null;
  isRead: boolean;
  isEdited?: boolean;
  fileUrl?: string | null;
  replyTo?: ReplyToData | null;
}

interface MessageBubbleProps {
  message: MessageData;
  isMine: boolean;
  lightMode?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const senderLabels: Record<string, string> = {
  CLIENT: "Client",
  DRIVER: "Livreur",
  ADMIN: "Support",
  SYSTEM: "Systeme",
};

function AudioPlayer({ src, isMine, lightMode }: { src: string; isMine: boolean; lightMode: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const durationResolved = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function resolveDuration() {
      const d = audio!.duration;
      if (d && isFinite(d) && !durationResolved.current) {
        durationResolved.current = true;
        setDuration(d);
      }
    }

    function handleLoadedMetadata() {
      if (audio!.duration === Infinity || !isFinite(audio!.duration)) {
        // WebM workaround: seek to huge value to force browser to resolve duration
        audio!.currentTime = 1e101;
      } else {
        resolveDuration();
      }
    }

    function handleTimeUpdateFix() {
      if (audio!.duration && isFinite(audio!.duration) && !durationResolved.current) {
        durationResolved.current = true;
        setDuration(audio!.duration);
        audio!.currentTime = 0;
        audio!.removeEventListener("timeupdate", handleTimeUpdateFix);
      }
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdateFix);
    audio.addEventListener("durationchange", resolveDuration);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdateFix);
      audio.removeEventListener("durationchange", resolveDuration);
      audio.pause();
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause(); else audio.play().catch(() => {});
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  }

  function fmt(s: number): string {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  const pct = duration ? (currentTime / duration) * 100 : 0;
  const trackBg = isMine ? "bg-white/25" : lightMode ? "bg-gray-400/30" : "bg-white/20";
  const trackFill = isMine ? "bg-white/80" : lightMode ? "bg-orange-500" : "bg-orange-400";
  const iconColor = isMine ? "text-white" : lightMode ? "text-orange-600" : "text-orange-400";
  const timeColor = isMine ? "text-white/70" : lightMode ? "text-gray-500" : "text-gray-400";

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] px-3 py-2">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button onClick={togglePlay} className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", isMine ? "bg-white/20" : lightMode ? "bg-orange-100" : "bg-white/10")}>
        {playing ? <Pause className={cn("w-4 h-4", iconColor)} /> : <Play className={cn("w-4 h-4 ml-0.5", iconColor)} />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div ref={progressRef} className={cn("relative h-1.5 rounded-full cursor-pointer", trackBg)} onClick={handleSeek} onTouchStart={handleSeek}>
          <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all", trackFill)} style={{ width: `${pct}%` }} />
          <div className={cn("absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm transition-all", isMine ? "bg-white" : lightMode ? "bg-orange-500" : "bg-orange-400")} style={{ left: `calc(${pct}% - 6px)` }} />
        </div>
        <span className={cn("text-[10px] tabular-nums", timeColor)}>{playing ? fmt(currentTime) : fmt(duration)}</span>
      </div>
    </div>
  );
}

export function MessageBubble({ message, isMine, lightMode = false, onReply, onEdit, onDelete }: MessageBubbleProps) {
  const [imgZoom, setImgZoom] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const swipeOffsetRef = useRef(0);
  const isSwipingRef = useRef(false);
  const longPressTriggeredRef = useRef(false);

  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const name = message.user?.name || message.guestName || senderLabels[message.sender];

  const isAudio = message.fileUrl && /\.(webm|ogg|mp3|m4a|aac|wav|mpeg)$/i.test(message.fileUrl);
  const isVideo = message.fileUrl && !isAudio && /\.(mp4|mov|mkv)$/i.test(message.fileUrl);
  const isImage = message.fileUrl && !isAudio && !isVideo;
  const isSystem = message.sender === "SYSTEM";

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handleClose(e: Event) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    const t = setTimeout(() => {
      document.addEventListener("touchstart", handleClose);
      document.addEventListener("click", handleClose);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("touchstart", handleClose);
      document.removeEventListener("click", handleClose);
    };
  }, [showMenu]);

  // Long press handlers
  function startLongPress() {
    longPressTriggeredRef.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowMenu(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  // Swipe to reply + long press
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    swipeOffsetRef.current = 0;
    if (!isSystem) startLongPress();
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swipeRef.current) return;
    const dx = e.touches[0].clientX - touchStartXRef.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartYRef.current);
    if (Math.abs(dx) > 5 || dy > 5) cancelLongPress();
    if (!isSwipingRef.current && dy > 10) return;
    if (dx > 10 && onReply) isSwipingRef.current = true;
    if (!isSwipingRef.current) return;
    const offset = Math.min(Math.max(0, dx), 80);
    swipeOffsetRef.current = offset;
    swipeRef.current.style.transform = `translateX(${offset}px)`;
    swipeRef.current.style.transition = "none";
  }

  function handleTouchEnd() {
    cancelLongPress();
    if (!swipeRef.current) return;
    swipeRef.current.style.transition = "transform 0.2s ease";
    swipeRef.current.style.transform = "translateX(0)";
    if (swipeOffsetRef.current >= 60 && onReply && !longPressTriggeredRef.current) {
      onReply();
      if (navigator.vibrate) navigator.vibrate(30);
    }
    isSwipingRef.current = false;
    swipeOffsetRef.current = 0;
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (isSystem) return;
    e.preventDefault();
    setShowMenu(true);
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className={cn("text-[10px] px-3 py-1 rounded-full", lightMode ? "text-gray-500 bg-gray-200/70" : "text-gray-400 bg-gray-700/50")}>{message.content}</span>
      </div>
    );
  }

  function getReplyName(r: ReplyToData) {
    return r.user?.name || r.guestName || senderLabels[r.sender] || "?";
  }
  function getReplyPreview(r: ReplyToData) {
    if (r.fileUrl) {
      if (/\.(mp4|mov|mkv)$/i.test(r.fileUrl)) return "Video";
      if (/\.(webm|ogg|mp3|m4a)$/i.test(r.fileUrl)) return "Message vocal";
      return "Photo";
    }
    return r.content || "...";
  }

  const hasTextOnly = message.content && !message.fileUrl;

  return (
    <>
      <div
        ref={swipeRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
        className={cn("flex flex-col max-w-[80%] relative select-none", isMine ? "ml-auto items-end" : "mr-auto items-start")}
      >
        {!isMine && (
          <span className={cn("text-[10px] mb-0.5 ml-2", lightMode ? "text-gray-500" : "text-gray-400")}>{name}</span>
        )}
        <div
          className={cn(
            "rounded-2xl text-sm leading-relaxed break-words overflow-hidden",
            isMine ? "bg-orange-600 text-white rounded-br-md"
              : lightMode ? "bg-gray-200 text-gray-900 rounded-bl-md"
              : "bg-gray-700 text-gray-100 rounded-bl-md",
            !isAudio && !isImage && !isVideo && message.content && !message.replyTo ? "px-3.5 py-2" : (isImage || isVideo) ? "p-1" : ""
          )}
        >
          {message.replyTo && (
            <div className={cn(
              "mx-1.5 mt-1.5 mb-1 px-2.5 py-1.5 rounded-lg border-l-2 border-orange-400",
              isMine ? "bg-white/15" : lightMode ? "bg-gray-300/50" : "bg-white/10"
            )}>
              <p className={cn("text-[10px] font-semibold", isMine ? "text-orange-200" : lightMode ? "text-orange-600" : "text-orange-400")}>{getReplyName(message.replyTo)}</p>
              <p className={cn("text-[11px] truncate", isMine ? "text-white/70" : lightMode ? "text-gray-500" : "text-gray-400")}>
                {message.replyTo.fileUrl && /\.(webm|ogg|mp3|m4a)$/i.test(message.replyTo.fileUrl) && <Mic className="w-3 h-3 inline mr-1" />}
                {getReplyPreview(message.replyTo)}
              </p>
            </div>
          )}

          {isAudio && <AudioPlayer src={message.fileUrl!} isMine={isMine} lightMode={lightMode} />}
          {isImage && (
            <button onClick={() => setImgZoom(true)} className="block">
              <img src={message.fileUrl!} alt="Image" className="rounded-xl max-w-[240px] max-h-[300px] object-cover" loading="lazy" />
            </button>
          )}
          {isVideo && (
            <video
              src={message.fileUrl!}
              controls
              preload="metadata"
              className="rounded-xl max-w-[260px] max-h-[300px]"
              playsInline
            />
          )}
          {message.content && (
            <p className={cn(
              message.replyTo && !isImage && !isAudio ? "px-3.5 py-1.5" : isImage ? "px-2.5 py-1.5 text-sm" : ""
            )}>{message.content}</p>
          )}
          {message.replyTo && !message.content && !isAudio && !isImage && <div className="h-0.5" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5 px-2">
          <span className={cn("text-[9px]", lightMode ? "text-gray-400" : "text-gray-500")}>{time}</span>
          {message.isEdited && (
            <span className={cn("text-[9px] italic", lightMode ? "text-gray-400" : "text-gray-500")}>modifie</span>
          )}
          {isMine && (
            message.isRead
              ? <CheckCheck className={cn("w-3 h-3", lightMode ? "text-blue-500" : "text-blue-400")} />
              : <CheckCheck className={cn("w-3 h-3", lightMode ? "text-gray-400" : "text-gray-500")} />
          )}
        </div>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} onTouchStart={() => setShowMenu(false)} />
            <div
              ref={menuRef}
              className={cn(
                "absolute z-[70] rounded-2xl shadow-2xl border overflow-hidden min-w-[160px]",
                "backdrop-blur-sm",
                isMine ? "right-0" : "left-0",
                "bottom-full mb-2",
                lightMode ? "bg-white/95 border-gray-200" : "bg-gray-800/95 border-gray-600"
              )}
            >
              {onReply && (
                <button
                  onClick={() => { setShowMenu(false); onReply(); }}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 text-[13px] transition-colors", lightMode ? "text-gray-700 active:bg-gray-100" : "text-gray-200 active:bg-gray-700")}
                >
                  <Reply className="w-4 h-4 text-blue-400" /> Repondre
                </button>
              )}
              {isMine && hasTextOnly && onEdit && (
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 text-[13px] border-t transition-colors", lightMode ? "text-gray-700 active:bg-gray-100 border-gray-100" : "text-gray-200 active:bg-gray-700 border-gray-700")}
                >
                  <Pencil className="w-4 h-4 text-orange-400" /> Modifier
                </button>
              )}
              {isMine && onDelete && (
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 text-[13px] border-t transition-colors", lightMode ? "text-red-600 active:bg-red-50 border-gray-100" : "text-red-400 active:bg-red-500/10 border-gray-700")}
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {imgZoom && isImage && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90" onClick={() => setImgZoom(false)}>
          <img src={message.fileUrl!} alt="Image" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}
