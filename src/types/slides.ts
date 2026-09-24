export type AnnotationType = 'highlight' | 'underline' | 'circle' | 'note' | 'arrow'

export type SlideSession = {
  id: string
  title: string
  createdAt: string
  slideIds: string[]
}

export type Slide = {
  id: string
  sessionId: string
  imagePath: string
  order: number
  width: number
  height: number
}

export type NormalizedBox = { x: number; y: number; w: number; h: number }

export type Annotation = {
  id: string
  slideId: string
  type: AnnotationType
  bbox: NormalizedBox
  targetText?: string
  color: string
  note?: string
  directive: string
  confidence?: number
  createdAt: string
}

export type AnnotationResult = {
  type: AnnotationType
  bbox: [number, number, number, number]
  target_text?: string
  color?: string
  note?: string
  confidence?: number
}