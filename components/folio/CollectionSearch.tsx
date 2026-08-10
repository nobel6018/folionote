import { IoCloseCircle } from '@react-icons/all-files/io5/IoCloseCircle'
import { IoSearchOutline } from '@react-icons/all-files/io5/IoSearchOutline'
import * as React from 'react'

/**
 * 컬렉션 안에서 카드를 걸러내는 검색 입력.
 *
 * 접힌 상태는 아이콘 + "Search" 라벨이고, 누르면 입력창으로 펼쳐진다(레퍼런스 서비스 동일).
 * 필터링 자체는 부모(`Collection`)가 담당한다.
 */
export function CollectionSearch({
  query,
  onQueryChange,
  placeholder = 'Type to search...'
}: {
  query: string
  onQueryChange: (query: string) => void
  placeholder?: string
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const expand = React.useCallback(() => setIsExpanded(true), [])

  const clear = React.useCallback(() => {
    onQueryChange('')
    setIsExpanded(false)
  }, [onQueryChange])

  React.useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        clear()
      }
    },
    [clear]
  )

  if (!isExpanded) {
    return (
      <button
        type='button'
        className='folio-collection-search folio-collection-search-collapsed'
        onClick={expand}
      >
        <IoSearchOutline className='folio-collection-search-icon' />
        <span>Search</span>
      </button>
    )
  }

  return (
    <div className='folio-collection-search folio-collection-search-expanded'>
      <IoSearchOutline className='folio-collection-search-icon' />

      <input
        ref={inputRef}
        type='text'
        className='folio-collection-search-input'
        value={query}
        placeholder={placeholder}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label='컬렉션 내 검색'
      />

      <button
        type='button'
        className='folio-collection-search-clear'
        onClick={clear}
        aria-label='검색 지우기'
      >
        <IoCloseCircle />
      </button>
    </div>
  )
}
