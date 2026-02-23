"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Unlink, Heading2, Type, Undo2, Redo2,
  Image, Upload, X, Check, Loader2, Paintbrush, Highlighter,
} from "lucide-react";

interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TEXT_COLORS = [
  "#111827", "#374151", "#6b7280", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
];

const BG_COLORS = [
  "transparent", "#fecaca", "#fed7aa", "#fef08a",
  "#bbf7d0", "#bae6fd", "#c7d2fe", "#f5d0fe",
  "#fca5a5", "#fdba74", "#fde047", "#86efac",
  "#7dd3fc", "#a5b4fc", "#e879f9", "#374151",
];

function ToolBtn({
  icon: Icon,
  title,
  onClick,
  active,
}: {
  icon: any;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? "bg-orange-500/20 text-orange-500"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export default function WysiwygEditor({
  value,
  onChange,
  placeholder = "Composez votre message...",
  minHeight = 200,
}: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const internalChange = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState<"text" | "bg" | null>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const savedSelection = useRef<Range | null>(null);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && savedSelection.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  }

  useEffect(() => {
    if (editorRef.current && !internalChange.current) {
      editorRef.current.innerHTML = value || "";
    }
    internalChange.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      internalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      internalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  function openLinkDialog() {
    saveSelection();
    const sel = window.getSelection();
    setLinkText(sel?.toString() || "");
    setLinkUrl("");
    setShowLinkDialog(true);
  }

  function insertLinkConfirm() {
    if (!linkUrl.trim()) return;
    restoreSelection();
    const url = linkUrl.startsWith("http") ? linkUrl : "https://" + linkUrl;
    if (linkText && !window.getSelection()?.toString()) {
      exec("insertHTML", `<a href="${url}" target="_blank">${linkText}</a>`);
    } else {
      exec("createLink", url);
    }
    setShowLinkDialog(false);
  }

  function openColorPicker(type: "text" | "bg") {
    saveSelection();
    setShowColorPicker(showColorPicker === type ? null : type);
    setShowImageMenu(false);
  }

  function applyColor(color: string) {
    restoreSelection();
    if (showColorPicker === "text") {
      exec("foreColor", color);
    } else {
      if (color === "transparent") {
        exec("removeFormat");
      } else {
        exec("hiliteColor", color);
      }
    }
    setShowColorPicker(null);
  }

  function openImageMenu() {
    saveSelection();
    setImageUrl("");
    setShowImageMenu(!showImageMenu);
    setShowColorPicker(null);
  }

  function insertImageUrl() {
    if (!imageUrl.trim()) return;
    restoreSelection();
    exec("insertImage", imageUrl);
    setShowImageMenu(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        restoreSelection();
        exec("insertImage", data.url);
        setShowImageMenu(false);
      }
    } catch {}
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-popover]") && !t.closest("[data-tb]")) {
        setShowColorPicker(null);
        setShowImageMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="border border-gray-700 rounded-xl overflow-visible focus-within:border-orange-500 transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-800/50 border-b border-gray-700 rounded-t-xl">
        <ToolBtn icon={Bold} title="Gras" onClick={() => exec("bold")} />
        <ToolBtn icon={Italic} title="Italique" onClick={() => exec("italic")} />
        <ToolBtn icon={Underline} title="Souligné" onClick={() => exec("underline")} />
        <div className="w-px h-5 bg-gray-700 mx-1" />
        <ToolBtn icon={Heading2} title="Titre" onClick={() => exec("formatBlock", "h3")} />
        <ToolBtn icon={Type} title="Paragraphe" onClick={() => exec("formatBlock", "p")} />
        <div className="w-px h-5 bg-gray-700 mx-1" />
        <ToolBtn icon={List} title="Liste" onClick={() => exec("insertUnorderedList")} />
        <ToolBtn icon={ListOrdered} title="Liste numérotée" onClick={() => exec("insertOrderedList")} />
        <div className="w-px h-5 bg-gray-700 mx-1" />
        <ToolBtn icon={AlignLeft} title="Gauche" onClick={() => exec("justifyLeft")} />
        <ToolBtn icon={AlignCenter} title="Centre" onClick={() => exec("justifyCenter")} />
        <ToolBtn icon={AlignRight} title="Droite" onClick={() => exec("justifyRight")} />
        <div className="w-px h-5 bg-gray-700 mx-1" />

        <ToolBtn icon={Link2} title="Insérer un lien" onClick={openLinkDialog} />
        <ToolBtn icon={Unlink} title="Supprimer lien" onClick={() => exec("unlink")} />

        {/* Image */}
        <div className="relative" data-tb>
          <ToolBtn icon={Image} title="Image" onClick={openImageMenu} active={showImageMenu} />
          {showImageMenu && (
            <div data-popover className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-3 w-72">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Insérer une image</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center gap-2 px-3 py-2.5 mb-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-500 text-[13px] font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Envoi en cours..." : "Importer depuis le PC"}
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ou coller une URL..."
                  className="flex-1 px-2.5 py-2 text-[13px] bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  onKeyDown={(e) => { if (e.key === "Enter") insertImageUrl(); }}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={insertImageUrl}
                  disabled={!imageUrl.trim()}
                  className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-30 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* Text Color */}
        <div className="relative" data-tb>
          <ToolBtn icon={Paintbrush} title="Couleur du texte" onClick={() => openColorPicker("text")} active={showColorPicker === "text"} />
          {showColorPicker === "text" && (
            <div data-popover className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Couleur du texte</p>
              <div className="grid grid-cols-6 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyColor(c)}
                    className="w-7 h-7 rounded-lg border-2 border-gray-700 hover:border-orange-500 hover:scale-110 transition-all"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Background Color */}
        <div className="relative" data-tb>
          <ToolBtn icon={Highlighter} title="Surlignage" onClick={() => openColorPicker("bg")} active={showColorPicker === "bg"} />
          {showColorPicker === "bg" && (
            <div data-popover className="absolute top-full right-0 mt-1 z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Surlignage</p>
              <div className="grid grid-cols-8 gap-1.5">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyColor(c)}
                    className="w-6 h-6 rounded-md border-2 border-gray-700 hover:border-orange-500 hover:scale-110 transition-all flex items-center justify-center"
                    style={{ backgroundColor: c === "transparent" ? undefined : c }}
                    title={c === "transparent" ? "Aucun" : c}
                  >
                    {c === "transparent" && <X className="w-3 h-3 text-gray-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-700 mx-1" />
        <ToolBtn icon={Undo2} title="Annuler" onClick={() => exec("undo")} />
        <ToolBtn icon={Redo2} title="Rétablir" onClick={() => exec("redo")} />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        dir="ltr"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="px-4 py-3 text-sm text-white bg-gray-900 outline-none overflow-y-auto rounded-b-xl
          [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-500
          [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2
          [&_p]:mb-1
          [&_a]:text-orange-400 [&_a]:underline
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
          [&_li]:mb-0.5
          [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2"
        style={{ minHeight }}
      />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowLinkDialog(false); }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-orange-500" /> Insérer un lien
              </h3>
              <button onClick={() => setShowLinkDialog(false)} className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-400 mb-1">Texte du lien</label>
                <input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Texte affiché"
                  className="w-full px-3.5 py-2.5 text-[13px] bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-400 mb-1">URL</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemple.com"
                  className="w-full px-3.5 py-2.5 text-[13px] bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter") insertLinkConfirm(); }}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-2 text-[13px] text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={insertLinkConfirm}
                disabled={!linkUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-[13px] font-medium rounded-xl transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Insérer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
