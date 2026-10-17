'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../cx'

type JalaliDatePickerProps = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  includeTime?: boolean
  disabled?: boolean
  minDate?: string
  maxDate?: string
  ariaLabel?: string
}

type JalaliParts = {
  jy: number
  jm: number
  jd: number
}

type GregorianParts = {
  gy: number
  gm: number
  gd: number
}

const monthLabels = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

const weekdayLabels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const persianDateFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

function getJalaliPartsFromDate(date: Date): JalaliParts {
  const parts = persianDateFormatter.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '0')
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0')

  if (!year || !month || !day) {
    throw new Error('Invalid Jalali date parts')
  }

  return { jy: year, jm: month, jd: day }
}

function sameJalaliDate(left: JalaliParts, right: JalaliParts) {
  return left.jy === right.jy && left.jm === right.jm && left.jd === right.jd
}

function dateKey(parts: JalaliParts) {
  return parts.jy * 10000 + parts.jm * 100 + parts.jd
}

function jalaliToGregorian(parts: JalaliParts): GregorianParts {
  const candidate = new Date(parts.jy + 621, 1, 15, 12, 0, 0, 0)

  // Searching from local noon avoids DST edge cases while keeping the UI in local time.
  for (let offset = 0; offset < 450; offset += 1) {
    const currentParts = getJalaliPartsFromDate(candidate)
    if (sameJalaliDate(currentParts, parts)) {
      return {
        gy: candidate.getFullYear(),
        gm: candidate.getMonth() + 1,
        gd: candidate.getDate(),
      }
    }

    candidate.setDate(candidate.getDate() + 1)
  }

  throw new Error('Unable to convert Jalali date')
}

function daysBetween(left: GregorianParts, right: GregorianParts) {
  const leftDate = new Date(left.gy, left.gm - 1, left.gd, 12, 0, 0, 0)
  const rightDate = new Date(right.gy, right.gm - 1, right.gd, 12, 0, 0, 0)
  return Math.round((rightDate.getTime() - leftDate.getTime()) / 86400000)
}

function daysInJalaliMonth(jy: number, jm: number) {
  const currentMonthStart = jalaliToGregorian({ jy, jm, jd: 1 })
  const nextMonthStart = jm === 12 ? jalaliToGregorian({ jy: jy + 1, jm: 1, jd: 1 }) : jalaliToGregorian({ jy, jm: jm + 1, jd: 1 })
  return daysBetween(currentMonthStart, nextMonthStart)
}

