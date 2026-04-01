import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useStore } from '../store'
import {
  DOG_BREEDS,
  bodyTempC,
  breedByName,
  contactTempC,
  formatDisplayTemp,
  type AgeRange,
  type CatData,
  type CatPose,
  type DogData,
  type DogPose,
  type HumanData,
  type HumanPose,
  type Occupant,
} from '../thermalEngine'

interface Props {
  occupant: Occupant
  onClose: () => void
}

const HUMAN_POSES: Array<{ key: HumanPose; label: string }> = [
  { key: 'straight', label: 'Straight' },
  { key: 'side', label: 'Side' },
  { key: 'fetal', label: 'Curled' },
  { key: 'diagonal', label: 'Diagonal' },
]

const DOG_POSES: Array<{ key: DogPose; label: string }> = [
  { key: 'side', label: 'Side' },
  { key: 'sprawled', label: 'Sprawled' },
  { key: 'curled', label: 'Curled' },
]

const CAT_POSES: Array<{ key: CatPose; label: string }> = [
  { key: 'curled', label: 'Curled' },
  { key: 'loaf', label: 'Loaf' },
  { key: 'sprawled', label: 'Sprawled' },
]

export function Inspector({ occupant, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const tempUnit = useStore((state) => state.tempUnit)
  const updateOccupant = useStore((state) => state.updateOccupant)
  const updateOccupantData = useStore((state) => state.updateOccupantData)
  const removeOccupant = useStore((state) => state.removeOccupant)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        width: 280,
        maxWidth: 'calc(100vw - 36px)',
        background: 'rgba(22,16,10,0.96)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        boxShadow: '0 16px 38px rgba(0,0,0,0.45)',
        padding: 16,
        color: '#f4ead8',
        zIndex: 100,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff2dd' }}>{titleFor(occupant)}</div>
          <div style={{ fontSize: 12, color: '#b7a48e' }}>Simple metadata, believable temperatures, fixed poses.</div>
        </div>
        <button onClick={onClose} style={iconButtonStyle}>
          x
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <MetricCard label="Body temp" value={formatDisplayTemp(bodyTempC(occupant), tempUnit, false)} />
        <MetricCard label="Bed contact" value={formatDisplayTemp(contactTempC(occupant), tempUnit, false)} />
      </div>

      {occupant.data.species === 'human' && (
        <HumanFields data={occupant.data} onPatch={(patch) => updateOccupantData(occupant.id, patch)} />
      )}

      {occupant.data.species === 'dog' && (
        <DogFields data={occupant.data} onPatch={(patch) => updateOccupantData(occupant.id, patch)} />
      )}

      {occupant.data.species === 'cat' && (
        <CatFields data={occupant.data} onPatch={(patch) => updateOccupantData(occupant.id, patch)} />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={() => updateOccupant(occupant.id, { rotation: (occupant.rotation - 15 + 360) % 360 })}
          style={actionButtonStyle}
        >
          Rotate -15
        </button>
        <button
          onClick={() => updateOccupant(occupant.id, { rotation: (occupant.rotation + 15) % 360 })}
          style={actionButtonStyle}
        >
          Rotate +15
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => updateOccupant(occupant.id, { rotation: (180 - occupant.rotation + 360) % 360 })}
          style={actionButtonStyle}
        >
          Flip
        </button>
        <button
          onClick={() => {
            removeOccupant(occupant.id)
            onClose()
          }}
          style={{ ...actionButtonStyle, background: '#381512', color: '#ffb5aa', borderColor: 'rgba(255,128,110,0.18)' }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function HumanFields({
  data,
  onPatch,
}: {
  data: HumanData
  onPatch: (patch: Partial<HumanData>) => void
}) {
  return (
    <>
      <div style={fieldGridStyle}>
        <Field label="Height (in)">
          <input
            type="number"
            min={54}
            max={84}
            value={data.heightInches}
            onChange={(event) => onPatch({ heightInches: clampNumber(event.target.value, 54, 84) })}
            style={inputStyle}
          />
        </Field>
        <Field label="Weight (lb)">
          <input
            type="number"
            min={80}
            max={320}
            value={data.weightLbs}
            onChange={(event) => onPatch({ weightLbs: clampNumber(event.target.value, 80, 320) })}
            style={inputStyle}
          />
        </Field>
      </div>

      <div style={fieldGridStyle}>
        <Field label="Sex">
          <div style={segmentedRowStyle}>
            <SegmentButton active={data.sex === 'M'} onClick={() => onPatch({ sex: 'M' })}>
              Male
            </SegmentButton>
            <SegmentButton active={data.sex === 'F'} onClick={() => onPatch({ sex: 'F' })}>
              Female
            </SegmentButton>
          </div>
        </Field>
        <Field label="Age">
          <select
            value={data.ageRange}
            onChange={(event) => onPatch({ ageRange: event.target.value as AgeRange })}
            style={inputStyle}
          >
            <option value="child">Child</option>
            <option value="adult">Adult</option>
            <option value="senior">Senior</option>
          </select>
        </Field>
      </div>

      <ToggleRow label="Runs warm" value={data.runsWarm} onChange={(next) => onPatch({ runsWarm: next })} />
      <Field label="Pose">
        <PoseRow poses={HUMAN_POSES} current={data.pose} onChange={(pose) => onPatch({ pose: pose as HumanPose })} />
      </Field>
    </>
  )
}

function DogFields({
  data,
  onPatch,
}: {
  data: DogData
  onPatch: (patch: Partial<DogData>) => void
}) {
  return (
    <>
      <Field label="Breed">
        <select
          value={data.breedName}
          onChange={(event) => {
            const breed = breedByName(event.target.value)
            onPatch({ breedName: breed.name, weightLbs: breed.defaultWeightLbs })
          }}
          style={inputStyle}
        >
          {DOG_BREEDS.map((breed) => (
            <option key={breed.name} value={breed.name}>
              {breed.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Weight (lb)">
        <input
          type="number"
          min={3}
          max={200}
          value={data.weightLbs}
          onChange={(event) => onPatch({ weightLbs: clampNumber(event.target.value, 3, 200) })}
          style={inputStyle}
        />
      </Field>

      <ToggleRow label="Runs warm" value={data.runsWarm} onChange={(next) => onPatch({ runsWarm: next })} />
      <Field label="Pose">
        <PoseRow poses={DOG_POSES} current={data.pose} onChange={(pose) => onPatch({ pose: pose as DogPose })} />
      </Field>
    </>
  )
}

function CatFields({
  data,
  onPatch,
}: {
  data: CatData
  onPatch: (patch: Partial<CatData>) => void
}) {
  return (
    <>
      <Field label="Weight (lb)">
        <input
          type="number"
          min={4}
          max={25}
          value={data.weightLbs}
          onChange={(event) => onPatch({ weightLbs: clampNumber(event.target.value, 4, 25) })}
          style={inputStyle}
        />
      </Field>

      <ToggleRow label="Runs warm" value={data.runsWarm} onChange={(next) => onPatch({ runsWarm: next })} />
      <Field label="Pose">
        <PoseRow poses={CAT_POSES} current={data.pose} onChange={(pose) => onPatch({ pose: pose as CatPose })} />
      </Field>
    </>
  )
}

function titleFor(occupant: Occupant) {
  if (occupant.data.species === 'human') return 'Human'
  if (occupant.data.species === 'dog') return 'Dog'
  return 'Cat'
}

function clampNumber(raw: string, min: number, max: number) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, Math.round(parsed)))
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#a8927c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: '#2a2018',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: '#ab957f', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: '#fff2dd' }}>{value}</div>
    </div>
  )
}

function PoseRow({
  poses,
  current,
  onChange,
}: {
  poses: Array<{ key: string; label: string }>
  current: string
  onChange: (pose: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {poses.map((pose) => (
        <SegmentButton key={pose.key} active={pose.key === current} onClick={() => onChange(pose.key)}>
          {pose.label}
        </SegmentButton>
      ))}
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 10,
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        background: '#2a2018',
        color: '#f4ead8',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      <span
        style={{
          padding: '4px 8px',
          borderRadius: 999,
          background: value ? '#ffe0a2' : '#140f0c',
          color: value ? '#5f3919' : '#baa58f',
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {value ? 'On' : 'Off'}
      </span>
    </button>
  )
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 10px',
        borderRadius: 999,
        border: `1px solid ${active ? 'rgba(255,224,162,0.5)' : 'rgba(255,255,255,0.08)'}`,
        background: active ? '#ffe0a2' : '#221912',
        color: active ? '#4c2e15' : '#d7c7b6',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const iconButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#1a130e',
  color: '#bfa790',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 10px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#2a2018',
  color: '#fff2dd',
  fontSize: 14,
}

const actionButtonStyle: CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#2a2018',
  color: '#f4ead8',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const fieldGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  marginTop: 10,
}

const segmentedRowStyle: CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
}
