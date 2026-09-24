import { AlertCircle, Undo2 } from 'lucide-react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import { callAiAnnotate, importSlideFile, loadAnnotations, saveAnnotations } from '../services/slideService'
import type { Annotation, NormalizedBox, Slide } from '../types/slides'
import { DirectiveHistoryPanel } from './DirectiveHistoryPanel'
import { DirectiveInput } from './DirectiveInput'
import { SlideCanvas } from './SlideCanvas'
import { SlideThumbnailStrip } from './SlideThumbnailStrip'
import { SlideUploadButton } from './SlideUploadButton'

const SESSION_KEY = 'takex_slide_session'
const LOW_CONFIDENCE = 0.45

function clampBox(box: NormalizedBox): NormalizedBox { return { x: Math.max(0, Math.min(1, box.x)), y: Math.max(0, Math.min(1, box.y)), w: Math.max(0.01, Math.min(1 - box.x, box.w)), h: Math.max(0.01, Math.min(1 - box.y, box.h)) } }
async function imageBase64(path: string): Promise<string> { const response = await fetch(path); const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary) }

export function SlidesView() {
  const [slides, setSlides] = useState<Slide[]>(() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? '[]') as Slide[] } catch { return [] } })
  const [activeId, setActiveId] = useState<string>()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [manualMode, setManualMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const activeSlide = slides.find((slide) => slide.id === activeId)
  useEffect(() => { localStorage.setItem(SESSION_KEY, JSON.stringify(slides)); if (!activeId && slides[0]) setActiveId(slides[0].id) }, [slides, activeId])
  useEffect(() => { if (!activeSlide) { setAnnotations([]); return } void loadAnnotations(activeSlide.id).then(setAnnotations).catch((caught) => setError(caught instanceof Error ? caught.message : 'Anotasyonlar yüklenemedi.')) }, [activeId])
  useEffect(() => { if (!activeSlide) return; const timer = window.setTimeout(() => void saveAnnotations(activeSlide.id, annotations).catch((caught) => setError(caught instanceof Error ? caught.message : 'Anotasyonlar kaydedilemedi.')), 500); return () => window.clearTimeout(timer) }, [annotations, activeSlide])
  useEffect(() => { function undo(event: KeyboardEvent) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); const last = annotations[annotations.length - 1]; if (last) remove(last.id) } } window.addEventListener('keydown', undo); return () => window.removeEventListener('keydown', undo) }, [annotations])

  async function upload(path: string) { setUploading(true); setError(''); try { const imported = await importSlideFile(path); const nextSlides = imported.map((slide, index) => ({ ...slide, order: slides.length + index })); setSlides((current) => [...current, ...nextSlides]); setActiveId(nextSlides[0]?.id) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Slayt yüklenemedi.') } finally { setUploading(false) } }
  function addManual(bbox: NormalizedBox) { if (!activeSlide) return; const annotation: Annotation = { id: crypto.randomUUID(), slideId: activeSlide.id, type: 'circle', bbox: clampBox(bbox), color: '#fbbf24', directive: 'Manuel işaretleme', createdAt: new Date().toISOString(), confidence: 1 }; setAnnotations((current) => [...current, annotation]); setSelectedId(annotation.id); setManualMode(false) }
  async function submit(directive: string): Promise<boolean> { if (!activeSlide) return false; setLoading(true); setError(''); try { const result = await callAiAnnotate(await imageBase64(convertFileSrc(activeSlide.imagePath)), directive, annotations); if ((result.confidence ?? 0) < LOW_CONFIDENCE) { setManualMode(true); setError('AI konumu tam bulamadı, elle işaretleyebilirsin.'); return false } const annotation: Annotation = { id: crypto.randomUUID(), slideId: activeSlide.id, type: result.type, bbox: clampBox({ x: result.bbox[0], y: result.bbox[1], w: result.bbox[2], h: result.bbox[3] }), targetText: result.target_text, color: result.color ?? '#fbbf24', note: result.note, directive, confidence: result.confidence, createdAt: new Date().toISOString() }; setAnnotations((current) => [...current, annotation]); setSelectedId(annotation.id); return true } catch (caught) { const message = caught instanceof Error ? caught.message : typeof caught === 'string' ? caught : 'AI isteği başarısız oldu. Direktif korunmadı; tekrar deneyebilirsin.'; setError(message); return false } finally { setLoading(false) } }
  function remove(id: string) { setAnnotations((current) => current.filter((annotation) => annotation.id !== id)); if (selectedId === id) setSelectedId(undefined) }
  return <section className="flex min-h-0 flex-1 flex-col bg-zinc-900"><header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Slayt modu</p><h1 className="mt-1 text-lg font-semibold text-zinc-100">Canlı ders anotasyonları</h1></div><div className="flex items-center gap-2"><button type="button" onClick={() => { const last = annotations[annotations.length - 1]; if (last) remove(last.id) }} disabled={!annotations.length} title="Son anotasyonu geri al" className="inline-flex items-center gap-1.5 border border-zinc-700 px-2.5 py-2 text-xs text-zinc-300 disabled:opacity-30"><Undo2 size={14} />Geri al</button><SlideUploadButton onSelect={upload} loading={uploading} /></div></header>{error && <div className="flex shrink-0 items-center gap-2 border-b border-amber-400/20 bg-amber-400/5 px-5 py-2.5 text-xs text-amber-200"><AlertCircle size={14} />{error}</div>}<div className="flex min-h-0 flex-1"><div className="flex min-w-0 flex-1 flex-col"><SlideCanvas slide={activeSlide} annotations={annotations} activeId={selectedId} manualMode={manualMode} onSelect={(annotation) => setSelectedId(annotation.id)} onManualCreate={addManual} /><DirectiveInput loading={loading} disabled={!activeSlide || manualMode} onSubmit={submit} /><SlideThumbnailStrip slides={slides} activeId={activeId} onSelect={(slide) => { setActiveId(slide.id); setSelectedId(undefined); setManualMode(false) }} /></div><DirectiveHistoryPanel annotations={annotations} activeId={selectedId} onSelect={(annotation) => setSelectedId(annotation.id)} onDelete={remove} onColor={(id, color) => setAnnotations((current) => current.map((annotation) => annotation.id === id ? { ...annotation, color } : annotation))} /></div></section>
}