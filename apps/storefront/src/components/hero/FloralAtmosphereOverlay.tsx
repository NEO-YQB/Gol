'use client'

import { useMemo } from 'react'
import {
  BOUTIQUE_FLORISTS,
  STORYBOARD_MOODS,
  STORYBOARD_STAGES,
  type EmotionalMoodId,
} from './storyboardConfig'

interface FloralAtmosphereOverlayProps {
  progress: number
  mood: EmotionalMoodId
  onSelectMood: (mood: EmotionalMoodId) => void
  onSkipToCatalog: () => void
}

export default function FloralAtmosphereOverlay({
  progress,
  mood,
  onSelectMood,
  onSkipToCatalog,
}: FloralAtmosphereOverlayProps) {
  // Determine current active stage (0 to 4) based on progress
  const activeStageIndex = useMemo(() => {
    if (progress < 0.2) return 0
    if (progress < 0.45) return 1
    if (progress < 0.7) return 2
    if (progress < 0.88) return 3
    return 4
  }, [progress])

  const stage = STORYBOARD_STAGES[activeStageIndex]
  const currentMoodConfig = STORYBOARD_MOODS[mood]

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none p-4 md:p-8 select-none">
      {/* 1. TOP HUD BAR */}
      <header className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs md:text-sm font-medium shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          <span className="w-2 h-2 rounded-full animate-ping bg-emerald-400" />
          <span>گلینو — شبکه گلفروشی‌های منتخب</span>
        </div>

        {/* Quick Skip to Shop Button */}
        <button
          onClick={onSkipToCatalog}
          type="button"
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-[#18382b]/80 hover:bg-[#18382b] text-white/95 text-xs md:text-sm font-semibold border border-white/20 backdrop-blur-lg shadow-[0_8px_25px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span>مشاهده محصولات</span>
          <svg
            className="w-4 h-4 transition-transform group-hover:translate-y-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </header>

      {/* 2. DYNAMIC CENTER / NARRATIVE CONTENT */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto my-auto w-full">
        {/* Stage 0: سرآغاز */}
        {activeStageIndex === 0 && (
          <div className="animate-fadeIn transition-all duration-700 pointer-events-auto">
            <span className="inline-block px-3.5 py-1 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 text-xs tracking-wider">
              فصل اول: غنچه احساس
            </span>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)] mb-4">
              بعضی حرف‌ها، با یک گل شروع می‌شوند.
            </h1>
            <p className="text-white/80 text-sm md:text-lg max-w-xl mx-auto font-normal leading-relaxed mb-6">
              یک غنچه شیشه‌ای؛ بازتاب نیت‌های ناگفته و احساساتی که به دنبال واژه‌ای شایسته می‌گردند.
            </p>
            <div className="flex items-center justify-center gap-2 text-white/60 text-xs md:text-sm">
              <span className="inline-block animate-bounce">↓</span>
              <span>برای شکفتن و کشف انتخاب‌ها، اسکرول یا لمس کنید</span>
            </div>
          </div>
        )}

        {/* Stage 1: انتخاب حس */}
        {activeStageIndex === 1 && (
          <div className="animate-fadeIn transition-all duration-700 pointer-events-auto w-full">
            <span className="inline-block px-3.5 py-1 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-pink-200 text-xs tracking-wider">
              فصل دوم: انتخاب حس
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)] mb-3">
              حسی که در سینه داری، چه رنگی است؟
            </h2>
            <p className="text-white/80 text-sm md:text-base max-w-lg mx-auto mb-6">
              نیت خود را انتخاب کنید تا ترکیب گل‌ها و حال‌وهوای فضا با قلب شما هم‌صدا شود:
            </p>

            {/* Interactive Emotion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-2xl mx-auto">
              {(Object.keys(STORYBOARD_MOODS) as EmotionalMoodId[]).map((moodKey) => {
                const item = STORYBOARD_MOODS[moodKey]
                const isSelected = mood === moodKey

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectMood(moodKey)}
                    className={`flex flex-col items-center px-5 py-3 rounded-2xl transition-all duration-300 border cursor-pointer ${
                      isSelected
                        ? 'bg-white/25 border-white text-white shadow-[0_0_25px_rgba(255,255,255,0.4)] scale-105'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-white/80 hover:scale-102'
                    } backdrop-blur-md`}
                  >
                    <span className="font-bold text-sm md:text-base">{item.label}</span>
                    <span className="text-[11px] opacity-75 mt-0.5">{item.sublabel}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-white/60 text-xs italic mt-4">«{currentMoodConfig.quote}»</p>
          </div>
        )}

        {/* Stage 2: تنوع گلفروشی‌ها */}
        {activeStageIndex === 2 && (
          <div className="animate-fadeIn transition-all duration-700 pointer-events-auto w-full">
            <span className="inline-block px-3.5 py-1 mb-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-200 text-xs tracking-wider">
              فصل سوم: انتخاب‌های بسیار
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)] mb-2">
              هر گلفروشی، یک انتخاب تازه.
            </h2>
            <p className="text-white/80 text-sm md:text-base max-w-xl mx-auto mb-6">
              در گلینو صدها هنرمند گل‌آرا و بوتیک اصیل، دسته‌گل‌های منحصربه‌فردشان را به نمایش گذاشته‌اند:
            </p>

            {/* Florist Cards Carousel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
              {BOUTIQUE_FLORISTS.map((florist) => (
                <div
                  key={florist.id}
                  className="flex flex-col text-right p-4 rounded-2xl bg-black/35 hover:bg-black/50 border border-white/15 backdrop-blur-lg shadow-xl transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-amber-300 text-xs font-bold">★ {florist.rating}</span>
                    <h3 className="text-white font-bold text-sm md:text-base">{florist.name}</h3>
                  </div>
                  <span className="text-emerald-300 text-xs font-medium mb-1">{florist.neighborhood}</span>
                  <p className="text-white/70 text-xs leading-relaxed mb-2 line-clamp-2">
                    {florist.specialty}
                  </p>
                  <span className="text-[11px] text-white/50 border-t border-white/10 pt-1.5">
                    {florist.deliveryTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 3: نزدیکی */}
        {activeStageIndex === 3 && (
          <div className="animate-fadeIn transition-all duration-700 pointer-events-auto">
            <span className="inline-block px-3.5 py-1 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-cyan-200 text-xs tracking-wider">
              فصل چهارم: نزدیکی
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)] mb-4">
              و شاید گلِ منتظرت، همین نزدیکی باشد.
            </h2>
            <p className="text-white/85 text-sm md:text-lg max-w-xl mx-auto font-normal leading-relaxed mb-6">
              سفارش شما از نزدیک‌ترین گلفروشی به مقصد آماده می‌شود تا نهایت تازگی، عطر طبیعی و ارسال کمتر از ۲ ساعت تضمین شود.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-200 text-xs md:text-sm font-medium backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>پوشش سراسری نزدیک‌ترین بوتیک‌های گل در شهر شما</span>
            </div>
          </div>
        )}

        {/* Stage 4: فرود در فروشگاه */}
        {activeStageIndex === 4 && (
          <div className="animate-fadeIn transition-all duration-700 pointer-events-auto">
            <span className="inline-block px-3.5 py-1 mb-4 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-200 text-xs tracking-wider">
              پایان روایت
            </span>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)] mb-4">
              حست را انتخاب کن. گلینو، انتخاب‌هایش را نشانت می‌دهد.
            </h2>
            <p className="text-white/85 text-sm md:text-lg max-w-xl mx-auto font-normal leading-relaxed mb-8">
              اکنون با آرامش در میان هزاران گل و گیاه تازه بگردید و انتخابی شایسته احساس خود داشته باشید.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={onSkipToCatalog}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm md:text-base shadow-[0_10px_30px_rgba(232,168,98,0.35)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                دیدن گل‌های منتخب این حس
              </button>
              <button
                type="button"
                onClick={onSkipToCatalog}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-sm md:text-base border border-white/25 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                ورود به تالار محصولات
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. BOTTOM TIMELINE & STAGE DOTS */}
      <footer className="w-full flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-auto pt-4 border-t border-white/10">
        {/* Stage Step Indicator */}
        <div className="flex items-center gap-2">
          {STORYBOARD_STAGES.map((s, idx) => (
            <div
              key={s.index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === activeStageIndex
                  ? 'w-8 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                  : idx < activeStageIndex
                    ? 'w-3 bg-white/60'
                    : 'w-2 bg-white/20'
              }`}
              title={s.title}
            />
          ))}
          <span className="text-white/70 text-xs font-medium mr-2">
            مرحله {activeStageIndex + 1} از ۵: {stage.title}
          </span>
        </div>

        {/* Ambient indicator */}
        <div className="text-white/60 text-xs hidden md:flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>اسکرول طبیعی فعال است — برای بازگشت به بالا اسکرول کنید</span>
        </div>
      </footer>
    </div>
  )
}
