'use client'

import { useMemo } from 'react'
import { STORYBOARD_MOODS, type EmotionalMoodId } from './storyboardConfig'

interface FloralAtmosphereOverlayProps {
  progress: number
  mood: EmotionalMoodId
  onSelectMood: (mood: EmotionalMoodId) => void
  onSkipToCatalog: () => void
}

interface TextFragment {
  id: string
  start: number
  peak: number
  end: number
  content: string
  subContent?: string
  positionClass: string
  sizeClass: string
  alignClass: string
  rotation?: number
}

// 10 sparse, poetic micro-fragments staggered along the scroll trajectory
const FRAGMENTS: TextFragment[] = [
  {
    id: 'f1',
    start: 0.00,
    peak: 0.07,
    end: 0.16,
    content: 'بعضی حرف‌ها...',
    positionClass: 'top-[36%] md:top-[38%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-4xl sm:text-6xl md:text-8xl font-black',
    alignClass: 'text-center',
    rotation: -1,
  },
  {
    id: 'f2',
    start: 0.13,
    peak: 0.20,
    end: 0.29,
    content: 'با واژه‌ها گفته نمی‌شوند.',
    positionClass: 'top-[42%] md:top-[44%] right-[8%] md:right-[15%]',
    sizeClass: 'text-3xl sm:text-5xl md:text-7xl font-light',
    alignClass: 'text-right',
    rotation: 1.5,
  },
  {
    id: 'f3',
    start: 0.25,
    peak: 0.32,
    end: 0.40,
    content: 'با یک گل...',
    positionClass: 'top-[38%] md:top-[40%] left-[8%] md:left-[14%]',
    sizeClass: 'text-4xl sm:text-7xl md:text-8xl font-extrabold text-amber-200',
    alignClass: 'text-left',
    rotation: -2,
  },
  {
    id: 'f4',
    start: 0.36,
    peak: 0.43,
    end: 0.52,
    content: 'شکوفا می‌شوند.',
    positionClass: 'top-[45%] md:top-[46%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-5xl sm:text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/30',
    alignClass: 'text-center',
    rotation: 0,
  },
  {
    id: 'f5',
    start: 0.48,
    peak: 0.56,
    end: 0.65,
    content: 'برای چه حسی؟',
    subContent: 'لمس کن تا جهان هماهنگ شود',
    positionClass: 'top-[32%] md:top-[35%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-3xl sm:text-5xl md:text-6xl font-light',
    alignClass: 'text-center',
    rotation: 0,
  },
  {
    id: 'f6',
    start: 0.62,
    peak: 0.70,
    end: 0.78,
    content: 'دست‌هایی در این شهر...',
    positionClass: 'top-[40%] md:top-[42%] right-[10%] md:right-[18%]',
    sizeClass: 'text-3xl sm:text-5xl md:text-6xl font-extralight text-emerald-200',
    alignClass: 'text-right',
    rotation: 1,
  },
  {
    id: 'f7',
    start: 0.73,
    peak: 0.80,
    end: 0.88,
    content: 'شاید همین نزدیکی...',
    positionClass: 'top-[42%] md:top-[44%] left-[10%] md:left-[16%]',
    sizeClass: 'text-4xl sm:text-6xl md:text-7xl font-semibold text-cyan-200',
    alignClass: 'text-left',
    rotation: -1.5,
  },
  {
    id: 'f8',
    start: 0.83,
    peak: 0.90,
    end: 0.96,
    content: 'در انتظارِ توست.',
    positionClass: 'top-[40%] md:top-[42%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-4xl sm:text-6xl md:text-8xl font-black text-amber-300',
    alignClass: 'text-center',
    rotation: 0,
  },
]

function getFragmentMotion(progress: number, start: number, peak: number, end: number) {
  if (progress < start || progress > end) {
    return { isVisible: false, opacity: 0, translateY: 60, scale: 0.85, blur: 16 }
  }

  let opacity = 0
  let translateY = 0
  let scale = 1
  let blur = 0

  if (progress <= peak) {
    // Zooming in from deep distance and sharp blur
    const t = (progress - start) / (peak - start)
    const ease = 1 - Math.pow(1 - t, 3)
    opacity = ease
    translateY = (1 - ease) * 45
    scale = 0.82 + ease * 0.18
    blur = (1 - ease) * 14
  } else {
    // Flying past the camera towards viewer, dissolving outward
    const t = (progress - peak) / (end - peak)
    const ease = t * t * t
    opacity = 1 - ease
    translateY = -ease * 55
    scale = 1 + ease * 0.28
    blur = ease * 18
  }

  return {
    isVisible: true,
    opacity: Math.max(0, Math.min(opacity, 1)),
    translateY,
    scale,
    blur: Math.max(0, blur),
  }
}

