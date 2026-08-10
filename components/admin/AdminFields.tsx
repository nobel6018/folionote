import * as React from 'react'

import styles from './Admin.module.css'

/** 라벨 + 컨트롤 한 줄 */
export function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {hint && <span className={styles.fieldHint}>{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  value: string | number | undefined
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}) {
  return (
    <input
      className={styles.input}
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function ColorInput({
  value,
  onChange,
  fallback
}: {
  value: string | undefined
  onChange: (value: string) => void
  fallback: string
}) {
  return (
    <span className={styles.colorRow}>
      <input
        className={styles.colorSwatch}
        type='color'
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        className={styles.input}
        type='text'
        value={value ?? ''}
        placeholder={fallback}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  )
}

export function Select({
  value,
  onChange,
  options
}: {
  value: string | undefined
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      className={styles.input}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className={styles.toggle}>
      <input
        type='checkbox'
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}
