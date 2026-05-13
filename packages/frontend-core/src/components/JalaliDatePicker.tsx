'use client'

import { useEffect, useMemo, useState } from 'react'
import { cx } from '../cx'

type JalaliDatePickerProps = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  includeTime?: boolean
  disabled?: boolean
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

function div(a: number, b: number) {
  return Math.floor(a / b)
}

function gregorianToJdn(gy: number, gm: number, gd: number) {
  const d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * ((gm + 9) % 12) + 2, 5) +
    gd -
    34840408
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
}

function jdnToGregorian(jdn: number): GregorianParts {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div((j % 1461), 4) * 5 + 308
  const gd = div((i % 153), 5) + 1
  const gm = div(i, 153) % 12 + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}

function jalCal(jy: number) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]
  const bl = breaks.length
  const gy = jy + 621
  let leapJ = -14
  let jp = breaks[0]
  let jump = 0

  if (jy < jp || jy >= breaks[bl - 1]) {
    throw new Error('Invalid Jalali year')
  }

  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div((jump % 33), 4)
    jp = jm
  }

  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(((n % 33) + 3), 4)
  if ((jump % 33) === 4 && jump - n === 4) {
    leapJ += 1
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33
  }

  let leap = (((n + 1) % 33) - 1) % 4
  if (leap === -1) leap = 4

  return { leap, gy, march }
}

function jalaliToJdn(jy: number, jm: number, jd: number) {
  const r = jalCal(jy)
  return gregorianToJdn(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}

function jdnToJalali(jdn: number): JalaliParts {
  const { gy } = jdnToGregorian(jdn)
  let jy = gy - 621
  const r = jalCal(jy)
  const jdn1f = gregorianToJdn(gy, 3, r.march)
  let k = jdn - jdn1f

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: (k % 31) + 1 }
    }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }

  return { jy, jm: 7 + div(k, 30), jd: (k % 30) + 1 }
}

function daysInJalaliMonth(jy: number, jm: number) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return jalCal(jy).leap === 0 ? 30 : 29
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
  const { gy, gm, gd } = jdnToGregorian(jalaliToJdn(parts.jy, parts.jm, parts.jd))
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
  const jalali = jdnToJalali(gregorianToJdn(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()))
  return {
    parts: jalali,
    time: formatTime(parsed),
  }
}

function formatDisplayValue(parts: JalaliParts, timeValue?: string) {
  const dateText = `${toPersianDigits(String(parts.jd))} ${monthLabels[parts.jm - 1]} ${toPersianDigits(String(parts.jy))}`
  if (!timeValue) return dateText
  return `${dateText} - ${toPersianDigits(timeValue)}`
}

function firstWeekdayOfMonth(parts: JalaliParts) {
  const { gy, gm, gd } = jdnToGregorian(jalaliToJdn(parts.jy, parts.jm, 1))
  const day = new Date(gy, gm - 1, gd).getDay()
  return (day + 1) % 7
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  includeTime = true,
  disabled = false,
}: JalaliDatePickerProps) {
  const parsedValue = useMemo(() => parseIsoValue(value), [value])
  const today = useMemo(() => {
    const now = new Date()
    return jdnToJalali(gregorianToJdn(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  }, [])

  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState<JalaliParts>(parsedValue?.parts ?? today)
  const [timeValue, setTimeValue] = useState(parsedValue?.time ?? '00:00')

  useEffect(() => {
    if (parsedValue) {
      setViewMonth(parsedValue.parts)
      setTimeValue(parsedValue.time)
      return
    }
    setTimeValue('00:00')
  }, [parsedValue])

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
    <div className="fm-jalali-field">
      <button
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
          disabled={disabled}
          onChange={(event) => handleTimeChange(event.target.value)}
          type="time"
          value={timeValue}
        />
      ) : null}

      {open ? (
        <div className="fm-jalali-popover">
          <div className="fm-jalali-head">
            <button className="fm-jalali-nav" onClick={() => changeMonth(1)} type="button">
              بعد
            </button>
            <strong>
              {monthLabels[viewMonth.jm - 1]} {toPersianDigits(String(viewMonth.jy))}
            </strong>
            <button className="fm-jalali-nav" onClick={() => changeMonth(-1)} type="button">
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