export default function FloralAtmosphereOverlay({
  progress,
  mood,
  onSelectMood,
  onSkipToCatalog,
}: FloralAtmosphereOverlayProps) {
  // Show emotion pills during fragment f5 window (0.47 to 0.65)
  const showMoodPills = progress >= 0.47 && progress <= 0.66
  const moodPillMotion = useMemo(
    () => getFragmentMotion(progress, 0.47, 0.56, 0.66),
    [progress],
  )

  // Climax ending (0.92 to 1.0)
  const endingMotion = useMemo(
    () => getFragmentMotion(progress, 0.91, 0.96, 1.0),
    [progress],
  )

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden">
      {/* 1. ULTRA-MINIMAL TOP BAR */}
      <header className="absolute top-0 inset-x-0 flex items-center justify-between p-6 md:p-10 pointer-events-auto z-30">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
          <span className="text-white/80 text-xs md:text-sm font-light tracking-widest">
            GOLINO
          </span>
        </div>

        <button
          onClick={onSkipToCatalog}
          type="button"
          className="group flex items-center gap-2 text-white/70 hover:text-white text-xs md:text-sm font-light transition-all duration-300 hover:scale-105 cursor-pointer py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10"
        >
          <span>مشاهده محصولات</span>
          <span className="transition-transform group-hover:translate-y-0.5">↓</span>
        </button>
      </header>

      {/* 2. CHUNKED KINETIC FRAGMENTS (SPATIAL & ASYMMETRIC) */}
      <div className="relative w-full h-full">
        {FRAGMENTS.map((frag) => {
          const motion = getFragmentMotion(progress, frag.start, frag.peak, frag.end)
          if (!motion.isVisible) return null

          return (
            <div
              key={frag.id}
              className={`absolute pointer-events-none transition-transform duration-75 ${frag.positionClass} ${frag.alignClass}`}
              style={{
                opacity: motion.opacity,
                transform: `translateY(${motion.translateY}px) scale(${motion.scale}) rotate(${frag.rotation || 0}deg)`,
                filter: `blur(${motion.blur}px)`,
              }}
            >
              <span
                className={`block tracking-tight text-white drop-shadow-[0_12px_45px_rgba(0,0,0,0.7)] ${frag.sizeClass}`}
              >
                {frag.content}
              </span>
              {frag.subContent && (
                <span className="block text-white/60 text-xs md:text-sm mt-3 font-light tracking-wider">
                  {frag.subContent}
                </span>
              )}
            </div>
          )
        })}

        {/* INTERACTIVE FLOATING EMOTION WORDS (Fragment 5) */}
        {showMoodPills && moodPillMotion.isVisible && (
          <div
            className="absolute top-[48%] md:top-[50%] left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-5 md:gap-10 pointer-events-auto transition-transform duration-75 w-full max-w-xl px-4"
            style={{
              opacity: moodPillMotion.opacity,
              transform: `translate(-50%, ${moodPillMotion.translateY}px) scale(${moodPillMotion.scale})`,
              filter: `blur(${moodPillMotion.blur}px)`,
            }}
          >
            <button
              type="button"
              onClick={() => onSelectMood('love')}
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold transition-all duration-300 cursor-pointer ${
                mood === 'love'
                  ? 'text-pink-300 scale-110 drop-shadow-[0_0_30px_rgba(244,114,182,0.9)] underline decoration-pink-400 underline-offset-8'
                  : 'text-white/50 hover:text-white hover:scale-105'
              }`}
            >
              دوست‌داشتن
            </button>

            <button
              type="button"
              onClick={() => onSelectMood('longing')}
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold transition-all duration-300 cursor-pointer ${
                mood === 'longing'
                  ? 'text-blue-300 scale-110 drop-shadow-[0_0_30px_rgba(147,197,253,0.9)] underline decoration-blue-400 underline-offset-8'
                  : 'text-white/50 hover:text-white hover:scale-105'
              }`}
            >
              دلتنگی
            </button>

            <button
              type="button"
              onClick={() => onSelectMood('new_beginning')}
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold transition-all duration-300 cursor-pointer ${
                mood === 'new_beginning'
                  ? 'text-amber-300 scale-110 drop-shadow-[0_0_30px_rgba(252,211,77,0.9)] underline decoration-amber-400 underline-offset-8'
                  : 'text-white/50 hover:text-white hover:scale-105'
              }`}
            >
              شروعی تازه
            </button>
          </div>
        )}

        {/* CLIMAX / DESTINATION ENTRY (Fragment 9 / 10) */}
        {endingMotion.isVisible && (
          <div
            className="absolute top-[42%] md:top-[44%] left-1/2 -translate-x-1/2 text-center pointer-events-auto transition-transform duration-75 w-full max-w-lg px-6"
            style={{
              opacity: endingMotion.opacity,
              transform: `translate(-50%, ${endingMotion.translateY}px) scale(${endingMotion.scale})`,
              filter: `blur(${endingMotion.blur}px)`,
            }}
          >
            <h2 className="text-5xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_15px_60px_rgba(0,0,0,0.8)] mb-4">
              گلینو
            </h2>
            <p className="text-white/80 text-sm md:text-base font-light mb-8">
              هزار انتخاب، به نزدیکی یک نگاه
            </p>

            <button
              type="button"
              onClick={onSkipToCatalog}
              className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-medium text-sm md:text-base border border-white/30 backdrop-blur-lg shadow-[0_10px_35px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>ورود به فروشگاه</span>
              <span>↓</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. SUBTLE GLOWING VERTICAL DESCENT THREAD */}
      <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
        <div className="w-[1.5px] h-24 md:h-36 bg-white/10 rounded-full overflow-hidden relative">
          <div
            className="w-full bg-gradient-to-b from-emerald-400 via-amber-300 to-pink-400 transition-all duration-100 rounded-full"
            style={{
              height: `${Math.round(progress * 100)}%`,
            }}
          />
        </div>
        <span className="text-[10px] text-white/40 tracking-widest font-mono">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  )
}
