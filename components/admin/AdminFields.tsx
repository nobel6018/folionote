import * as React from 'react'

import styles from './Admin.module.css'

/**
 * 설정 한 줄. 라벨은 왼쪽, 컨트롤은 오른쪽에 붙는다 (macOS 시스템 설정 방식).
 * 라벨 열의 폭이 고정이라 그룹 안에서 값들이 오른쪽으로 정렬돼 훑기 쉽다.
 */
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
      <span className={styles.fieldControl}>{children}</span>
    </label>
  )
}

/**
 * 지금 열려 있는 탭. Section이 자기 탭과 비교해 스스로 숨는다.
 * 400줄짜리 JSX를 탭별로 다시 묶는 대신 각 Section에 tab만 달면 되게 했다.
 */
export const ActiveTabContext = React.createContext<string | null>(null)

/** 그룹 캡션 + 둥근 리스트 카드 */
export function Section({
  title,
  tab,
  children
}: {
  title: string
  /** 이 섹션이 속한 탭. 생략하면 항상 보인다 */
  tab?: string
  children: React.ReactNode
}) {
  const activeTab = React.useContext(ActiveTabContext)

  if (tab && activeTab && tab !== activeTab) {
    return null
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.group}>{children}</div>
    </section>
  )
}

/** 그룹 안에 넣는 안내 문구 */
export function Note({ children }: { children: React.ReactNode }) {
  return <p className={styles.note}>{children}</p>
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

/**
 * 스위치 한 줄. 기본 체크박스는 감추고 트랙/노브를 직접 그린다.
 * 브라우저 기본 체크박스는 강제 다크모드에서 색이 뒤집히는 데다,
 * 라벨 좌 / 컨트롤 우 정렬을 맞출 수 없다.
 */
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
      <span className={styles.toggleLabel}>{label}</span>
      <input
        type='checkbox'
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.track}>
        <span className={styles.knob} />
      </span>
    </label>
  )
}
