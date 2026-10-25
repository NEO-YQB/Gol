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
  enterStart: number
  enterEnd: number
  exitStart: number
  exitEnd: number
  content: string
  subContent?: string
  positionClass: string
  sizeClass: string
  alignClass: string
  rotation?: number
}

// Generously spaced, meditative timeline — especially after 50%
const FRAGMENTS: TextFragment[] = [
  {
    id: 'f1',
    enterStart: 0.00,
    enterEnd: 0.05,
    exitStart: 0.12,
    exitEnd: 0.18,
    content: 'بعضی حرف‌ها...',
    positionClass: 'top-[36%] md:top-[38%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-4xl sm:text-6xl md:text-8xl font-black',
    alignClass: 'text-center',
    rotation: -1,
  },
  {
    id: 'f2',
    enterStart: 0.14,
    enterEnd: 0.19,
    exitStart: 0.27,
    exitEnd: 0.33,
    content: 'با واژه‌ها گفته نمی‌شوند.',
    positionClass: 'top-[42%] md:top-[44%] right-[8%] md:right-[15%]',
    sizeClass: 'text-3xl sm:text-5xl md:text-7xl font-light',
    alignClass: 'text-right',
    rotation: 1.5,
  },
  {
    id: 'f3',
    enterStart: 0.28,
    enterEnd: 0.33,
    exitStart: 0.40,
    exitEnd: 0.46,
    content: 'با یک گل...',
    positionClass: 'top-[38%] md:top-[40%] left-[8%] md:left-[14%]',
    sizeClass: 'text-4xl sm:text-7xl md:text-8xl font-extrabold text-amber-200',
    alignClass: 'text-left',
    rotation: -2,
  },
  {
    id: 'f4',
    enterStart: 0.41,
    enterEnd: 0.46,
    exitStart: 0.54,
    exitEnd: 0.60,
    content: 'شکوفا می‌شوند.',
    positionClass: 'top-[45%] md:top-[46%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-5xl sm:text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white/95 to-white/30',
    alignClass: 'text-center',
    rotation: 0,
  },
  {
    id: 'f5',
    enterStart: 0.55,
    enterEnd: 0.60,
    exitStart: 0.70,
    exitEnd: 0.76,
    content: 'برای چه حسی؟',
    subContent: 'لمس کن تا جهان هماهنگ شود',
    positionClass: 'top-[30%] md:top-[33%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-3xl sm:text-5xl md:text-6xl font-light',
    alignClass: 'text-center',
    rotation: 0,
  },
  {
    id: 'f6',
    enterStart: 0.72,
    enterEnd: 0.77,
    exitStart: 0.85,
    exitEnd: 0.90,
    content: 'شاید همین نزدیکی...',
    subContent: 'دست‌هایی هنرمند، گلی را در انتظارِ تو چیده‌اند',
    positionClass: 'top-[40%] md:top-[42%] left-1/2 -translate-x-1/2',
    sizeClass: 'text-4xl sm:text-6xl md:text-8xl font-black text-amber-200',
    alignClass: 'text-center',
    rotation: 0,
  },
]

/**
 * 3-Phase Easing Calculation:
 * 1. Entry: Smooth decelerating slide-in with unblur
 * 2. Dwell / On-Screen: Ultra-slow, serene floating drift in crystal sharpness
 * 3. Exit: Gentle accelerating dissolve upward into blur
 */
function getFragmentMotion(
  progress: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number,
) {
  if (progress < enterStart || progress > exitEnd) {
    return { isVisible: false, opacity: 0, translateY: 55, scale: 0.85, blur: 16 }
  }

  // Phase 1: Entry (Deceleration into focus)
  if (progress < enterEnd) {
    const t = (progress - enterStart) / (enterEnd - enterStart)
    const ease = 1 - Math.pow(1 - t, 3)
    return {
      isVisible: true,
      opacity: Math.max(0, Math.min(ease, 1)),
      translateY: (1 - ease) * 55,
      scale: 0.86 + ease * 0.14,
      blur: (1 - ease) * 16,
    }
  }

  // Phase 2: Dwell / On-Screen (Peaceful, slow floating drift)
  if (progress <= exitStart) {
    const t = (progress - enterEnd) / (exitStart - enterEnd)
    const floatY = -t * 12
    const floatScale = 1.0 + t * 0.03
    return {
      isVisible: true,
      opacity: 1,
      translateY: floatY,
      scale: floatScale,
      blur: 0,
    }
  }

  // Phase 3: Exit (Accelerating dissolve out)
  const t = (progress - exitStart) / (exitEnd - exitStart)
  const ease = t * t * t
  return {
    isVisible: true,
    opacity: Math.max(0, 1 - ease),
    translateY: -12 - ease * 65,
    scale: 1.03 + ease * 0.22,
    blur: ease * 18,
  }
}

