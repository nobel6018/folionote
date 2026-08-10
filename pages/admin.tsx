import { type GetStaticProps } from 'next'
import Head from 'next/head'
import * as React from 'react'

import styles from '@/components/admin/Admin.module.css'
import {
  ColorInput,
  Field,
  Section,
  Select,
  TextInput,
  Toggle
} from '@/components/admin/AdminFields'
import { isDev } from '@/lib/config'
import { FONT_REGISTRY } from '@/lib/fonts'
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
export const getStaticProps: GetStaticProps = async () => {
  if (!isDev) {
    return { notFound: true }
  }

  return { props: {} }
}

const FONT_OPTIONS = [
  { value: '', label: '기본 (Pretendard)' },
  ...Object.entries(FONT_REGISTRY).map(([key, entry]) => ({
    value: key,
    label: `${entry.family} (${key})`
  }))
]

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

export default function AdminPage() {
  const [config, setConfig] = React.useState<SiteConfig | null>(null)
  const [saveState, setSaveState] = React.useState<SaveState>({ kind: 'idle' })
  const [previewKey, setPreviewKey] = React.useState(0)
  const [showSource, setShowSource] = React.useState(false)
  const [source, setSource] = React.useState('')

  React.useEffect(() => {
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
      const data = (await res.json()) as { source?: string; error?: string }

      if (!res.ok) {
        setSaveState({ kind: 'error', message: data?.error || '저장 실패' })
        return
      }

      setSource(data.source || '')
      setSaveState({ kind: 'saved' })
      // dev 서버가 새 설정으로 다시 컴파일할 시간을 준 뒤 미리보기를 새로고침
      setTimeout(() => setPreviewKey((key) => key + 1), 1200)
    } catch (err: any) {
      setSaveState({ kind: 'error', message: err?.message || '저장 실패' })
    }
  }, [config])

  const onCopy = React.useCallback(async () => {
    if (!config) return
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = (await res.json()) as { source?: string }
      await navigator.clipboard.writeText(data.source || '')
      setSaveState({ kind: 'saved' })
    } catch {
      setSaveState({ kind: 'error', message: '클립보드 복사 실패' })
    }
  }, [config])

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
            <button
              type='button'
              className={styles.button}
              onClick={() => setShowSource((v) => !v)}
            >
              {showSource ? '폼으로' : '코드 보기'}
            </button>
          </div>

          <div className={styles.panelBody}>
            <p className={styles.notice}>
              이 화면은 개발 서버에서만 열립니다. 저장하면{' '}
              <code>site.config.ts</code>가 다시 쓰이고 dev 서버가 자동으로 다시
              컴파일합니다. 배포하려면 직접 커밋·푸시하세요.
            </p>

            {showSource ? (
              <pre className={styles.code}>
                {source || '저장을 누르면 생성된 코드가 여기 표시됩니다.'}
              </pre>
            ) : (
              <>
                <Section title='기본 정보'>
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
                  <Field label='날짜 형식' hint='YYYY/MM/DD, MMM D, YYYY 등'>
                    <TextInput
                      value={config.dateFormat}
                      onChange={(v) => set('dateFormat', v)}
                    />
                  </Field>
                </Section>

                <Section title='색상 테마'>
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
                          onChange={(v) =>
                            setNested('colorTheme', 'background', v)
                          }
                        />
                      </Field>
                      <Field label='글자색'>
                        <ColorInput
                          value={colorTheme.foreground}
                          fallback='#37352f'
                          onChange={(v) =>
                            setNested('colorTheme', 'foreground', v)
                          }
                        />
                      </Field>
                    </>
                  )}
                </Section>

                <Section title='폰트'>
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

                <Section title='헤더'>
                  <Field label='로고 이미지 (라이트)' hint='비우면 사이트 이름'>
                    <TextInput
                      value={logo?.light}
                      placeholder='/logo.png'
                      onChange={(v) => setNested('logo', 'light', v)}
                    />
                  </Field>
                  <Field label='로고 이미지 (다크)'>
                    <TextInput
                      value={logo?.dark}
                      placeholder='(라이트와 같게)'
                      onChange={(v) => setNested('logo', 'dark', v)}
                    />
                  </Field>
                  <div className={styles.row}>
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
                  </div>

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

                <Section title='nav 링크'>
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
                </Section>

                <Section title='컬렉션'>
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

                <Section title='위젯'>
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

                <Section title='CTA 버튼'>
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
                      <div className={styles.row}>
                        <Field label='배경색'>
                          <ColorInput
                            value={cta.background}
                            fallback='#ffffff'
                            onChange={(v) =>
                              setNested('cta', 'background', v)
                            }
                          />
                        </Field>
                        <Field label='글자색'>
                          <ColorInput
                            value={cta.color}
                            fallback='#000000'
                            onChange={(v) => setNested('cta', 'color', v)}
                          />
                        </Field>
                      </div>
                      <Toggle
                        label='새 탭으로 열기'
                        checked={!!cta.newTab}
                        onChange={(v) => setNested('cta', 'newTab', v)}
                      />
                    </>
                  )}
                </Section>

                <Section title='모바일 하단 탭바'>
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
                        onChange={(v) =>
                          setNested('bottomNavigation', 'color', v)
                        }
                      />
                    </Field>
                  )}
                </Section>

                <Section title='페이지뷰 카운트'>
                  <p className={styles.fieldHint}>
                    Redis가 있어야 동작합니다 (isRedisEnabled + REDIS_* 환경변수).
                  </p>
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
              </>
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
              {saveState.kind === 'saving' && '저장 중…'}
              {saveState.kind === 'saved' && 'site.config.ts에 저장했습니다'}
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
          </div>
          <iframe
            key={previewKey}
            className={styles.previewFrame}
            src='/'
            title='사이트 미리보기'
          />
        </div>
      </div>
    </>
  )
}