function toPersianDigits(value: string) {
  return value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

function formatTime(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function buildIsoValue(parts: JalaliParts, timeValue: string) {
  const { gy, gm, gd } = jalaliToGregorian(parts)
  const [hourText, minuteText] = timeValue.split(':')
  const hours = Number(hourText || '0')
  const minutes = Number(minuteText || '0')
  const date = new Date(gy, gm - 1, gd, hours, minutes, 0, 0)
  return date.toISOString()
}

function parseIsoValue(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    parts: getJalaliPartsFromDate(parsed),
    time: formatTime(parsed),
  }
}

function formatDisplayValue(parts: JalaliParts, timeValue?: string) {
  const dateText = `${toPersianDigits(String(parts.jd))} ${monthLabels[parts.jm - 1]} ${toPersianDigits(String(parts.jy))}`
  if (!timeValue) return dateText
  return `${dateText} - ${toPersianDigits(timeValue)}`
}

function firstWeekdayOfMonth(parts: JalaliParts) {
  const { gy, gm, gd } = jalaliToGregorian({ jy: parts.jy, jm: parts.jm, jd: 1 })
  const day = new Date(gy, gm - 1, gd).getDay()
  return (day + 1) % 7
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  includeTime = true,
  disabled = false,
  minDate,
  maxDate,
  ariaLabel = 'انتخاب تاریخ شمسی',
}: JalaliDatePickerProps) {
  const parsedValue = useMemo(() => parseIsoValue(value), [value])
  const parsedMinimum = useMemo(() => parseIsoValue(minDate), [minDate])
  const parsedMaximum = useMemo(() => parseIsoValue(maxDate), [maxDate])
  const today = useMemo(() => {
    return getJalaliPartsFromDate(new Date())
  }, [])

  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState<JalaliParts>(parsedValue?.parts ?? parsedMinimum?.parts ?? today)
  const [timeValue, setTimeValue] = useState(parsedValue?.time ?? '00:00')
  const fieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !fieldRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [open])

  useEffect(() => {
    if (parsedValue) {
      setViewMonth(parsedValue.parts)
      setTimeValue(parsedValue.time)
      return
    }
    if (parsedMinimum) setViewMonth(parsedMinimum.parts)
    setTimeValue('00:00')
  }, [parsedValue, parsedMinimum])

  const days = useMemo(() => {
    const firstWeekday = firstWeekdayOfMonth(viewMonth)
    const count = daysInJalaliMonth(viewMonth.jy, viewMonth.jm)
    const cells: Array<{ day: number; active: boolean }> = []

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ day: 0, active: false })
    }

    for (let day = 1; day <= count; day += 1) {
      cells.push({ day, active: true })
    }

    return cells
  }, [viewMonth])

  const selectedDay = parsedValue?.parts.jd ?? null
  const selectedMonth = parsedValue?.parts.jm ?? null
  const selectedYear = parsedValue?.parts.jy ?? null
  const minimumKey = parsedMinimum ? dateKey(parsedMinimum.parts) : null
  const maximumKey = parsedMaximum ? dateKey(parsedMaximum.parts) : null

  function isDayDisabled(day: number) {
    const key = dateKey({ ...viewMonth, jd: day })
    return disabled || (minimumKey !== null && key < minimumKey) || (maximumKey !== null && key > maximumKey)
  }

  function changeMonth(offset: number) {
    let nextMonth = viewMonth.jm + offset
    let nextYear = viewMonth.jy

    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    } else if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    }

    setViewMonth({ jy: nextYear, jm: nextMonth, jd: 1 })
  }

  function handleDaySelect(day: number) {
    if (isDayDisabled(day)) return
    const nextParts = { jy: viewMonth.jy, jm: viewMonth.jm, jd: day }
    onChange(buildIsoValue(nextParts, includeTime ? timeValue : '00:00'))
    setOpen(false)
  }

  function handleTimeChange(nextTime: string) {
    setTimeValue(nextTime)
    if (parsedValue) {
      onChange(buildIsoValue(parsedValue.parts, nextTime))
    }
  }

  return (
    <div
      className="fm-jalali-field"
      dir="rtl"
      ref={fieldRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <button
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open && !disabled}
        className={cx('fm-jalali-trigger', open && 'is-open')}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{parsedValue ? formatDisplayValue(parsedValue.parts, includeTime ? timeValue : undefined) : placeholder}</span>
      </button>

      {includeTime ? (
        <input
          className="fm-jalali-time"
          aria-label="ساعت"
          disabled={disabled}
          onChange={(event) => handleTimeChange(event.target.value)}
          type="time"
          value={timeValue}
        />
      ) : null}

      {open && !disabled ? (
        <div className="fm-jalali-popover" role="dialog" aria-label={ariaLabel}>
          <div className="fm-jalali-head">
            <button
              className="fm-jalali-nav"
              disabled={parsedMaximum !== null && viewMonth.jy * 12 + viewMonth.jm >= parsedMaximum.parts.jy * 12 + parsedMaximum.parts.jm}
              onClick={() => changeMonth(1)}
              type="button"
            >
              بعد
            </button>
            <strong>
              {monthLabels[viewMonth.jm - 1]} {toPersianDigits(String(viewMonth.jy))}
            </strong>
            <button
              className="fm-jalali-nav"
              disabled={parsedMinimum !== null && viewMonth.jy * 12 + viewMonth.jm <= parsedMinimum.parts.jy * 12 + parsedMinimum.parts.jm}
              onClick={() => changeMonth(-1)}
              type="button"
            >
              قبل
            </button>
          </div>

          <div className="fm-jalali-weekdays">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="fm-jalali-grid">
            {days.map((item, index) =>
              item.active ? (
                <button
                  className={cx(
                    'fm-jalali-day',
                    selectedDay === item.day &&
                      selectedMonth === viewMonth.jm &&
                      selectedYear === viewMonth.jy &&
                      'is-selected',
                  )}
                  key={`${viewMonth.jy}-${viewMonth.jm}-${item.day}`}
                  disabled={isDayDisabled(item.day)}
                  aria-label={formatDisplayValue({ ...viewMonth, jd: item.day })}
                  aria-pressed={selectedDay === item.day && selectedMonth === viewMonth.jm && selectedYear === viewMonth.jy}
                  onClick={() => handleDaySelect(item.day)}
                  type="button"
                >
                  {toPersianDigits(String(item.day))}
                </button>
              ) : (
                <span className="fm-jalali-day fm-jalali-day--empty" key={`empty-${index}`}>
                  &nbsp;
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
