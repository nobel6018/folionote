import { type GetServerSideProps } from 'next'
import Head from 'next/head'
import * as React from 'react'

import styles from '@/components/admin/Admin.module.css'
import {
  ActiveTabContext,
  ColorInput,
  Field,
  ImageInput,
  Note,
  PresetTextInput,
  Section,
  Select,
  TextInput,
  Toggle
} from '@/components/admin/AdminFields'
import { CodeView } from '@/components/admin/CodeView'
import { isDeployedAdminEnabled } from '@/lib/admin/env'
import { repoSlug, targetBranch } from '@/lib/admin/github'
import { getSession } from '@/lib/admin/request'
import { isDev } from '@/lib/config'
import { FONT_REGISTRY } from '@/lib/fonts'
import { serializeSiteConfig } from '@/lib/serialize-site-config'
import { type NavigationLink, type SiteConfig } from '@/lib/site-config'

/**
 * 설정 편집 화면. **개발 서버에서만 열린다.**
 *
 * `next build` 때는 isDev가 false여서 notFound를 돌려주므로 프로덕션 번들에
 * 페이지가 만들어지지 않는다. 배포된 사이트에서 설정을 고칠 수 있게 열어 두면
 * 인증 없는 원격 파일 수정 창구가 된다.
 *
 * 저장하면 site.config.ts를 다시 쓴다. dev 서버가 변경을 감지해 다시 컴파일하고,
 * 오른쪽 미리보기를 새로고침하면 반영된 화면이 보인다. 커밋과 배포는 사용자가 한다.
 *
 * @see pages/api/admin/config.ts
 * @see lib/serialize-site-config.ts
 */
export const getServerSideProps: GetServerSideProps<AdminPageProps> = async ({
  req,
  query
}) => {
  // 로컬 개발이 아니고 배포 어드민도 꺼져 있으면 페이지 자체가 없는 것으로 둔다.
  if (!isDev && !isDeployedAdminEnabled) {
    return { notFound: true }
  }

  const session = getSession(req)

  return {
    props: {
      mode: isDev ? 'local' : 'deployed',
      login: session?.login ?? null,
      avatarUrl: session?.avatarUrl ?? null,
      repo: isDev ? null : (repoSlug ?? null),
      branch: isDev ? null : targetBranch,
      error: typeof query.error === 'string' ? query.error : null
    }
  }
}

const FONT_OPTIONS = [
  { value: '', label: '기본 (Pretendard)' },
  ...Object.entries(FONT_REGISTRY).map(([key, entry]) => ({
    value: key,
    label: `${entry.family} (${key})`
  }))
]

/**
 * 날짜 형식 프리셋. 형식 문자열을 외워서 타이핑하게 하지 않는다.
 * 라벨에 실제 출력 예시를 함께 보여줘야 고를 수 있다.
 *
 * 토큰 치환은 단순 문자열 교체라 '년' '월' 같은 한글 리터럴도 그대로 통한다.
 * @see lib/format-date.ts
 */
const DATE_FORMATS = [
  { value: 'YYYY/MM/DD', label: '2026/07/04' },
  { value: 'YYYY-MM-DD', label: '2026-07-04' },
  { value: 'YYYY. MM. DD.', label: '2026. 07. 04.' },
  { value: 'YYYY년 M월 D일', label: '2026년 7월 4일' },
  { value: 'M/D/YYYY', label: '7/4/2026' },
  { value: 'MMM D, YYYY', label: 'Jul 4, 2026' },
  { value: 'MMMM D, YYYY', label: 'July 4, 2026' },
  { value: 'D MMM YYYY', label: '4 Jul 2026' }
]

/** 색 프리셋. 각 목록의 첫 항목이 그 필드의 기본값이다 */
const PROGRESS_COLORS = [
  { value: '#007FB8', label: '기본 (바다)' },
  { value: '#3B82F6', label: '파랑' },
  { value: '#10B981', label: '초록' },
  { value: '#EF4444', label: '빨강' },
  { value: '#8B5CF6', label: '보라' },
  { value: '#111827', label: '검정' }
]

const ACCENT_COLORS = [
  { value: '#53A1C9', label: '기본 (하늘)' },
  { value: '#0B6EA8', label: '진한 파랑' },
  { value: '#10B981', label: '초록' },
  { value: '#EF4444', label: '빨강' },
  { value: '#111827', label: '검정' }
]

const BACKGROUND_COLORS = [
  { value: '#FFFFFF', label: '흰색' },
  { value: '#FBF9F4', label: '아이보리' },
  { value: '#F5F6F7', label: '연회색' },
  { value: '#191919', label: '검정' }
]

