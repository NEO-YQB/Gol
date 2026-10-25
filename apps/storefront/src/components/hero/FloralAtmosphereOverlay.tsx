'use client'

import { useMemo } from 'react'
import { STORYBOARD_MOODS, type EmotionalMoodId } from './storyboardConfig'

interface FloralAtmosphereOverlayProps {
  progress: number
  mood: EmotionalMoodId
  onSelectMood: (mood: EmotionalMoodId) => void
  onSkipToCatalog: () => void
}

/**
 * Calculates a smooth bell-curve for opacity, scale, blur, and vertical drift
 * as progress travels between [start, peak, end].
 */
function getKineticTransform(progress: number, start: number, peak: number, end: number) {
  if (progress < start || progress > end) {
    return { isVisible: false, opacity: 0, translateY: 40, scale: 0.9, blur: 12 }
  }

  let opacity = 0
  let translateY = 0
  let scale = 1
  let blur = 0

  if (progress <= peak) {
    // Entering phase: from start to peak
    const t = (progress - start) / (peak - start)
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3)
    opacity = ease
    translateY = (1 - ease) * 50 // moves upward into view
    scale = 0.88 + ease * 0.12 // zooms in slightly
    blur = (1 - ease) * 14 // dissolves from blur
  } else {
    // Exiting phase: from peak to end
    const t = (progress - peak) / (end - peak)
    // Ease-in cubic
    const ease = t * t * t
    opacity = 1 - ease
    translateY = -ease * 60 // floats up and away
    scale = 1 + ease * 0.15 // continues zooming past camera
    blur = ease * 16 // melts back into blur
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
  // Kinetic transforms for the 5 continuous moments along the descent
  const moment1 = useMemo(() => getKineticTransform(progress, 0.0, 0.10, 0.26), [progress])
  const moment2 = useMemo(() => getKineticTransform(progress, 0.22, 0.36, 0.50), [progress])
  const moment3 = useMemo(() => getKineticTransform(progress, 0.46, 0.60, 0.72), [progress])
  const moment4 = useMemo(() => getKineticTransform(progress, 0.68, 0.80, 0.90), [progress])
  const moment5 = useMemo(() => getKineticTransform(progress, 0.85, 0.94, 1.00), [progress])

  return (
    <div className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden flex flex-col justify-between">
      {/* 1. MINIMAL ELEGANT TOP BAR */}
      <header className="flex items-center justify-between w-full p-6 md:p-10 pointer-events-auto">
        <div className="flex items-center gap-3 text-white/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs md:text-sm font-medium tracking-wide">
            گلینو — سفری در میان شکوفه‌ها
          </span>
        </div>

        <button
          onClick={onSkipToCatalog}
          type="button"
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-xs md:text-sm font-light border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span>ورود مستقیم به فروشگاه</span>
          <span className="transition-transform group-hover:translate-y-0.5">↓</span>
        </button>
      </header>

      {/* 2. CONTINUOUS KINETIC TYPOGRAPHY LAYER (NO BOXES, NO RIGID CARDS) */}
      <div className="relative flex-1 w-full max-w-5xl mx-auto flex items-center justify-center px-6">
        {/* MOMENT 1: سرآغاز — بیدار شدن غنچه */}
        {moment1.isVisible && (
          <div
            className="absolute text-center max-w-3xl pointer-events-auto transition-transform duration-75"
            style={{
              opacity: moment1.opacity,
              transform: `translateY(${moment1.translateY}px) scale(${moment1.scale})`,
              filter: `blur(${moment1.blur}px)`,
            }}
          >
            <span className="block text-xs md:text-sm tracking-widest text-emerald-300/80 mb-4 font-light">
              در ابتدای سکوت
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.2] drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] mb-6">
              بعضی حرف‌ها،
              <br />
              با یک گل شروع می‌شوند.
            </h1>
            <p className="text-white/70 text-sm md:text-lg font-light leading-relaxed max-w-xl mx-auto">
              به سمت پایین حرکت کنید؛ غنچه آرام باز می‌شود و کلمات در فضا جان می‌گیرند...
            </p>
          </div>
        )}

        {/* MOMENT 2: انتخاب حس — کلمات آزاد و رها در فضا */}
        {moment2.isVisible && (
          <div
            className="absolute text-center max-w-4xl pointer-events-auto transition-transform duration-75"
            style={{
              opacity: moment2.opacity,
              transform: `translateY(${moment2.translateY}px) scale(${moment2.scale})`,
              filter: `blur(${moment2.blur}px)`,
            }}
          >
            <span className="block text-xs md:text-sm tracking-widest text-pink-300/80 mb-3 font-light">
              طیف احساسات
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] mb-8">
              حسی که در سینه داری، چه رنگی است؟
            </h2>

            {/* Organic Floating Words (Click to tint the world) */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 max-w-2xl mx-auto">
              <button
                type="button"
                onClick={() => onSelectMood('love')}
                className={`text-lg md:text-2xl font-bold transition-all duration-500 cursor-pointer px-4 py-2 rounded-full ${
                  mood === 'love'
                    ? 'text-pink-300 scale-110 drop-shadow-[0_0_25px_rgba(244,114,182,0.8)]'
                    : 'text-white/60 hover:text-white hover:scale-105'
                }`}
              >
                «برای دوست‌داشتن»
              </button>

              <button
                type="button"
                onClick={() => onSelectMood('longing')}
                className={`text-lg md:text-2xl font-bold transition-all duration-500 cursor-pointer px-4 py-2 rounded-full ${
                  mood === 'longing'
                    ? 'text-blue-300 scale-110 drop-shadow-[0_0_25px_rgba(147,197,253,0.8)]'
                    : 'text-white/60 hover:text-white hover:scale-105'
                }`}
              >
                «برای دلتنگی»
              </button>

              <button
                type="button"
                onClick={() => onSelectMood('new_beginning')}
                className={`text-lg md:text-2xl font-bold transition-all duration-500 cursor-pointer px-4 py-2 rounded-full ${
                  mood === 'new_beginning'
                    ? 'text-amber-300 scale-110 drop-shadow-[0_0_25px_rgba(252,211,77,0.8)]'
                    : 'text-white/60 hover:text-white hover:scale-105'
                }`}
              >
                «برای یک شروع تازه»
              </button>
            </div>
            <p className="text-white/50 text-xs md:text-sm mt-6 font-light">
              با لمس هر حس، رنگ جهان تغییر می‌کند
            </p>
          </div>
        )}

        {/* MOMENT 3: انتخاب‌های بسیار — زمزمه گلفروشان در امتداد اسکرول */}
        {moment3.isVisible && (
          <div
            className="absolute text-center max-w-4xl pointer-events-auto transition-transform duration-75"
            style={{
              opacity: moment3.opacity,
              transform: `translateY(${moment3.translateY}px) scale(${moment3.scale})`,
              filter: `blur(${moment3.blur}px)`,
            }}
          >
            <span className="block text-xs md:text-sm tracking-widest text-amber-300/80 mb-3 font-light">
              آفرینش دسته‌گل‌ها
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] mb-6">
              هر گلفروشی،
              <br />
              یک انتخاب تازه.
            </h2>
            <p className="text-white/80 text-base md:text-xl font-light max-w-xl mx-auto leading-relaxed mb-6">
              صدها هنرمند گل‌آرا در سراسر شهر، گلبرگ‌ها را برای همین ثانیه به هم آمیخته‌اند...
            </p>
            {/* Soft Ambient Boutique Names floating in background */}
            <div className="flex items-center justify-center gap-6 text-white/40 text-xs md:text-sm tracking-widest font-light">
              <span>استودیو فلورا</span>
              <span>•</span>
              <span>بوتیک مریم</span>
              <span>•</span>
              <span>گل‌آرایی نسترن</span>
              <span>•</span>
              <span>ارکیده رویال</span>
            </div>
          </div>
        )}

        {/* MOMENT 4: نزدیکی — رسیدن به محله و در دسترس بودن */}
        {moment4.isVisible && (
          <div
            className="absolute text-center max-w-3xl pointer-events-auto transition-transform duration-75"
            style={{
              opacity: moment4.opacity,
              transform: `translateY(${moment4.translateY}px) scale(${moment4.scale})`,
              filter: `blur(${moment4.blur}px)`,
            }}
          >
            <span className="block text-xs md:text-sm tracking-widest text-cyan-300/80 mb-3 font-light">
              همین نزدیکی‌ها
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.2] drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] mb-6">
              و شاید گلِ منتظرت،
              <br />
              همین نزدیکی باشد.
            </h2>
            <p className="text-white/80 text-sm md:text-lg font-light leading-relaxed max-w-lg mx-auto">
              سفارش تو از نزدیک‌ترین گل‌فروشی محله‌ات آماده می‌شود؛ با همان طراوت شبنم صبحگاهی.
            </p>
          </div>
        )}

        {/* MOMENT 5: فرود در فروشگاه — پایان پرواز و ورود طبیعی به کاتالوگ */}
        {moment5.isVisible && (
          <div
            className="absolute text-center max-w-3xl pointer-events-auto transition-transform duration-75"
            style={{
              opacity: moment5.opacity,
              transform: `translateY(${moment5.translateY}px) scale(${moment5.scale})`,
              filter: `blur(${moment5.blur}px)`,
            }}
          >
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.15] drop-shadow-[0_10px_50px_rgba(0,0,0,0.7)] mb-6">
              حست را انتخاب کن.
              <br />
              <span className="text-amber-300 font-extrabold">گلینو، انتخاب‌هایش را نشانت می‌دهد.</span>
            </h2>
            <p className="text-white/85 text-base md:text-xl font-light mb-8 max-w-lg mx-auto">
              به ویترین گل‌ها خوش آمدی.
            </p>

            <button
              type="button"
              onClick={onSkipToCatalog}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/20 hover:bg-white/30 text-white font-semibold text-base md:text-lg border border-white/30 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>مشاهده دسته‌بندی‌ها و گل‌ها</span>
              <span>↓</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. SUBTLE DESCENT THREAD (NO STEPS, JUST A CONTINUOUS GLOWING RIVER OF PROGRESS) */}
      <footer className="w-full flex items-center justify-between p-6 md:p-10 pointer-events-auto">
        <div className="flex items-center gap-3 text-white/50 text-xs font-light">
          <div className="w-20 md:w-32 h-[2px] bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span>{Math.round(progress * 100)}% عمق مسیر</span>
        </div>

        <div className="text-white/40 text-xs hidden sm:block font-light">
          اسکرول کنید تا به سمت پایین فرود بیایید ↓
        </div>
      </footer>
    </div>
  )
}
