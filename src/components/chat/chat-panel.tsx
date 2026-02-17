"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, Loader2, ChevronUp, Phone, ImagePlus, Mic, Trash2, Reply, Play, Pause, Square, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { playSound } from "@/lib/sounds";

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

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: MessageData[];
  loading: boolean;
  sending: boolean;
  typingUser: string | null;
  hasMore: boolean;
  currentSender: "CLIENT" | "DRIVER" | "ADMIN";
  onSend: (content: string, fileUrl?: string, replyToId?: string) => Promise<boolean>;
  onEdit?: (messageId: string, newContent: string) => Promise<boolean>;
  onDelete?: (messageId: string) => Promise<boolean>;
  onMarkRead: () => void;
  onLoadMore: () => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  chatEnabled?: boolean;
  otherPartyName?: string;
  orderNumber?: string;
  onCall?: () => void;
  callDisabled?: boolean;
  lightMode?: boolean;
  isOtherOnline?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const senderLabels: Record<string, string> = {
  CLIENT: "Client",
  DRIVER: "Livreur",
  ADMIN: "Support",
  SYSTEM: "Systeme",
};

export function ChatPanel({
  open, onClose, messages, loading, sending, typingUser,
  hasMore, currentSender, onSend, onEdit, onDelete, onMarkRead, onLoadMore,
  onTyping, onStopTyping, disabled = false, chatEnabled = true,
  otherPartyName, orderNumber, onCall, callDisabled = false,
  lightMode = false, isOtherOnline = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyToData | null>(null);
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prevMessageCount = useRef(0);
  const scrolledToBottom = useRef(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [swipedCancel, setSwipedCancel] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>(new Array(24).fill(0.05));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const touchStartXRef = useRef(0);
  const recordingStartRef = useRef(0);
  const isTouchRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  // Audio preview state
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; mimeType: string; url: string; duration: number } | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, []);

  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      scrollToBottom();
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender !== currentSender && prevMessageCount.current > 0) {
        playSound("new-message");
      }
      if (open) onMarkRead();
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, currentSender, open]);

  // Scroll to bottom when panel opens
  useEffect(() => {
    if (open) {
      onMarkRead();
      setTimeout(() => {
        scrollToBottom(false);
        textareaRef.current?.focus();
      }, 150);
    } else {
      scrolledToBottom.current = false;
    }
  }, [open]);

  useEffect(() => {
    // Scroll to bottom once loading is done (first load)
    if (!loading && open && !scrolledToBottom.current && messages.length > 0) {
      scrolledToBottom.current = true;
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [loading, open, messages.length]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        mr.stream.getTracks().forEach((t) => t.stop());
        mr.stop();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      if (recordedAudio) URL.revokeObjectURL(recordedAudio.url);
    };
  }, []);

  async function handleSend() {
    if (!input.trim() || disabled || !chatEnabled) return;
    const content = input;

    // Edit mode
    if (editingMsg && onEdit) {
      setInput("");
      setEditingMsg(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      const ok = await onEdit(editingMsg.id, content);
      if (!ok) { setInput(content); setEditingMsg({ id: editingMsg.id, content }); }
      return;
    }

    const rid = replyTo?.id;
    setInput("");
    setReplyTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onStopTyping();
    const ok = await onSend(content, undefined, rid);
    if (!ok) setInput(content);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || disabled || !chatEnabled) return;
    e.target.value = "";
    const maxSize = file.type.startsWith("video/") ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
      alert(file.type.startsWith("video/") ? "Video trop volumineuse (30MB max)" : "Fichier trop volumineux (5MB max)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/chat", { method: "POST", body: fd });
      if (!res.ok) { setUploading(false); return; }
      const data = await res.json();
      if (data.url) {
        const rid = replyTo?.id;
        await onSend(input.trim() || "", data.url, rid);
        setInput("");
        setReplyTo(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    } catch {} finally {
      setUploading(false);
    }
  }

  // ===== Audio Recording with Waveform =====
  function updateWaveform() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const bars: number[] = [];
    const step = Math.floor(data.length / 24);
    for (let i = 0; i < 24; i++) {
      const val = data[i * step] / 255;
      bars.push(Math.max(0.05, val));
    }
    setWaveformBars(bars);
    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }

  async function startRecording() {
    try {
      cancelledRef.current = false;
      recordingStartRef.current = Date.now();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";

      // Setup analyser for waveform
      const actx = new AudioContext();
      audioCtxRef.current = actx;
      const source = actx.createMediaStreamSource(stream);
      const analyser = actx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;
      animFrameRef.current = requestAnimationFrame(updateWaveform);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close().catch(() => {});
        }
        analyserRef.current = null;
        audioCtxRef.current = null;
        setWaveformBars(new Array(24).fill(0.05));

        if (cancelledRef.current) { audioChunksRef.current = []; return; }
        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) return;

        const elapsed = (Date.now() - recordingStartRef.current) / 1000;
        const url = URL.createObjectURL(blob);
        setRecordedAudio({ blob, mimeType, url, duration: Math.round(elapsed) });
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      setSwipedCancel(false);
      recordingTimerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch {
      alert("Acces au microphone refuse.");
    }
  }

  function stopRecording(cancel = false) {
    const elapsed = Date.now() - recordingStartRef.current;
    cancelledRef.current = cancel || elapsed < 800;
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
    setSwipedCancel(false);
  }

  async function sendRecordedAudio() {
    if (!recordedAudio) return;
    const { blob, mimeType, url } = recordedAudio;
    const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "m4a" : "ogg";
    const fd = new FormData();
    fd.append("file", blob, `voice-${Date.now()}.${ext}`);
    setUploading(true);
    try {
      const res = await fetch("/api/upload/chat", { method: "POST", body: fd });
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) await onSend("", data.url, replyTo?.id);
      setReplyTo(null);
    } catch {} finally {
      setUploading(false);
      URL.revokeObjectURL(url);
      setRecordedAudio(null);
      if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
      setPreviewPlaying(false);
    }
  }

  function cancelRecordedAudio() {
    if (recordedAudio) URL.revokeObjectURL(recordedAudio.url);
    setRecordedAudio(null);
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    setPreviewPlaying(false);
  }

  function togglePreviewPlay() {
    if (!recordedAudio) return;
    if (!previewAudioRef.current) {
      const a = new Audio(recordedAudio.url);
      a.onended = () => setPreviewPlaying(false);
      previewAudioRef.current = a;
    }
    if (previewPlaying) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().catch(() => {});
      setPreviewPlaying(true);
    }
  }

  function handleMicTouchStart(e: React.TouchEvent) {
    if (input.trim() || isRecording || disabled || uploading || !chatEnabled || recordedAudio) return;
    isTouchRef.current = true;
    e.preventDefault();
    touchStartXRef.current = e.touches[0].clientX;
    startRecording();
  }
  function handleMicTouchMove(e: React.TouchEvent) {
    if (!isRecording) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    cancelledRef.current = deltaX < -80;
    setSwipedCancel(deltaX < -80);
  }
  function handleMicTouchEnd(e: React.TouchEvent) {
    if (!isRecording) return;
    e.preventDefault();
    stopRecording(cancelledRef.current);
    setTimeout(() => { isTouchRef.current = false; }, 300);
  }
  function handleRightBtnClick() {
    if (isTouchRef.current) return;
    const hasText = input.trim().length > 0;
    if (hasText || editingMsg) handleSend();
    else if (isRecording) stopRecording(false);
    else if (!disabled && !uploading && chatEnabled && !recordedAudio) startRecording();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && editingMsg) { setEditingMsg(null); setInput(""); }
  }
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    resizeTextarea();
    if (e.target.value.length > 0) onTyping(); else onStopTyping();
  }

  function handleReply(msg: MessageData) {
    setEditingMsg(null);
    setReplyTo({ id: msg.id, content: msg.content, sender: msg.sender, guestName: msg.guestName, fileUrl: msg.fileUrl, user: msg.user ? { name: msg.user.name } : null });
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function handleEditStart(msg: MessageData) {
    setReplyTo(null);
    setEditingMsg({ id: msg.id, content: msg.content });
    setInput(msg.content);
    setTimeout(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    }, 100);
  }

  async function handleDelete(msgId: string) {
    if (!onDelete) return;
    await onDelete(msgId);
  }

  if (!open) return null;

  const hasText = input.trim().length > 0;
  const inputDisabled = disabled || !chatEnabled;
  const bg = lightMode ? "bg-white" : "bg-gray-900";
  const borderColor = lightMode ? "border-gray-200" : "border-gray-800";
  const headerBorder = lightMode ? "border-gray-200/50" : "border-gray-800/50";
  const nameColor = lightMode ? "text-gray-900" : "text-white";
  const subColor = lightMode ? "text-gray-500" : "text-gray-500";
  const closeBg = lightMode ? "bg-gray-100 hover:bg-gray-200" : "bg-gray-800 hover:bg-gray-700";
  const closeIcon = lightMode ? "text-gray-500" : "text-gray-400";

  function getReplyName(r: ReplyToData) {
    return r.user?.name || r.guestName || senderLabels[r.sender] || "?";
  }

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("absolute bottom-0 left-0 right-0 max-h-[85vh] border-t rounded-t-2xl flex flex-col shadow-2xl animate-slide-up", bg, borderColor)}>
        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-3 border-b shrink-0", headerBorder)}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-orange-600/20 flex items-center justify-center">
                <span className="text-sm font-bold text-orange-400">{otherPartyName?.[0]?.toUpperCase() || "?"}</span>
              </div>
              <span className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2", lightMode ? "border-white" : "border-gray-900", isOtherOnline ? "bg-green-500" : "bg-gray-500")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", nameColor)}>{otherPartyName || "Discussion"}</p>
              <p className={cn("text-[10px]", isOtherOnline ? "text-green-500" : subColor)}>{isOtherOnline ? "En ligne" : orderNumber || "Hors ligne"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCall && !callDisabled && chatEnabled && (
              <button onClick={onCall} className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors active:scale-90">
                <Phone className="w-4 h-4 text-white" />
              </button>
            )}
            <button onClick={onClose} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-colors", closeBg)}>
              <X className={cn("w-4 h-4", closeIcon)} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px] max-h-[60vh]">
          {hasMore && (
            <button onClick={onLoadMore} className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 flex items-center justify-center gap-1">
              <ChevronUp className="w-3 h-3" /> Messages precedents
            </button>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-orange-500 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className={cn("text-sm", lightMode ? "text-gray-400" : "text-gray-500")}>Aucun message</p>
              <p className={cn("text-xs mt-1", lightMode ? "text-gray-300" : "text-gray-600")}>Commencez la conversation !</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMine={msg.sender === currentSender}
                lightMode={lightMode}
                onReply={msg.sender !== "SYSTEM" ? () => handleReply(msg) : undefined}
                onEdit={msg.sender === currentSender && msg.content && !msg.fileUrl ? () => handleEditStart(msg) : undefined}
                onDelete={msg.sender === currentSender ? () => handleDelete(msg.id) : undefined}
              />
            ))
          )}
          {typingUser && (
            <div className="flex items-center gap-2 text-xs text-gray-400 pl-2">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              {typingUser} ecrit...
            </div>
          )}
        </div>

        {/* Edit bar */}
        {editingMsg && (
          <div className={cn("shrink-0 px-4 py-2 border-t flex items-center gap-2", headerBorder)}>
            <Pencil className={cn("w-4 h-4 shrink-0", lightMode ? "text-orange-500" : "text-orange-400")} />
            <div className={cn("flex-1 min-w-0 text-xs border-l-2 border-orange-500 pl-2 py-0.5", lightMode ? "text-gray-600" : "text-gray-400")}>
              <span className="font-semibold">Modification</span>
              <p className="truncate">{editingMsg.content}</p>
            </div>
            <button onClick={() => { setEditingMsg(null); setInput(""); }} className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", lightMode ? "text-gray-400 hover:bg-gray-100" : "text-gray-500 hover:bg-gray-800")}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Reply bar */}
        {replyTo && !editingMsg && (
          <div className={cn("shrink-0 px-4 py-2 border-t flex items-center gap-2", headerBorder)}>
            <Reply className={cn("w-4 h-4 shrink-0", lightMode ? "text-orange-500" : "text-orange-400")} />
            <div className={cn("flex-1 min-w-0 text-xs border-l-2 border-orange-500 pl-2 py-0.5", lightMode ? "text-gray-600" : "text-gray-400")}>
              <span className="font-semibold">{getReplyName(replyTo)}</span>
              <p className="truncate">{replyTo.fileUrl ? (replyTo.fileUrl.match(/\.(webm|ogg|mp3|m4a)$/i) ? "Message vocal" : "Photo") : replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", lightMode ? "text-gray-400 hover:bg-gray-100" : "text-gray-500 hover:bg-gray-800")}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className={cn("shrink-0 px-3 py-2 border-t pb-safe", headerBorder)}>
          {inputDisabled ? (
            <p className={cn("text-center text-xs py-2", lightMode ? "text-gray-400" : "text-gray-500")}>
              {!chatEnabled ? "Chat desactive par l'administrateur" : "Conversation terminee"}
            </p>
          ) : (
            <div className="flex items-end gap-1.5">
              {/* Recording UI with waveform */}
              {isRecording ? (
                <div className="flex items-center gap-2 flex-1 min-w-0 h-10">
                  <button onClick={() => stopRecording(true)} className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors", lightMode ? "bg-red-50 text-red-500" : "bg-red-500/20 text-red-400")}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className={cn("text-sm font-mono tabular-nums shrink-0", lightMode ? "text-gray-700" : "text-white")}>{formatDuration(recordingDuration)}</span>
                    {/* Waveform bars */}
                    <div className="flex items-center gap-[2px] flex-1 h-6 overflow-hidden">
                      {waveformBars.map((v, i) => (
                        <div
                          key={i}
                          className="w-[3px] rounded-full bg-orange-500 transition-all duration-75"
                          style={{ height: `${Math.max(3, v * 24)}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  {swipedCancel && (
                    <span className="text-[10px] text-red-400 shrink-0">Annuler</span>
                  )}
                </div>
              ) : recordedAudio ? (
                /* Audio preview before sending */
                <div className="flex items-center gap-2 flex-1 min-w-0 h-10">
                  <button onClick={cancelRecordedAudio} className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors", lightMode ? "bg-red-50 text-red-500" : "bg-red-500/20 text-red-400")}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={togglePreviewPlay} className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", lightMode ? "bg-orange-100 text-orange-600" : "bg-orange-600/20 text-orange-400")}>
                    {previewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <span className={cn("text-sm font-mono tabular-nums flex-1", lightMode ? "text-gray-700" : "text-white")}>
                    {formatDuration(recordedAudio.duration)}
                  </span>
                  <button
                    onClick={sendRecordedAudio}
                    disabled={uploading}
                    className="w-9 h-9 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-90 flex items-center justify-center shrink-0 transition-all text-white"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                /* Normal input */
                <>
                  <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  {!editingMsg && (
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0", lightMode ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-gray-800 text-gray-400 hover:bg-gray-700")}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                    </button>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={editingMsg ? "Modifier le message..." : "Votre message..."}
                    maxLength={1000}
                    rows={1}
                    className={cn("flex-1 text-sm rounded-xl px-3 py-2.5 outline-none resize-none overflow-y-auto", lightMode ? "chat-input-light" : "chat-input")}
                    style={{ maxHeight: 120 }}
                  />
                </>
              )}
              {/* Right button: Send / Mic */}
              {!isRecording && !recordedAudio && (
                <button
                  onTouchStart={handleMicTouchStart}
                  onTouchMove={handleMicTouchMove}
                  onTouchEnd={handleMicTouchEnd}
                  onClick={handleRightBtnClick}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                    (hasText || editingMsg) && !sending ? "bg-orange-600 hover:bg-orange-700 active:scale-90 text-white"
                      : lightMode ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  )}
                >
                  {(sending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" />
                    : (hasText || editingMsg) ? <Send className="w-4 h-4" />
                    : <Mic className="w-5 h-5" />}
                </button>
              )}
              {/* Stop recording button */}
              {isRecording && (
                <button
                  onTouchStart={handleMicTouchStart}
                  onTouchMove={handleMicTouchMove}
                  onTouchEnd={handleMicTouchEnd}
                  onClick={handleRightBtnClick}
                  className="w-9 h-9 rounded-xl bg-orange-600 text-white scale-110 flex items-center justify-center transition-all shrink-0"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
