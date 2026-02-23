"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Send, Eye, Calendar, Search, X,
  Users, Clock, Mail, Loader2, FileText, CheckCircle, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardCentered } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";

const WysiwygEditor = dynamic(() => import("@/components/wysiwyg-editor"), {
  ssr: false,
});

interface Newsletter {
  id: string;
  subject: string;
  htmlContent: string;
  status: string;
  sentAt: string | null;
  sentCount: number;
  scheduledFor: string | null;
  recipientType: string;
  recipientEmails: string[];
  createdAt: string;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
}

const inputClass =
  "px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500";

export default function NewslettersPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientCount, setClientCount] = useState(0);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const [recipientType, setRecipientType] = useState<"all" | "selected">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);

  // Recipient picker dialog
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState<Recipient[]>([]);
  const [searchingRecipients, setSearchingRecipients] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [newsletterToSend, setNewsletterToSend] = useState<Newsletter | null>(null);
  const [sending, setSending] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newsletterToDelete, setNewsletterToDelete] = useState<Newsletter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAuthorized = userRole === "ADMIN" || userRole === "MANAGER";

  const fetchNewsletters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/newsletters");
      if (!res.ok) throw new Error();
      setNewsletters(await res.json());
    } catch {
      toast.error("Impossible de charger les newsletters");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClientCount = useCallback(async () => {
    try {
      const res = await fetch("/api/newsletters/client-count");
      if (res.ok) {
        const data = await res.json();
        setClientCount(data.count);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchNewsletters();
      fetchClientCount();
    }
  }, [isAuthorized, fetchNewsletters, fetchClientCount]);

  const searchRecipients = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setRecipientResults([]); return; }
    try {
      setSearchingRecipients(true);
      const res = await fetch(`/api/newsletters/recipients?search=${encodeURIComponent(query)}`);
      if (res.ok) setRecipientResults(await res.json());
    } catch {
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearchingRecipients(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (recipientDialogOpen) searchRecipients(recipientSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [recipientSearch, recipientDialogOpen, searchRecipients]);

  const resetEditor = () => {
    setEditingNewsletter(null);
    setSubject("");
    setHtmlContent("");
    setScheduleEnabled(false);
    setScheduledFor("");
    setRecipientType("all");
    setSelectedRecipients([]);
    setRecipientSearch("");
    setRecipientResults([]);
  };

  const openCreateModal = () => { resetEditor(); setEditorOpen(true); };

  const openEditModal = (n: Newsletter) => {
    setEditingNewsletter(n);
    setSubject(n.subject);
    setHtmlContent(n.htmlContent);
    setScheduleEnabled(!!n.scheduledFor);
    setScheduledFor(n.scheduledFor ? new Date(n.scheduledFor).toISOString().slice(0, 16) : "");
    setRecipientType(n.recipientType === "selected" ? "selected" : "all");
    if (n.recipientType === "selected" && n.recipientEmails.length > 0) {
      setSelectedRecipients(n.recipientEmails.map((email, i) => ({ id: `e-${i}`, name: email, email, role: "" })));
    } else {
      setSelectedRecipients([]);
    }
    setRecipientSearch("");
    setRecipientResults([]);
    setEditorOpen(true);
  };

  const closeEditorModal = () => { setEditorOpen(false); resetEditor(); };

  const handleSave = async () => {
    if (!subject.trim()) { toast.error("Le sujet est requis"); return; }
    if (!htmlContent.trim()) { toast.error("Le contenu est requis"); return; }

    const body: Record<string, any> = {
      subject: subject.trim(),
      htmlContent,
      recipientType,
      recipientEmails: recipientType === "selected" ? selectedRecipients.map((r) => r.email) : [],
      scheduledFor: scheduleEnabled && scheduledFor ? new Date(scheduledFor).toISOString() : null,
    };

    try {
      setSaving(true);
      const res = editingNewsletter
        ? await fetch(`/api/newsletters/${editingNewsletter.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/newsletters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.message || "Erreur"); }
      toast.success(editingNewsletter ? "Newsletter mise à jour" : "Newsletter créée");
      closeEditorModal();
      fetchNewsletters();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!newsletterToSend) return;
    try {
      setSending(true);
      const res = await fetch(`/api/newsletters/${newsletterToSend.id}/send`, { method: "POST" });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.message || "Erreur"); }
      toast.success("Newsletter envoyée avec succès");
      setSendDialogOpen(false);
      setNewsletterToSend(null);
      fetchNewsletters();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!newsletterToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/newsletters/${newsletterToDelete.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.message || "Erreur"); }
      toast.success("Newsletter supprimée");
      setDeleteDialogOpen(false);
      setNewsletterToDelete(null);
      fetchNewsletters();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const toggleRecipient = (r: Recipient) => {
    setSelectedRecipients((prev) =>
      prev.find((x) => x.email === r.email) ? prev.filter((x) => x.email !== r.email) : [...prev, r]
    );
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card><CardContent className="p-8 text-center">
          <h2 className="text-lg font-semibold text-white">Accès refusé</h2>
          <p className="mt-1 text-sm text-gray-400">Permissions insuffisantes.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  }

  const drafts = newsletters.filter((n) => n.status === "draft");
  const scheduled = newsletters.filter((n) => n.status === "scheduled");
  const sent = newsletters.filter((n) => n.status === "sent");

  return (
    <div className="space-y-4">
      <PageHeader title="Newsletter" subtitle={`Gérez et envoyez vos newsletters · ${clientCount} client${clientCount > 1 ? "s" : ""}`}>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-sm font-medium text-white transition-colors">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nouvelle newsletter</span><span className="sm:hidden">Nouveau</span>
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCardCentered icon={FileText} value={drafts.length} label="Brouillons" color="orange" />
        <StatCardCentered icon={Clock} value={scheduled.length} label="Programmées" color="cyan" />
        <StatCardCentered icon={CheckCircle} value={sent.length} label="Envoyées" color="green" />
      </div>

      {/* List */}
      {newsletters.length === 0 ? (
        <EmptyState icon={Mail} message="Aucune newsletter">
          <button onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-sm font-medium text-white transition-colors">
            <Plus className="w-4 h-4" /> Créer une newsletter
          </button>
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {newsletters.map((n) => (
            <Card key={n.id} hover>
              <CardContent className="py-3 px-3 sm:px-4">
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0",
                    n.status === "sent" ? "bg-green-500/10" : n.status === "scheduled" ? "bg-cyan-500/10" : "bg-gray-800"
                  )}>
                    {n.status === "sent" ? <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" /> :
                     n.status === "scheduled" ? <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> :
                     <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate">{n.subject}</p>
                      <span className={cn(
                        "px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium shrink-0",
                        n.status === "sent" ? "bg-green-500/20 text-green-400" :
                        n.status === "scheduled" ? "bg-cyan-500/20 text-cyan-400" :
                        "bg-gray-700/50 text-gray-400"
                      )}>
                        {n.status === "sent" ? "Envoyé" : n.status === "scheduled" ? "Programmé" : "Brouillon"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                      <span className="text-[10px] sm:text-[11px] text-gray-500 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {n.recipientType === "selected" && n.recipientEmails.length > 0
                          ? `${n.recipientEmails.length} dest.`
                          : "Tous"}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-gray-500">{formatDate(n.createdAt)}</span>
                      {n.status === "sent" && n.sentAt && (
                        <span className="text-[10px] sm:text-[11px] text-green-500/70">
                          {n.sentCount} envoyé{n.sentCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {n.status === "scheduled" && n.scheduledFor && (
                        <span className="text-[10px] sm:text-[11px] text-cyan-500/70">
                          Prévu {formatDate(n.scheduledFor)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => { setPreviewContent(n.htmlContent); setPreviewOpen(true); }}
                      className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="Aperçu">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    {n.status !== "sent" && (
                      <>
                        <button onClick={() => openEditModal(n)}
                          className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors" title="Modifier">
                          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={() => { setNewsletterToSend(n); setSendDialogOpen(true); }}
                          className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors" title="Envoyer">
                          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => { setNewsletterToDelete(n); setDeleteDialogOpen(true); }}
                      className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Editor Modal (fullscreen mobile, centered desktop) ─── */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-start justify-center sm:overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden sm:block" onClick={closeEditorModal} />
          <div className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:mx-4 sm:my-6 bg-gray-900 sm:border sm:border-gray-800 sm:rounded-2xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-800/50 shrink-0">
              <h2 className="text-sm sm:text-[15px] font-semibold text-white">
                {editingNewsletter ? "Modifier la newsletter" : "Nouvelle newsletter"}
              </h2>
              <button onClick={closeEditorModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
              {/* Subject */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Sujet *</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Sujet de la newsletter..."
                  className={inputClass + " w-full"} />
              </div>

              {/* WYSIWYG */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Contenu</label>
                <WysiwygEditor value={htmlContent} onChange={setHtmlContent} minHeight={150} />
              </div>

              {/* Schedule */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <button type="button" role="switch" aria-checked={scheduleEnabled}
                      onClick={() => { setScheduleEnabled(!scheduleEnabled); if (scheduleEnabled) setScheduledFor(""); }}
                      className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
                        scheduleEnabled ? "bg-orange-600" : "bg-gray-600"
                      )}>
                      <span className={cn("pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5",
                        scheduleEnabled ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                      )} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-white">Programmer l&apos;envoi</p>
                      <p className="text-[11px] text-gray-500">Envoi automatique à la date choisie</p>
                    </div>
                  </div>
                  {scheduleEnabled && (
                    <div className="mt-3">
                      <label className="text-xs text-gray-400 mb-1 block">Date et heure</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                        <input type="datetime-local" value={scheduledFor}
                          onChange={(e) => setScheduledFor(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className={inputClass + " w-full pl-9 [&::-webkit-calendar-picker-indicator]:invert"} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recipients — compact selector + button to open dialog */}
              <Card>
                <CardContent className="p-3">
                  <label className="text-xs text-gray-400 mb-2 block">Destinataires</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setRecipientType("all"); setSelectedRecipients([]); }}
                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors border",
                        recipientType === "all" ? "border-orange-500 bg-orange-600/10 text-orange-400" : "border-gray-700 bg-gray-800 text-gray-400"
                      )}>
                      <Users className="w-3.5 h-3.5" /> Tous ({clientCount})
                    </button>
                    <button type="button" onClick={() => { setRecipientType("selected"); setRecipientDialogOpen(true); }}
                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors border",
                        recipientType === "selected" ? "border-orange-500 bg-orange-600/10 text-orange-400" : "border-gray-700 bg-gray-800 text-gray-400"
                      )}>
                      <UserPlus className="w-3.5 h-3.5" /> Spécifiques
                    </button>
                  </div>

                  {/* Show selected recipients as chips */}
                  {recipientType === "selected" && selectedRecipients.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRecipients.map((r) => (
                          <span key={r.email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-[11px] font-medium">
                            {r.name || r.email}
                            <button type="button" onClick={() => setSelectedRecipients((p) => p.filter((x) => x.email !== r.email))}
                              className="rounded-full p-0.5 hover:bg-orange-500/20 transition-colors">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <button type="button" onClick={() => setRecipientDialogOpen(true)}
                        className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors">
                        + Ajouter des destinataires
                      </button>
                    </div>
                  )}
                  {recipientType === "selected" && selectedRecipients.length === 0 && (
                    <p className="mt-2 text-[11px] text-gray-500">Aucun destinataire sélectionné</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Footer — sticky bottom */}
            <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-800/50 shrink-0">
              <button onClick={closeEditorModal}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || !subject.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingNewsletter ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Recipient Picker Dialog ─── */}
      <Dialog open={recipientDialogOpen} onClose={() => setRecipientDialogOpen(false)} title="Choisir les destinataires">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input type="text" value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className={inputClass + " w-full pl-10"}
              autoFocus />
            {searchingRecipients && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-500" />}
          </div>

          {/* Selected count */}
          {selectedRecipients.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                <span className="text-orange-400 font-medium">{selectedRecipients.length}</span> sélectionné{selectedRecipients.length > 1 ? "s" : ""}
              </p>
              <button type="button" onClick={() => setSelectedRecipients([])}
                className="text-[11px] text-red-400 hover:text-red-300 transition-colors">
                Tout désélectionner
              </button>
            </div>
          )}

          {/* Selected chips */}
          {selectedRecipients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {selectedRecipients.map((r) => (
                <span key={r.email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full text-[11px] font-medium">
                  {r.name || r.email}
                  <button type="button" onClick={() => setSelectedRecipients((p) => p.filter((x) => x.email !== r.email))}
                    className="rounded-full p-0.5 hover:bg-orange-500/20 transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Results list */}
          {recipientResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 divide-y divide-gray-800/50">
              {recipientResults.map((r) => {
                const sel = selectedRecipients.some((x) => x.email === r.email);
                return (
                  <button key={r.id} type="button" onClick={() => toggleRecipient(r)}
                    className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]",
                      sel && "bg-orange-500/5"
                    )}>
                    <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      sel ? "border-orange-500 bg-orange-600" : "border-gray-700 bg-gray-800"
                    )}>
                      {sel && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white truncate">{r.name}</span>
                        {r.role && (
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                            r.role === "ADMIN" ? "bg-red-500/20 text-red-400" :
                            r.role === "MANAGER" ? "bg-purple-500/20 text-purple-400" :
                            "bg-gray-700/50 text-gray-400"
                          )}>{r.role}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate block">{r.email}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {recipientSearch.length >= 2 && !searchingRecipients && recipientResults.length === 0 && (
            <div className="py-6 text-center">
              <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Aucun résultat pour &quot;{recipientSearch}&quot;</p>
            </div>
          )}

          {recipientSearch.length < 2 && recipientResults.length === 0 && (
            <div className="py-6 text-center">
              <Search className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Tapez au moins 2 caractères pour rechercher</p>
            </div>
          )}

          {/* Confirm button */}
          <button onClick={() => setRecipientDialogOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium transition-colors">
            <CheckCircle className="w-4 h-4" />
            Confirmer ({selectedRecipients.length} sélectionné{selectedRecipients.length > 1 ? "s" : ""})
          </button>
        </div>
      </Dialog>

      {/* ─── Preview Modal ─── */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title="Aperçu" size="lg">
        <div className="rounded-lg border border-gray-800 bg-white overflow-hidden">
          <iframe srcDoc={previewContent} title="Aperçu newsletter" className="w-full h-[55vh]" sandbox="allow-same-origin" />
        </div>
      </Dialog>

      {/* ─── Send Confirmation ─── */}
      <Dialog open={sendDialogOpen} onClose={() => { setSendDialogOpen(false); setNewsletterToSend(null); }} title="Confirmer l'envoi">
        {newsletterToSend && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
                <Send className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-sm text-gray-300">
                Envoyer <span className="font-semibold text-white">&quot;{newsletterToSend.subject}&quot;</span>
                {newsletterToSend.recipientType === "all"
                  ? <> à <span className="text-orange-400 font-medium">tous les clients</span> ({clientCount})</>
                  : <> à <span className="text-orange-400 font-medium">{newsletterToSend.recipientEmails.length} destinataire{newsletterToSend.recipientEmails.length > 1 ? "s" : ""}</span></>
                } ?
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Cette action est irréversible.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setSendDialogOpen(false); setNewsletterToSend(null); }} disabled={sending}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Annuler
              </button>
              <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setNewsletterToDelete(null); }} title="Supprimer la newsletter">
        {newsletterToDelete && (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-sm text-gray-300">
                Supprimer <span className="font-semibold text-white">&quot;{newsletterToDelete.subject}&quot;</span> ?
              </p>
              {newsletterToDelete.status === "scheduled" && (
                <p className="text-[11px] text-yellow-500 mt-1">L&apos;envoi programmé sera annulé.</p>
              )}
              <p className="text-[11px] text-gray-500 mt-1">Cette action est irréversible.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteDialogOpen(false); setNewsletterToDelete(null); }} disabled={deleting}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