const FOREGROUND_COLORS = [
  { value: '#37352F', label: 'Notion 기본' },
  { value: '#111111', label: '검정' },
  { value: '#3D4A56', label: '진회색' },
  { value: '#FFFFFF', label: '흰색' }
]

const CTA_BACKGROUND_COLORS = [
  { value: '#FFFFFF', label: '흰색' },
  { value: '#111827', label: '검정' },
  { value: '#0B6EA8', label: '파랑' },
  { value: '#10B981', label: '초록' }
]

const CTA_TEXT_COLORS = [
  { value: '#000000', label: '검정' },
  { value: '#FFFFFF', label: '흰색' }
]

/**
 * 테마 프리셋.
 *
 * 색 하나하나를 골라 조합을 맞추는 건 품이 많이 든다. 어울리는 값을 묶어두고
 * 한 번에 적용한 뒤, 마음에 안 드는 항목만 아래에서 고치게 한다.
 *
 * patch에는 **보이는 것만** 담는다. navigationLinks나 bottomNavigation.links처럼
 * 사용자가 쌓아둔 구조는 테마를 바꿔도 사라지면 안 되므로 건드리지 않는다.
 */
const THEMES: Array<{
  id: string
  label: string
  hint: string
  /** 카드에 찍는 미리보기 색 (배경, 글자, 강조) */
  swatches: [string, string, string]
  patch: {
    colorTheme: SiteConfig['colorTheme']
    progressColor: string
    accentColor: string
  }
}> = [
  {
    id: 'default',
    label: '기본',
    hint: 'OS 설정을 따라 라이트/다크가 바뀝니다',
    swatches: ['#FFFFFF', '#37352F', '#007FB8'],
    patch: {
      colorTheme: { mode: 'system' },
      progressColor: '#007FB8',
      accentColor: '#53A1C9'
    }
  },
  {
    id: 'mono',
    label: '모노크롬',
    hint: '색을 쓰지 않아 글과 사진만 남습니다',
    swatches: ['#FFFFFF', '#111827', '#111827'],
    patch: {
      colorTheme: { mode: 'light' },
      progressColor: '#111827',
      accentColor: '#111827'
    }
  },
  {
    id: 'dark',
    label: '다크',
    hint: '항상 어두운 화면으로 고정합니다',
    swatches: ['#191919', '#E8EAED', '#5B7CFA'],
    patch: {
      colorTheme: { mode: 'dark' },
      progressColor: '#5B7CFA',
      accentColor: '#5B7CFA'
    }
  },
  {
    id: 'paper',
    label: '웜 페이퍼',
    hint: '종이 같은 배경에 따뜻한 강조색',
    swatches: ['#FBF9F4', '#37352F', '#A8503A'],
    patch: {
      colorTheme: {
        mode: 'custom',
        background: '#FBF9F4',
        foreground: '#37352F'
      },
      progressColor: '#A8503A',
      accentColor: '#A8503A'
    }
  },
  {
    id: 'cobalt',
    label: '코발트',
    hint: '흰 배경에 진한 파랑',
    swatches: ['#FFFFFF', '#16202A', '#0B6EA8'],
    patch: {
      colorTheme: { mode: 'light' },
      progressColor: '#0B6EA8',
      accentColor: '#0B6EA8'
    }
  }
]

/** 상단 세그먼티드 탭. 섹션 10개를 5묶음으로 나눈다 */
const TABS = [
  { key: 'basic', label: '기본' },
  { key: 'look', label: '모양' },
  { key: 'header', label: '헤더' },
  { key: 'widget', label: '위젯' },
  { key: 'etc', label: '기타' }
] as const

type TabKey = (typeof TABS)[number]['key']

type AdminPageProps = {
  /** local: dev 서버에서 파일을 직접 쓴다. deployed: GitHub에 커밋한다 */
  mode: 'local' | 'deployed'
  login: string | null
  avatarUrl: string | null
  repo: string | null
  branch: string | null
  error: string | null
}

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; commitUrl?: string }
  | { kind: 'copied' }
  | { kind: 'error'; message: string }

