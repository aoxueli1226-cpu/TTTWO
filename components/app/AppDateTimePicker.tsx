"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import DatePicker from "react-datepicker"

const pad = (value: number) => String(value).padStart(2, "0")

const parseValue = (value?: string) => {
  if (!value) return null
  const [datePart, timePart] = value.split("T")
  if (!datePart || !timePart) return null
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute, second] = timePart.split(":")
  if (!year || !month || !day) return null
  return {
    date: new Date(year, month - 1, day),
    hour: hour ?? "00",
    minute: minute ?? "00",
    second: second ?? "00",
  }
}

const buildValue = (date: Date, hour: string, minute: string, second: string) => {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

const hours = Array.from({ length: 24 }, (_, i) => pad(i))
const minutes = Array.from({ length: 60 }, (_, i) => pad(i))
const seconds = Array.from({ length: 60 }, (_, i) => pad(i))
const months = Array.from({ length: 12 }, (_, i) => pad(i + 1))

interface AppDateTimePickerProps {
  value?: string
  onChange: (value: string) => void
}

export default function AppDateTimePicker({ value, onChange }: AppDateTimePickerProps) {
  const initial = useMemo(() => parseValue(value), [value])
  const [date, setDate] = useState<Date>(() => initial?.date ?? new Date())
  const [hour, setHour] = useState<string>(() => initial?.hour ?? pad(new Date().getHours()))
  const [minute, setMinute] = useState<string>(() => initial?.minute ?? "00")
  const [second, setSecond] = useState<string>(() => initial?.second ?? "00")

  useEffect(() => {
    if (!initial) return
    setDate(initial.date)
    setHour(initial.hour)
    setMinute(initial.minute)
    setSecond(initial.second)
  }, [initial])

  const emitChange = (nextDate: Date, nextHour: string, nextMinute: string, nextSecond: string) => {
    onChange(buildValue(nextDate, nextHour, nextMinute || "00", nextSecond || "00"))
  }

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const start = currentYear - 50
    const end = currentYear + 10
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [])

  const [yearOpen, setYearOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)
  const yearRef = useRef<HTMLDivElement>(null)
  const monthRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setYearOpen(false)
      }
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) {
        setMonthOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="rounded-xl border border-violet-200/70 bg-white/70 p-2">
      <DatePicker
        inline
        selected={date}
        onChange={(next: Date | null) => {
          const nextDate = next ?? new Date()
          setDate(nextDate)
          emitChange(nextDate, hour, minute, second)
        }}
        renderCustomHeader={({
          date: currentDate,
          decreaseMonth,
          increaseMonth,
          decreaseYear,
          increaseYear,
          changeYear,
          changeMonth,
        }) => (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-violet-100/70 px-2 py-1 text-xs text-violet-700">
            <div className="flex items-center gap-1">
              <button type="button" onClick={decreaseYear} className="px-1">
                {"<<"}
              </button>
              <button type="button" onClick={decreaseMonth} className="px-1">
                {"<"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={yearRef}>
                <button
                  type="button"
                  onClick={() => setYearOpen((prev) => !prev)}
                  className="rounded-md border border-violet-200/60 bg-white/80 px-1.5 py-0.5"
                >
                  {currentDate.getFullYear()}
                </button>
                {yearOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 h-[288px] w-20 overflow-y-auto rounded-md border border-violet-200/60 bg-white/90 shadow-lg">
                    {years.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          changeYear(year)
                          setYearOpen(false)
                        }}
                        className="block h-6 w-full px-2 text-left text-xs text-violet-700 hover:bg-violet-100"
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative" ref={monthRef}>
                <button
                  type="button"
                  onClick={() => setMonthOpen((prev) => !prev)}
                  className="rounded-md border border-violet-200/60 bg-white/80 px-1.5 py-0.5"
                >
                  {pad(currentDate.getMonth() + 1)}
                </button>
                {monthOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 h-[288px] w-12 overflow-y-auto rounded-md border border-violet-200/60 bg-white/90 shadow-lg">
                    {months.map((month, idx) => (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          changeMonth(idx)
                          setMonthOpen(false)
                        }}
                        className="block h-6 w-full px-2 text-left text-xs text-violet-700 hover:bg-violet-100"
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={increaseMonth} className="px-1">
                {">"}
              </button>
              <button type="button" onClick={increaseYear} className="px-1">
                {">>"}
              </button>
            </div>
          </div>
        )}
        calendarClassName="violet-datepicker"
      />
      <div className="mt-2 flex items-center gap-2">
        <select
          value={hour}
          onChange={(e) => {
            const next = e.target.value
            setHour(next)
            emitChange(date, next, minute, second)
          }}
          className="flex-1 rounded-lg border border-violet-200/60 bg-white/80 px-2 py-1 text-xs text-violet-700"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-xs text-violet-500">:</span>
        <select
          value={minute}
          onChange={(e) => {
            const next = e.target.value
            setMinute(next)
            emitChange(date, hour, next, second)
          }}
          className="flex-1 rounded-lg border border-violet-200/60 bg-white/80 px-2 py-1 text-xs text-violet-700"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-xs text-violet-500">:</span>
        <select
          value={second}
          onChange={(e) => {
            const next = e.target.value
            setSecond(next)
            emitChange(date, hour, minute, next)
          }}
          className="flex-1 rounded-lg border border-violet-200/60 bg-white/80 px-2 py-1 text-xs text-violet-700"
        >
          {seconds.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