export default function FloralAtmosphereOverlay({
  progress,
  mood,
  onSelectMood,
  onSkipToCatalog,
}: FloralAtmosphereOverlayProps) {
  // Show emotion pills generously during 0.55 to 0.76 (over 20% of scroll space!)
  const showMoodPills = progress >= 0.55 && progress <= 0.76
  const moodPillMotion = useMemo(
    () => getFragmentMotion(progress, 0.55, 0.60, 0.70, 0.76),
    [progress],
  )

  // Climax ending: spacious from 0.88 to 1.0 (serene and grounded)
  const endingMotion = useMemo(
    () => getFragmentMotion(progress, 0.88, 0.92, 0.99, 1.0),
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

      {/* 2. CHUNKED KINETIC FRAGMENTS (SPATIOUS & CALM) */}
      <div className="relative w-full h-full">
        {FRAGMENTS.map((frag) => {
          const motion = getFragmentMotion(
            progress,
            frag.enterStart,
            frag.enterEnd,
            frag.exitStart,
            frag.exitEnd,
          )
          if (!motion.isVisible) return null

          return (
            <div
              key={frag.id}
              className={`absolute pointer-events-none ${frag.positionClass} ${frag.alignClass}`}
              style={{
                opacity: motion.opacity,
                transform: `translateY(${motion.translateY}px) scale(${motion.scale}) rotate(${frag.rotation || 0}deg)`,
                filter: `blur(${motion.blur}px)`,
                willChange: 'transform, opacity, filter',
              }}
            >
              <span
                className={`block tracking-tight text-white drop-shadow-[0_12px_45px_rgba(0,0,0,0.7)] ${frag.sizeClass}`}
              >
                {frag.content}
              </span>
              {frag.subContent && (
                <span className="block text-white/70 text-sm md:text-lg mt-4 font-light tracking-wide">
                  {frag.subContent}
                </span>
              )}
            </div>
          )
        })}

        {/* INTERACTIVE FLOATING EMOTION WORDS (0.55 to 0.76) */}
        {showMoodPills && moodPillMotion.isVisible && (
          <div
            className="absolute top-[48%] md:top-[50%] left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-5 md:gap-10 pointer-events-auto w-full max-w-xl px-4"
            style={{
              opacity: moodPillMotion.opacity,
              transform: `translate(-50%, ${moodPillMotion.translateY}px) scale(${moodPillMotion.scale})`,
              filter: `blur(${moodPillMotion.blur}px)`,
              willChange: 'transform, opacity, filter',
            }}
          >
            <button
              type="button"
              onClick={() => onSelectMood('love')}
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold transition-all duration-500 cursor-pointer ${
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
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold transition-all duration-500 cursor-pointer ${
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
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold transition-all duration-500 cursor-pointer ${
                mood === 'new_beginning'
                  ? 'text-amber-300 scale-110 drop-shadow-[0_0_30px_rgba(252,211,77,0.9)] underline decoration-amber-400 underline-offset-8'
                  : 'text-white/50 hover:text-white hover:scale-105'
              }`}
            >
              شروعی تازه
            </button>
          </div>
        )}

        {/* CLIMAX / DESTINATION ENTRY (0.88 to 1.0) */}
        {endingMotion.isVisible && (
          <div
            className="absolute top-[42%] md:top-[44%] left-1/2 -translate-x-1/2 text-center pointer-events-auto w-full max-w-lg px-6"
            style={{
              opacity: endingMotion.opacity,
              transform: `translate(-50%, ${endingMotion.translateY}px) scale(${endingMotion.scale})`,
              filter: `blur(${endingMotion.blur}px)`,
              willChange: 'transform, opacity, filter',
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
            className="w-full bg-gradient-to-b from-emerald-400 via-amber-300 to-pink-400 transition-all duration-150 rounded-full"
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
