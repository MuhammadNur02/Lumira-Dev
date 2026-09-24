'use client'

import { Maximize2, Monitor, Smartphone, Tablet } from 'lucide-react'
import { SegmentedControl } from '@/components/lumira/segmented-control'
import type { DeviceKey } from './devices'

const OPTIONS = [
  { value: 'desktop' as const, label: 'Desktop', icon: <Monitor strokeWidth={1.75} aria-hidden /> },
  { value: 'tablet' as const, label: 'Tablet', icon: <Tablet strokeWidth={1.75} aria-hidden /> },
  { value: 'mobile' as const, label: 'Mobile', icon: <Smartphone strokeWidth={1.75} aria-hidden /> },
  { value: 'fit' as const, label: 'Fit', icon: <Maximize2 strokeWidth={1.75} aria-hidden /> },
]

/** Device presets (FR-LP-03/04): 1 · 2 · 3 · 0 shortcuts, labels from `xl` up. */
export function DeviceToggle({ value, onChange }: { value: DeviceKey; onChange: (device: DeviceKey) => void }) {
  return <SegmentedControl value={value} onValueChange={onChange} options={OPTIONS} label="Device" />
}
