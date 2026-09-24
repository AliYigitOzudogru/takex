import { convertFileSrc } from '@tauri-apps/api/core'
import { useEffect, useRef, useState } from 'react'
import type { Annotation, NormalizedBox, Slide } from '../types/slides'
import { AnnotationLayer } from './AnnotationLayer'

type Props = { slide?: Slide; annotations: Annotation[]; activeId?: string; manualMode: boolean; onSelect: (annotation: Annotation) => void; onManualCreate: (bbox: NormalizedBox) => void }

export function SlideCanvas({ slide, annotations, activeId, manualMode, onSelect, onManualCreate }: Props) {
  const frame = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => { if (!frame.current) return; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(frame.current); return () => observer.disconnect() }, [])
  if (!slide) return <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-zinc-600">Bir slayt yükleyerek başlayın.</div>
  return <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-5"><div ref={frame} data-render-size={`${size.width}x${size.height}`} style={{ aspectRatio: `${slide.width} / ${slide.height}`, maxHeight: '100%', width: '100%' }} className="relative max-w-full overflow-hidden border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/30"><img src={convertFileSrc(slide.imagePath)} alt="Aktif slayt" className="block h-full w-full object-contain" draggable={false} /><AnnotationLayer annotations={annotations} activeId={activeId} manualMode={manualMode} onSelect={onSelect} onManualCreate={onManualCreate} /></div></div>
}