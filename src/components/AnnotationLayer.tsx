import { useRef } from 'react'
import type { Annotation, NormalizedBox } from '../types/slides'

type Props = { annotations: Annotation[]; activeId?: string; manualMode: boolean; onSelect: (annotation: Annotation) => void; onManualCreate: (bbox: NormalizedBox) => void }

function box(annotation: Annotation) { const { x, y, w, h } = annotation.bbox; return { x: x * 1000, y: y * 1000, width: w * 1000, height: h * 1000 } }

export function AnnotationLayer({ annotations, activeId, manualMode, onSelect, onManualCreate }: Props) {
  const start = useRef<{ x: number; y: number } | undefined>(undefined)
  function point(event: React.PointerEvent<SVGSVGElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) } }
  function pointerDown(event: React.PointerEvent<SVGSVGElement>) { if (manualMode) start.current = point(event) }
  function pointerUp(event: React.PointerEvent<SVGSVGElement>) { if (!manualMode || !start.current) return; const end = point(event); onManualCreate({ x: Math.min(start.current.x, end.x), y: Math.min(start.current.y, end.y), w: Math.abs(end.x - start.current.x) || 0.04, h: Math.abs(end.y - start.current.y) || 0.04 }); start.current = undefined }
  return <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none" onPointerDown={pointerDown} onPointerUp={pointerUp}>
    {annotations.map((annotation) => { const shape = box(annotation); const selected = annotation.id === activeId; const common = { className: `cursor-pointer ${selected ? 'annotation-active' : ''}`, onClick: () => onSelect(annotation) }; if (annotation.type === 'underline') return <line key={annotation.id} {...common} x1={shape.x} y1={shape.y + shape.height} x2={shape.x + shape.width} y2={shape.y + shape.height} stroke={annotation.color} strokeWidth="8" />; if (annotation.type === 'circle') return <ellipse key={annotation.id} {...common} cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} fill="none" stroke={annotation.color} strokeWidth="8" />; if (annotation.type === 'arrow') return <line key={annotation.id} {...common} x1={shape.x} y1={shape.y + shape.height} x2={shape.x + shape.width} y2={shape.y} stroke={annotation.color} strokeWidth="8" markerEnd="url(#arrowhead)" />; return <g key={annotation.id} {...common}><rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx="10" fill={annotation.color} fillOpacity={annotation.type === 'highlight' ? 0.3 : 0.12} stroke={annotation.color} strokeWidth={selected ? 7 : 4} /><title>{annotation.note ?? annotation.targetText ?? annotation.directive}</title>{annotation.type === 'note' && <text x={shape.x + shape.width + 12} y={shape.y + 24} fill={annotation.color} fontSize="22">{annotation.note ?? 'Not'}</text>}</g> })}
    <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" /></marker></defs>
  </svg>
}