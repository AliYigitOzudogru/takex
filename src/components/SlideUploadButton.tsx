import { ImagePlus } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'

type Props = { onSelect: (path: string) => Promise<void>; loading: boolean }
export function SlideUploadButton({ onSelect, loading }: Props) { async function choose() { const selected = await open({ multiple: false, title: 'Slayt görseli veya PDF seç', filters: [{ name: 'Slaytlar', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'] }] }); if (typeof selected === 'string') await onSelect(selected) } return <button type="button" onClick={() => void choose()} disabled={loading} className="inline-flex items-center gap-2 bg-emerald-400 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-40"><ImagePlus size={15} />{loading ? 'Yükleniyor...' : 'Slayt ekle'}</button> }