export default function AdminPage(props: AdminPageProps) {
  const [config, setConfig] = React.useState<SiteConfig | null>(null)
  const [saveState, setSaveState] = React.useState<SaveState>({ kind: 'idle' })
  const [previewKey, setPreviewKey] = React.useState(0)
  const previewRef = React.useRef<HTMLIFrameElement>(null)
  const [previewPage, setPreviewPage] = React.useState<{
    path: string
    pageId: string | null
  } | null>(null)
  const [showSource, setShowSource] = React.useState(false)
  // pretty URL 편집용 줄. null이면 아직 config에서 처음 읽지 않은 상태다
  const [prettyRows, setPrettyRows] = React.useState<Array<
    [string, string]
  > | null>(null)
  const [tab, setTab] = React.useState<TabKey>('basic')
  // 코드 보기는 저장 응답을 기다리지 않는다. 직렬화기가 순수 함수라 브라우저에서
  // 그대로 돌 수 있으므로 지금 편집 중인 값으로 즉시 만들어 보여준다. 저장 전에
  // 무엇이 커밋될지 확인하는 게 이 화면의 목적인데, 저장해야 보이면 순서가 뒤바뀐다.
  const source = React.useMemo(
    () => (config ? serializeSiteConfig(config) : ''),
    [config]
  )

  /**
   * 미리보기 iframe이 지금 보고 있는 경로와 Notion 페이지 ID를 읽는다.
   *
   * iframe이 같은 오리진(`/`)이라 contentWindow.location을 읽을 수 있다.
   * 사용자가 미리보기 안에서 글을 클릭해 들어가도 그 페이지 ID를 알 수 있어서,
   * pretty URL을 만들 때 ID를 어디서 찾아야 하나 헤매지 않는다.
   */
  const readPreview = React.useCallback(() => {
    try {
      const path = previewRef.current?.contentWindow?.location.pathname
      if (!path) return
      // 경로 끝에 붙은 32자 hex가 Notion 블록 ID다. pretty URL로 열린 페이지에는
      // ID가 없으므로 null이 된다.
      const match = /([0-9a-f]{32})\/?$/i.exec(path)
      const pageId = match?.[1] ?? null
      // 값이 그대로면 state를 건드리지 않는다. 1초마다 새 객체를 넣으면 매번
      // 리렌더가 나고, 코드 뷰의 innerHTML이 다시 만들어지면서 드래그로 잡아둔
      // 선택 영역이 풀린다. 실제로 코드를 블록 잡으면 1초 만에 풀렸다.
      setPreviewPage((prev) =>
        prev && prev.path === path && prev.pageId === pageId
          ? prev
          : { path, pageId }
      )
    } catch {
      // 크로스 오리진이 되면(외부 링크로 이동) 읽을 수 없다. 그냥 비운다.
      setPreviewPage((prev) => (prev === null ? prev : null))
    }
  }, [])

  React.useEffect(() => {
    // iframe 내부 이동은 부모에 이벤트를 주지 않는다. 짧게 폴링하는 편이
    // MutationObserver나 postMessage 주입보다 단순하고 확실하다.
    const timer = setInterval(readPreview, 1000)
    return () => clearInterval(timer)
  }, [readPreview])

  const needsLogin = props.mode === 'deployed' && !props.login

  // 배포 모드에서 올린 이미지는 커밋 후 재빌드가 끝나야 서비스된다. 그때까지
  // 썸네일이 깨지므로 미리 알려준다.
  const uploadHint =
    props.mode === 'deployed'
      ? '올린 이미지는 재빌드가 끝난 뒤에 보입니다'
      : undefined

  React.useEffect(() => {
    if (needsLogin) return

    const load = async () => {
      try {
        const res = await fetch('/api/admin/config')
        if (res.ok) {
          setConfig((await res.json()) as SiteConfig)
        }
      } catch {
        // dev 서버가 아니면 404다. 아래 로딩 화면에 머문다.
      }
    }

    void load()
  }, [])

  /**
   * 테마 프리셋을 적용한다.
   *
   * 색만 바꾸고 링크 목록 같은 구조는 그대로 둔다. bottomNavigation은 links를
   * 유지한 채 color만 갈아끼우고, 아직 없으면 만들지 않는다. 테마를 골랐다고
   * 없던 하단 탭바가 생기면 놀란다.
   */
  const applyTheme = React.useCallback((themeId: string) => {
    const theme = THEMES.find((t) => t.id === themeId)
    if (!theme) return

    setConfig((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        colorTheme: theme.patch.colorTheme,
        scrollProgressBar: {
          ...prev.scrollProgressBar,
          color: theme.patch.progressColor
        },
        ...(prev.bottomNavigation
          ? {
              bottomNavigation: {
                ...prev.bottomNavigation,
                color: theme.patch.accentColor
              }
            }
          : {})
      }
    })
    setSaveState({ kind: 'idle' })
  }, [])

  /** 최상위 키 하나를 갈아끼운다 */
  const set = React.useCallback(
    <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev))
      setSaveState({ kind: 'idle' })
    },
    []
  )

  /** 중첩 객체의 한 필드만 갈아끼운다. 빈 값이면 키를 지운다 */
  const setNested = React.useCallback(
    (key: keyof SiteConfig, field: string, value: unknown) => {
      setConfig((prev) => {
        if (!prev) return prev
        const current = { ...(prev[key] as Record<string, unknown>) }

        if (value === '' || value === undefined) {
          delete current[field]
        } else {
          current[field] = value
        }

        // 객체가 텅 비면 키 자체를 지워 설정 파일을 깔끔하게 유지한다
        const next = Object.keys(current).length ? current : undefined
        return { ...prev, [key]: next } as SiteConfig
      })
      setSaveState({ kind: 'idle' })
    },
    []
  )

  const onSave = React.useCallback(async () => {
    if (!config) return
    setSaveState({ kind: 'saving' })

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = (await res.json()) as {
        error?: string
        commitUrl?: string
      }

      if (!res.ok) {
        setSaveState({ kind: 'error', message: data?.error || '저장 실패' })
        return
      }

      setSaveState({ kind: 'saved', commitUrl: data.commitUrl })

      // 배포 모드에서는 재빌드가 끝나야 반영되므로 미리보기를 새로고침해도
      // 예전 화면이 나온다. 로컬에서만 새로고침한다.
      if (props.mode === 'local') {
        // dev 서버가 새 설정으로 다시 컴파일할 시간을 준 뒤 미리보기를 새로고침
        setTimeout(() => setPreviewKey((key) => key + 1), 1200)
      }
    } catch (err: any) {
      setSaveState({ kind: 'error', message: err?.message || '저장 실패' })
    }
  }, [config, props.mode])

  const onCopy = React.useCallback(async () => {
    if (!source) return
    try {
      // 서버에 물어보지 않는다. 예전에는 저장 API를 POST해서 응답의 source를
      // 복사했는데, 배포 모드에서는 그 POST가 곧 커밋이라 "복사"가 커밋을
      // 만들어버렸다. 직렬화는 브라우저에서 이미 해뒀다.
      await navigator.clipboard.writeText(source)
      setSaveState({ kind: 'copied' })
    } catch {
      setSaveState({ kind: 'error', message: '클립보드 복사 실패' })
    }
  }, [source])

  if (needsLogin) {
    return (
      <>
        <Head>
          <title>로그인 | folionote</title>
          <meta name='robots' content='noindex, nofollow' />
        </Head>
        <div className={styles.login}>
          <div className={styles.loginCard}>
            <h1 className={styles.loginTitle}>사이트 설정</h1>
            <p className={styles.loginText}>
              <code>{props.repo}</code> 리포에 푸시 권한이 있는 GitHub 계정으로
              로그인하세요. 저장하면 <code>{props.branch}</code> 브랜치에
              커밋됩니다.
            </p>
            {props.error && <p className={styles.loginError}>{props.error}</p>}
            <a
              className={`${styles.button} ${styles.buttonPrimary} ${styles.loginButton}`}
              href='/api/admin/auth/login'
            >
              GitHub으로 로그인
            </a>
          </div>
        </div>
      </>
    )
  }

  if (!config) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <div className={styles.panelBody}>설정을 불러오는 중…</div>
        </div>
      </div>
    )
  }

  const colorTheme = config.colorTheme || {}
  const font = config.font || {}
  const logo = typeof config.logo === 'object' ? config.logo : null
  const progressBar = config.scrollProgressBar || {}
  const backToTop = config.backToTop || {}
  const cta = config.cta
  const bottomNav = config.bottomNavigation || {}
  const pageView = config.pageViewCount || {}
  const navLinks: NavigationLink[] = config.navigationLinks || []

  // pageUrlOverrides는 { '/devs': 'pageId' } 맵이다. 편집 중인 줄을 config에서
  // 매번 다시 유도하면 안 된다. 빈 경로는 맵에 담을 수 없어서(키가 없으니)
  // 새로 추가한 줄이 그 즉시 사라진다. 실제로 "+ 경로 추가"가 아무 일도 하지
  // 않았다. 그래서 편집용 배열을 따로 들고, config에는 완성된 줄만 접어 넣는다.
  const prettyUrls = prettyRows ?? Object.entries(config.pageUrlOverrides || {})
  const setPrettyUrls = (rows: Array<[string, string]>) => {
    setPrettyRows(rows)
    const next: Record<string, string> = {}
    for (const [urlPath, pageId] of rows) {
      if (urlPath.trim() && pageId.trim()) next[urlPath.trim()] = pageId.trim()
    }
    set('pageUrlOverrides', Object.keys(next).length ? next : undefined)
  }

  return (
    <>
      <Head>
        <title>설정 | folionote</title>
        <meta name='robots' content='noindex, nofollow' />
      </Head>

      <div className={styles.page}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h1 className={styles.panelTitle}>사이트 설정</h1>
            {props.mode === 'deployed' && (
              <span className={styles.badge} title={`${props.repo} · ${props.branch}`}>
                {props.branch}
              </span>
            )}
            <span className={styles.spacer} />
            {props.login && (
              <a className={styles.who} href='/api/admin/auth/logout'>
                {props.login} · 로그아웃
              </a>
            )}
            <button
              type='button'
              className={styles.button}
              onClick={() => setShowSource((v) => !v)}
            >
              {showSource ? '폼으로' : '코드 보기'}
            </button>
          </div>

          {!showSource && (
            <div className={styles.seg} role='tablist'>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type='button'
                  role='tab'
                  aria-selected={tab === t.key}
                  className={
                    tab === t.key
                      ? `${styles.segItem} ${styles.segItemOn}`
                      : styles.segItem
                  }
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div
            className={
              showSource
                ? `${styles.panelBody} ${styles.panelBodyCode}`
                : styles.panelBody
            }
          >
            <p className={styles.notice}>
              {props.mode === 'local' ? (
                <>
                  로컬 개발 서버입니다. 저장하면 <code>site.config.ts</code>가
                  다시 쓰이고 dev 서버가 자동으로 컴파일합니다. 배포하려면 직접
                  커밋·푸시하세요.
                </>
              ) : (
                <>
                  저장하면 <code>{props.repo}</code>의{' '}
                  <code>{props.branch}</code> 브랜치에 <code>site.config.ts</code>
                  가 커밋됩니다. 재배포가 끝나야 사이트에 반영되므로 오른쪽
                  미리보기는 잠시 이전 상태로 남아 있습니다.
                </>
              )}
            </p>

            {showSource ? (
              <CodeView source={source} />
            ) : (
              <ActiveTabContext.Provider value={tab}>
                <Section title='기본 정보' tab='basic'>
                  <Field label='사이트 이름'>
                    <TextInput
                      value={config.name}
                      onChange={(v) => set('name', v)}
                    />
                  </Field>
                  <Field label='도메인'>
                    <TextInput
                      value={config.domain}
                      onChange={(v) => set('domain', v)}
                    />
                  </Field>
                  <Field label='작성자'>
                    <TextInput
                      value={config.author}
                      onChange={(v) => set('author', v)}
                    />
                  </Field>
                  <Field label='설명 (og:description)'>
                    <TextInput
                      value={config.description}
                      onChange={(v) => set('description', v)}
                    />
                  </Field>
                  <Field label='Notion 루트 페이지 ID'>
                    <TextInput
                      value={config.rootNotionPageId}
                      onChange={(v) => set('rootNotionPageId', v)}
                    />
                  </Field>
                  <Field label='날짜 형식'>
                    <PresetTextInput
                      value={config.dateFormat}
                      onChange={(v) => set('dateFormat', v)}
                      presets={DATE_FORMATS}
                      placeholder='YYYY/MM/DD'
                    />
                  </Field>
                </Section>

                <Section title='테마' tab='look'>
                  <Note>
                    어울리는 색을 묶어 한 번에 적용합니다. 고른 뒤 아래에서 개별
                    값을 고쳐도 됩니다. 메뉴 링크 같은 구조는 바뀌지 않습니다.
                  </Note>
                  <div className={styles.themeGrid}>
                    {THEMES.map((theme) => {
                      const active =
                        (config.colorTheme?.mode ?? 'system') ===
                          (theme.patch.colorTheme?.mode ?? 'system') &&
                        (progressBar.color || '').toLowerCase() ===
                          theme.patch.progressColor.toLowerCase()
                      return (
                        <button
                          key={theme.id}
                          type='button'
                          className={
                            active
                              ? `${styles.themeCard} ${styles.themeCardOn}`
                              : styles.themeCard
                          }
                          onClick={() => applyTheme(theme.id)}
                          title={theme.hint}
                          aria-pressed={active}
                        >
                          <span
                            className={styles.themePreview}
                            style={{ background: theme.swatches[0] }}
                          >
                            <span
                              className={styles.themeBarText}
                              style={{ background: theme.swatches[1] }}
                            />
                            <span
                              className={styles.themeBarAccent}
                              style={{ background: theme.swatches[2] }}
                            />
                          </span>
                          <span className={styles.themeLabel}>
                            {theme.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Section>

                <Section title='색상 테마' tab='look'>
                  <Field label='모드'>
                    <Select
                      value={colorTheme.mode || 'system'}
                      onChange={(v) => setNested('colorTheme', 'mode', v)}
                      options={[
                        { value: 'system', label: 'system (OS 따라감 + 토글)' },
                        { value: 'light', label: 'light 고정' },
                        { value: 'dark', label: 'dark 고정' },
                        { value: 'custom', label: 'custom (색 직접 지정)' }
                      ]}
                    />
                  </Field>

                  {colorTheme.mode === 'custom' && (
                    <>
                      <Field label='배경색'>
                        <ColorInput
                          value={colorTheme.background}
                          fallback='#ffffff'
                          presets={BACKGROUND_COLORS}
                          onChange={(v) =>
                            setNested('colorTheme', 'background', v)
                          }
                        />
                      </Field>
                      <Field label='글자색'>
                        <ColorInput
                          value={colorTheme.foreground}
                          fallback='#37352f'
                          presets={FOREGROUND_COLORS}
                          onChange={(v) =>
                            setNested('colorTheme', 'foreground', v)
                          }
                        />
                      </Field>
                    </>
                  )}
                </Section>

                <Section title='폰트' tab='look'>
                  <Field label='한국어'>
                    <Select
                      value={typeof font.ko === 'string' ? font.ko : ''}
                      onChange={(v) => setNested('font', 'ko', v)}
                      options={FONT_OPTIONS}
                    />
                  </Field>
                  <Field label='영문'>
                    <Select
                      value={typeof font.en === 'string' ? font.en : ''}
                      onChange={(v) => setNested('font', 'en', v)}
                      options={FONT_OPTIONS}
                    />
                  </Field>
                  <Field label='일본어'>
                    <Select
                      value={typeof font.ja === 'string' ? font.ja : ''}
                      onChange={(v) => setNested('font', 'ja', v)}
                      options={FONT_OPTIONS}
                    />
                  </Field>
                </Section>

                <Section title='헤더' tab='header'>
                  <Field label='로고 이미지 (라이트)' hint='비우면 사이트 이름'>
                    <ImageInput
                      value={logo?.light}
                      placeholder='/logo.png'
                      onChange={(v) => setNested('logo', 'light', v)}
                      uploadHint={uploadHint}
                    />
                  </Field>
                  <Field label='로고 이미지 (다크)'>
                    <ImageInput
                      value={logo?.dark}
                      placeholder='(라이트와 같게)'
                      onChange={(v) => setNested('logo', 'dark', v)}
                      uploadHint={uploadHint}
                    />
                  </Field>
                    <Field label='로고 높이(px)'>
                      <TextInput
                        type='number'
                        value={logo?.height}
                        onChange={(v) =>
                          setNested('logo', 'height', v ? Number(v) : '')
                        }
                      />
                    </Field>
                    <Field label='클릭 시 이동'>
                      <TextInput
                        value={logo?.href}
                        placeholder='/'
                        onChange={(v) => setNested('logo', 'href', v)}
                      />
                    </Field>

                  <Toggle
                    label='검색 버튼'
                    checked={config.isSearchEnabled !== false}
                    onChange={(v) => set('isSearchEnabled', v)}
                  />
                  <Toggle
                    label='공유 버튼'
                    checked={config.isShareButtonEnabled !== false}
                    onChange={(v) => set('isShareButtonEnabled', v)}
                  />
                </Section>

                <Section title='nav 링크' tab='header'>
                  {navLinks.map((link, index) => (
                    <div key={index} className={styles.navLinkRow}>
                      <input
                        className={styles.input}
                        value={link.title || ''}
                        placeholder='이름'
                        onChange={(e) => {
                          const next = [...navLinks]
                          next[index] = { ...link, title: e.target.value }
                          set('navigationLinks', next)
                        }}
                      />
                      <input
                        className={styles.input}
                        value={link.url || ''}
                        placeholder='/devs'
                        onChange={(e) => {
                          const next = [...navLinks]
                          next[index] = { ...link, url: e.target.value }
                          set('navigationLinks', next)
                        }}
                      />
                      <button
                        type='button'
                        className={styles.iconButton}
                        onClick={() =>
                          set(
                            'navigationLinks',
                            navLinks.filter((_, i) => i !== index)
                          )
                        }
                        aria-label='삭제'
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className={styles.addRow}>
                    <button
                      type='button'
                      className={styles.button}
                      onClick={() =>
                        set('navigationLinks', [
                          ...navLinks,
                          { title: '', url: '' }
                        ])
                      }
                    >
                      + 링크 추가
                    </button>
                  </div>
                </Section>

                <Section title='pretty URL' tab='etc'>
                  <Note>
                    Notion 페이지 ID 대신 쓸 경로를 지정합니다. 예를 들어{' '}
                    <code>/devs</code>에 컬렉션 페이지 ID를 매핑하면 그 주소로
                    열립니다. 상단 메뉴 링크를 <code>/devs</code>로 걸 때도 같은
                    매핑이 있어야 합니다.
                    <br />
                    ID는 오른쪽 미리보기에서 원하는 페이지로 이동하면 상단에
                    표시됩니다. <b>+ 미리보기 페이지</b>를 누르면 그 ID로 줄이
                    추가됩니다.
                  </Note>
                  {prettyUrls.map(([urlPath, pageId], index) => (
                    <div key={index} className={styles.navLinkRow}>
                      <input
                        className={styles.input}
                        value={urlPath}
                        placeholder='/devs'
                        onChange={(e) => {
                          const next = [...prettyUrls]
                          next[index] = [e.target.value, pageId]
                          setPrettyUrls(next)
                        }}
                      />
                      <input
                        className={styles.input}
                        value={pageId}
                        placeholder='Notion 페이지 ID'
                        onChange={(e) => {
                          const next = [...prettyUrls]
                          next[index] = [urlPath, e.target.value]
                          setPrettyUrls(next)
                        }}
                      />
                      <button
                        type='button'
                        className={styles.iconButton}
                        onClick={() =>
                          setPrettyUrls(
                            prettyUrls.filter((_, i) => i !== index)
                          )
                        }
                        aria-label='삭제'
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className={styles.addRow}>
                    <button
                      type='button'
                      className={styles.button}
                      onClick={() => setPrettyUrls([...prettyUrls, ['', '']])}
                    >
                      + 경로 추가
                    </button>
                    {previewPage?.pageId &&
                      !prettyUrls.some(
                        ([, id]) => id === previewPage.pageId
                      ) && (
                        <button
                          type='button'
                          className={styles.button}
                          title={`미리보기에서 열려 있는 페이지 (${previewPage.pageId})`}
                          onClick={() =>
                            setPrettyUrls([
                              ...prettyUrls,
                              ['', previewPage.pageId!]
                            ])
                          }
                        >
                          + 미리보기 페이지
                        </button>
                      )}
                  </div>
                </Section>

                <Section title='컬렉션' tab='etc'>
                  <Toggle
                    label='뷰 전환 탭'
                    checked={config.isCollectionViewTabsEnabled !== false}
                    onChange={(v) => set('isCollectionViewTabsEnabled', v)}
                  />
                  <Toggle
                    label='컬렉션 내 검색'
                    checked={config.isCollectionSearchEnabled !== false}
                    onChange={(v) => set('isCollectionSearchEnabled', v)}
                  />
                </Section>

                <Section title='위젯' tab='widget'>
                  <Toggle
                    label='스크롤 진행률 바'
                    checked={progressBar.enabled !== false}
                    onChange={(v) =>
                      setNested('scrollProgressBar', 'enabled', v)
                    }
                  />
                  {progressBar.enabled !== false && (
                    <Field label='진행률 바 색'>
                      <ColorInput
                        value={progressBar.color}
                        fallback='#007fb8'
                        presets={PROGRESS_COLORS}
                        onChange={(v) =>
                          setNested('scrollProgressBar', 'color', v)
                        }
                      />
                    </Field>
                  )}

                  <Toggle
                    label='맨 위로 버튼'
                    checked={backToTop.enabled !== false}
                    onChange={(v) => setNested('backToTop', 'enabled', v)}
                  />
                  {backToTop.enabled !== false && (
                    <Field label='버튼 위치'>
                      <Select
                        value={backToTop.position || 'right'}
                        onChange={(v) => setNested('backToTop', 'position', v)}
                        options={[
                          { value: 'right', label: '오른쪽' },
                          { value: 'left', label: '왼쪽' }
                        ]}
                      />
                    </Field>
                  )}
                </Section>

                <Section title='CTA 버튼' tab='widget'>
                  <Toggle
                    label='CTA 버튼 사용'
                    checked={!!cta}
                    onChange={(v) =>
                      set(
                        'cta',
                        v ? { text: '문의하기', href: 'https://' } : undefined
                      )
                    }
                  />
                  {cta && (
                    <>
                      <Field label='버튼 문구'>
                        <TextInput
                          value={cta.text}
                          onChange={(v) => setNested('cta', 'text', v)}
                        />
                      </Field>
                      <Field label='링크'>
                        <TextInput
                          value={cta.href}
                          onChange={(v) => setNested('cta', 'href', v)}
                        />
                      </Field>
                        <Field label='배경색'>
                          <ColorInput
                            value={cta.background}
                            fallback='#ffffff'
                            presets={CTA_BACKGROUND_COLORS}
                            onChange={(v) =>
                              setNested('cta', 'background', v)
                            }
                          />
                        </Field>
                        <Field label='글자색'>
                          <ColorInput
                            value={cta.color}
                            fallback='#000000'
                            presets={CTA_TEXT_COLORS}
                            onChange={(v) => setNested('cta', 'color', v)}
                          />
                        </Field>
                      <Toggle
                        label='새 탭으로 열기'
                        checked={!!cta.newTab}
                        onChange={(v) => setNested('cta', 'newTab', v)}
                      />
                    </>
                  )}
                </Section>

                <Section title='모바일 하단 탭바' tab='etc'>
                  <Toggle
                    label='하단 탭바 사용'
                    checked={!!config.bottomNavigation}
                    onChange={(v) =>
                      set(
                        'bottomNavigation',
                        v
                          ? { links: [{ title: '홈', url: '/', icon: '🏠' }] }
                          : undefined
                      )
                    }
                  />
                  {config.bottomNavigation && (
                    <Field label='강조 색'>
                      <ColorInput
                        value={bottomNav.color}
                        fallback='#53a1c9'
                        presets={ACCENT_COLORS}
                        onChange={(v) =>
                          setNested('bottomNavigation', 'color', v)
                        }
                      />
                    </Field>
                  )}
                </Section>

                <Section title='페이지뷰 카운트' tab='etc'>
                  <Note>
                    Redis가 있어야 동작합니다 (isRedisEnabled + REDIS_* 환경변수).
                  </Note>
                  <Toggle
                    label='페이지뷰 카운트 사용'
                    checked={!!pageView.enabled}
                    onChange={(v) => setNested('pageViewCount', 'enabled', v)}
                  />
                  {pageView.enabled && (
                    <>
                      <Field label='표시 스타일'>
                        <Select
                          value={pageView.style || 'inline'}
                          onChange={(v) =>
                            setNested('pageViewCount', 'style', v)
                          }
                          options={[
                            { value: 'inline', label: '한 줄 (테두리)' },
                            { value: 'stacked', label: '두 줄 (테두리)' },
                            { value: 'plain', label: '두 줄 (테두리 없음)' }
                          ]}
                        />
                      </Field>
                      <Field label='타임존' hint='Asia/Seoul 등'>
                        <TextInput
                          value={pageView.timeZone}
                          placeholder='UTC'
                          onChange={(v) =>
                            setNested('pageViewCount', 'timeZone', v)
                          }
                        />
                      </Field>
                    </>
                  )}
                </Section>
              </ActiveTabContext.Provider>
            )}
          </div>

          <div className={styles.panelFooter}>
            <span
              className={
                saveState.kind === 'error'
                  ? `${styles.status} ${styles.statusError}`
                  : styles.status
              }
            >
              {saveState.kind === 'copied' && '클립보드에 복사했습니다'}
              {saveState.kind === 'saving' &&
                (props.mode === 'local' ? '저장 중…' : '커밋 중…')}
              {saveState.kind === 'saved' &&
                (saveState.commitUrl ? (
                  <>
                    커밋했습니다. 재빌드가 끝나면 반영됩니다.{' '}
                    <a
                      className={styles.link}
                      href={saveState.commitUrl}
                      target='_blank'
                      rel='noreferrer'
                    >
                      커밋 보기
                    </a>
                  </>
                ) : (
                  'site.config.ts에 저장했습니다'
                ))}
              {saveState.kind === 'error' && saveState.message}
            </span>

            <button
              type='button'
              className={styles.button}
              onClick={onCopy}
            >
              코드 복사
            </button>
            <button
              type='button'
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={onSave}
              disabled={saveState.kind === 'saving'}
            >
              저장
            </button>
          </div>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewBar}>
            <span>미리보기</span>
            <button
              type='button'
              className={styles.button}
              onClick={() => setPreviewKey((key) => key + 1)}
            >
              새로고침
            </button>
            <span>저장 후 자동으로 새로고침됩니다.</span>
            <span className={styles.spacer} />
            {previewPage?.pageId && (
              <button
                type='button'
                className={styles.pageIdChip}
                title='클릭하면 페이지 ID를 복사합니다'
                onClick={() => {
                  void navigator.clipboard.writeText(previewPage.pageId!)
                  setSaveState({ kind: 'copied' })
                }}
              >
                {previewPage.pageId}
              </button>
            )}
          </div>
          <iframe
            key={previewKey}
            ref={previewRef}
            onLoad={readPreview}
            className={styles.previewFrame}
            src='/'
            title='사이트 미리보기'
          />
        </div>
      </div>
    </>
  )
}
