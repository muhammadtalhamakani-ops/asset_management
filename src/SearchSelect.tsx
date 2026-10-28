import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { SelectHTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import './SearchSelect.css'

type Props = SelectHTMLAttributes<HTMLSelectElement> & { loading?: boolean }
function textOf(node: ReactNode): string {
  return Children.toArray(node).map((child) => isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : String(child)).join('')
}
export function SearchSelect({ children, loading = false, ...props }: Props) {
  const id = useId()
  const native = useRef<HTMLSelectElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [fieldLabel, setFieldLabel] = useState('')
  useLayoutEffect(() => {
    const labelElement = native.current?.closest('label')
    const text = labelElement ? Array.from(labelElement.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(' ').trim() : ''
    setFieldLabel(text)
  }, [])
  const [query, setQuery] = useState('')
  const initialOption = Children.toArray(children).find(isValidElement<{ value?: string; children?: ReactNode }>)
  const initialValue = String(props.defaultValue ?? (initialOption ? initialOption.props.value ?? textOf(initialOption.props.children) : ''))
  const [local, setLocal] = useState(initialValue)
  const [cleared, setCleared] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 260 })
  const options = Children.toArray(children).filter(isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>).map((child) => ({ value: String(child.props.value ?? textOf(child.props.children)), label: textOf(child.props.children), disabled: child.props.disabled }))
  const value = String(props.value ?? local ?? '')
  const selected = options.find((option) => option.value === value)
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
  function close() { setOpen(false); setQuery('') }
  function choose(next: string) {
    const element = native.current
    if (!element) return
    element.value = next
    setCleared(!next)
    setLocal(next)
    element.dispatchEvent(new Event('change', { bubbles: true }))
    element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    close()
    trigger.current?.focus()
  }
  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = trigger.current!.getBoundingClientRect()
      const below = window.innerHeight - rect.bottom - 12
      const above = rect.top - 12
      const height = Math.min(300, Math.max(below, above))
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top: below >= 180 || below >= above ? rect.bottom + 4 : Math.max(8, rect.top - height - 4), width: Math.min(rect.width, window.innerWidth - 16), maxHeight: height })
    }
    place()
    search.current?.focus()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])
  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) { if (!popup.current?.contains(event.target as Node) && !trigger.current?.parentElement?.contains(event.target as Node)) close() }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => {
    const form = native.current?.form
    function reset() { setLocal(initialValue); setCleared(false); close() }
    form?.addEventListener('reset', reset)
    return () => form?.removeEventListener('reset', reset)
  }, [initialValue])
  const label = props['aria-label'] || fieldLabel || props.name || 'Select option'
  const requiredError = cleared && !value && props.required && !props['aria-describedby']
  return <span className="search-select">
    <select {...props} defaultValue={props.value === undefined ? initialValue : undefined} ref={native} onFocus={() => trigger.current?.focus()} className="search-select-native" tabIndex={-1} aria-hidden="true" onInvalid={(event) => { event.preventDefault(); trigger.current?.focus(); setOpen(true) }} onChange={(event) => { setLocal(event.target.value); props.onChange?.(event) }}>{!options.some((option) => option.value === '') && <option value="" hidden>Select option</option>}{children}</select>
    <button ref={trigger} type="button" className="search-select-trigger" disabled={props.disabled || loading} role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-required={props.required} aria-invalid={props['aria-invalid'] || !!requiredError} aria-describedby={props['aria-describedby'] || (requiredError ? `${id}-error` : undefined)} onClick={() => { setOpen(!open); setActive(0) }} onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); setActive(0) } }}><span>{loading ? 'Loading...' : selected?.label || 'Select option'}</span><ChevronDown size={15} /></button>
    {value && !props.disabled && !loading && <button type="button" className="search-select-clear" aria-label={`Clear ${label}`} onClick={() => choose(options.find((option) => /^All(?:\s|$)/i.test(option.label))?.value || '')}><X size={14} /></button>}
    {requiredError && <span className="search-select-error" id={`${id}-error`}>Required</span>}
    {open && createPortal(<div ref={popup} className="search-select-popup" style={position} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); trigger.current?.focus() }
      if (event.key === 'Tab') { trigger.current?.focus(); close() }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const next = Math.max(0, Math.min(filtered.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))); setActive(next); document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: 'nearest' }) }
      if (event.key === 'Enter') { event.preventDefault(); if (filtered[active] && !filtered[active].disabled) choose(filtered[active].value) }
    }}><input ref={search} aria-label={`Search ${label}`} role="combobox" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={filtered[active] ? `${id}-${active}` : undefined} placeholder="Search..." value={query} onChange={(event) => { setQuery(event.target.value); setActive(0) }} /><div role="listbox" id={`${id}-list`} aria-label={label}>{filtered.length ? filtered.map((option, index) => <button type="button" role="option" id={`${id}-${index}`} aria-selected={option.value === value} disabled={option.disabled} className={active === index ? 'highlighted' : ''} key={`${option.value}-${index}`} onPointerMove={() => setActive(index)} onClick={() => choose(option.value)}>{option.label}</button>) : <p role="status">No results</p>}</div></div>, document.body)}
  </span>
}
