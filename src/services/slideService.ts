import { invoke } from '@tauri-apps/api/core'
import type { Annotation, AnnotationResult, Slide } from '../types/slides'

function requireTauriRuntime(): void {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    throw new Error('Slayt modu yalnızca Takex masaüstü uygulamasında kullanılabilir. `pnpm tauri dev` ile başlatın.')
  }
}

export function importSlideImage(path: string): Promise<Slide> {
  requireTauriRuntime()
  return invoke<Slide>('import_slide_image', { path })
}

export function importSlideFile(path: string): Promise<Slide[]> {
  requireTauriRuntime()
  if (path.toLowerCase().endsWith('.pdf')) return invoke<Slide[]>('import_slide_pdf', { path })
  return invoke<Slide>('import_slide_image', { path }).then((slide) => [slide])
}

export function loadAnnotations(slideId: string): Promise<Annotation[]> {
  requireTauriRuntime()
  return invoke<Annotation[]>('load_annotations', { slideId })
}

export function saveAnnotations(slideId: string, annotations: Annotation[]): Promise<void> {
  requireTauriRuntime()
  return invoke('save_annotations', { slideId, annotations })
}

export function callAiAnnotate(imageBase64: string, directive: string, existingAnnotations: Annotation[]): Promise<AnnotationResult> {
  requireTauriRuntime()
  return invoke<AnnotationResult>('call_ai_annotate', { imageBase64, directive, existingAnnotations })
}