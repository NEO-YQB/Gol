'use client'

import { useEffect, useRef, useState } from 'react'

interface FloralShowcaseSceneProps {
  progress: number
}

interface ShowcaseItem {
  id: string
  tag: string
  title: string
  subtitle: string
  image: string
  badge: string
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'bouquet',
    tag: 'دسته‌گل ژورنالی',
    title: 'دسته‌گل پیوند بلانش',
    subtitle: 'رزهای مخملی سرخ و اکالیپتوس در کاور کرافت فرانسوی',
    image: '/hero/showcase-bouquet.webp',
    badge: 'انتخاب محبوب',
  },
  {
    id: 'box',
    tag: 'باکس گل مخملی',
    title: 'باکس استوانه‌ای نایت‌ولوت',
    subtitle: 'چیدمان گنبدی متراکم رزهای ممتاز در جعبه مخمل با طلاکوب',
    image: '/hero/showcase-box.webp',
    badge: 'مدرن و لوکس',
  },
  {
    id: 'basket',
    tag: 'سبد گل آرتیزان',
    title: 'سبد حصیری بهاره پیونی',
    subtitle: 'بافت دست‌ساز با گل‌های فصلی معطر و شاخه‌های رونده',
    image: '/hero/showcase-basket.webp',
    badge: 'هنری و باوقار',
  },
]

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * Math.max(0, Math.min(1, t))
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

function easeInQuad(t: number): number {
  return t * t
}

export default function FloralShowcaseScene({ progress }: FloralShowcaseSceneProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [windowWidth, setWindowWidth] = useState(1200)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const [, setParallaxTick] = useState(0)

  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768)
    setIsTouchDevice(isTouch)
    setWindowWidth(window.innerWidth || 1200)

    const handleResize = () => setWindowWidth(window.innerWidth || 1200)
    window.addEventListener('resize', handleResize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.targetY = (e.clientY / window.innerHeight) * 2 - 1
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    let rafId: number
    const animate = () => {
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06
      setParallaxTick((t) => (t + 1) % 1000)
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Once beyond this sequence, unmount
  if (progress > 0.38) {
    return null
  }

  // =========================================================================
  // CHOREOGRAPHY PROGRESS TIMELINE:
  // Phase 1 (0.00 -> 0.07):
  //   - FOCUS is on the invitation text ("برای مرور ویترین گل ها اسکرول کنید")
  //   - The showcase is deeply in the background: scale: 0.75, blur: 14px, opacity: 0.45
  // Phase 2 (0.05 -> 0.10):
  //   - The invitation text dissolves and glides upward
  //   - The showcase glides FORWARD from depth into razor-sharp focus (blur -> 0, scale -> 1.0)
  // Phase 3 (0.08 -> 0.28):
  //   - Active 3D carousel traversal: smooth depth-of-field between Item 0, 1, 2
  // Phase 4 (0.28 -> 0.36):
  //   - Smooth upward ascension of showcase as the narrative continues
  // =========================================================================

  // Entrance of showcase from depth into foreground
  const introTransition = Math.min(Math.max((progress - 0.01) / 0.07, 0), 1)
  const introEase = easeInOutCubic(introTransition)

  // Initial text prompt opacity & motion (full focus at start, dissolves smoothly on scroll)
  const promptOpacity = Math.max(0, 1 - progress / 0.055)
  const promptTranslateY = -easeInQuad(Math.min(progress / 0.055, 1)) * 40
  const promptScale = 1 - Math.min(progress / 0.055, 1) * 0.08

  // Showcase depth entrance values
  const showcaseScale = lerp(0.74, 1.0, introEase)
  const showcaseBlur = lerp(14, 0, introEase)
  const showcaseOpacity = lerp(0.42, 1.0, introEase)
  const showcaseTranslateY = lerp(50, 0, introEase)

  // Carousel Virtual Camera Position (from 0.0 to 2.0)
  // Between progress 0.08 and 0.28
  const carouselNormalized = Math.min(Math.max((progress - 0.07) / 0.20, 0), 1)
  const carouselCamera = carouselNormalized * (SHOWCASE_ITEMS.length - 1)

  // Exit ascension
  const liftT = progress > 0.28 ? easeInOutCubic((progress - 0.28) / 0.08) : 0
  const exitLiftY = -liftT * 115

  const isMobile = windowWidth < 768
  const itemSpacing = isMobile ? 300 : 440

  // Parallax subtle 3D tilt
  const tiltX = mouseRef.current.y * -4
  const tiltY = mouseRef.current.x * 6

  const activeIndex = Math.min(
    Math.max(Math.round(carouselCamera), 0),
    SHOWCASE_ITEMS.length - 1,
  )

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden"
      style={{
        transform: `translateY(${exitLiftY}vh)`,
        opacity: Math.max(0, 1 - liftT * 1.5),
        willChange: 'transform, opacity',
      }}
    >
      {/* =========================================================================
          1. INITIAL CENTERED PROMPT (Full focus at start, high contrast card)
          ========================================================================= */}
      {promptOpacity > 0.01 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-50 pointer-events-auto transition-opacity duration-300"
          style={{
            opacity: promptOpacity,
            transform: `translateY(${promptTranslateY}px) scale(${promptScale})`,
          }}
        >
          <div className="max-w-lg px-8 py-6 rounded-3xl bg-black/65 backdrop-blur-2xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col items-center">
            {isTouchDevice ? (
              // Mobile Hand Swipe Down Indicator
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-amber-300 animate-bounce mb-3 shadow-[0_0_20px_rgba(252,211,77,0.4)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path d="M12 4v16m0 0l-5-5m5 5l5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              // Desktop Mouse Scroll Wheel Indicator
              <div className="w-6 h-9 rounded-full border-2 border-amber-300/90 flex items-start justify-center p-1 mb-3 shadow-[0_0_16px_rgba(252,211,77,0.3)]">
                <div className="w-1.5 h-2.5 rounded-full bg-amber-300 animate-[bounce_1.4s_infinite]" />
              </div>
            )}

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] tracking-tight">
              {isTouchDevice ? 'به سمت پایین بکشید تا ویترین ورق بخورد' : 'برای مرور ویترین گل‌ها، اسکرول کنید'}
            </h2>

            <p className="mt-2 text-white/75 text-xs sm:text-sm font-light tracking-wide">
              هنر و رایحهٔ منتخب‌ترین گلفروشی‌های اطراف شما
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. SLENDER GLASS PAGINATION INDICATOR (Visible once showcase enters)
          ========================================================================= */}
      <div
        className="absolute top-20 sm:top-24 inset-x-0 flex items-center justify-center pointer-events-none z-30 transition-opacity duration-500"
        style={{
          opacity: lerp(0, 1, introEase),
        }}
      >
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {SHOWCASE_ITEMS.map((item, idx) => (
            <div
              key={item.id}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === activeIndex
                  ? 'w-7 bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]'
                  : 'w-2 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* =========================================================================
          3. 3D SHOWCASE CAROUSEL (Enters from depth, silky smooth focus/blur)
          ========================================================================= */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-all duration-300"
        style={{
          transform: `scale(${showcaseScale}) translateY(${showcaseTranslateY}px)`,
          filter: `blur(${showcaseBlur}px)`,
          opacity: showcaseOpacity,
          perspective: '1400px',
          willChange: 'transform, filter, opacity',
        }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center transition-transform duration-100 will-change-transform"
          style={{
            transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {SHOWCASE_ITEMS.map((item, index) => {
            // Distance from current camera position
            const distance = index - carouselCamera
            const absDistance = Math.abs(distance)

            // Silky smooth physical interpolation
            const translateX = distance * itemSpacing
            const translateZ = -Math.pow(absDistance, 1.4) * (isMobile ? 180 : 260)
            const itemScale = Math.max(0.72, 1.05 - easeOutQuad(Math.min(absDistance, 1)) * 0.32)
            
            // Ultra-smooth progressive bokeh blur & depth dimming
            const itemBlur = easeInQuad(Math.min(absDistance, 1.2)) * 12
            const itemBrightness = Math.max(0.4, 1.0 - absDistance * 0.45)
            const itemOpacity = Math.max(0.25, 1.0 - absDistance * 0.6)
            const zIndex = Math.round(30 - absDistance * 10)
            const isFocused = absDistance < 0.4

            return (
              <div
                key={item.id}
                className="absolute flex flex-col items-center justify-center will-change-transform"
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${itemScale})`,
                  filter: `blur(${itemBlur}px) brightness(${itemBrightness})`,
                  opacity: itemOpacity,
                  zIndex,
                  transition: 'transform 0.15s ease-out, filter 0.15s ease-out, opacity 0.15s ease-out',
                }}
              >
                {/* -------------------------------------------------------------
                    GLASS SHOWCASE CARD
                    ------------------------------------------------------------- */}
                <div className="relative w-[290px] sm:w-[350px] md:w-[400px] flex flex-col items-center">

                  {/* Ambient Radiant Glow behind the focused centerpiece */}
                  {isFocused && (
                    <div
                      className="absolute -top-12 w-80 h-80 rounded-full pointer-events-none -z-10 animate-pulse"
                      style={{
                        background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(244,114,182,0.12) 40%, transparent 75%)',
                      }}
                    />
                  )}

                  {/* Flower Product Image Container */}
                  <div className="relative w-64 h-80 sm:w-72 sm:h-96 md:w-80 md:h-[400px] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={item.title}
                      className="max-w-full max-h-full object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.9)] transition-transform duration-500"
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      loading="eager"
                      src={item.image}
                      style={{
                        transform: isFocused ? 'scale(1.05)' : 'scale(0.96)',
                      }}
                    />

                    {/* Floor Reflection Mirror below item */}
                    <div
                      className="absolute -bottom-6 inset-x-8 h-10 pointer-events-none opacity-20 blur-sm overflow-hidden"
                      style={{
                        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, transparent 70%)',
                        transform: 'scaleY(0.4)',
                      }}
                    />
                  </div>

                  {/* Glass Pedestal Plaque (Title & Details) */}
                  <div
                    className={`mt-4 w-full px-5 py-3.5 rounded-2xl transition-all duration-300 text-center ${
                      isFocused
                        ? 'bg-black/65 backdrop-blur-2xl border border-white/25 shadow-[0_16px_45px_rgba(0,0,0,0.85)]'
                        : 'bg-black/30 backdrop-blur-md border border-white/10'
                    }`}
                    dir="rtl"
                  >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                      <span className="text-[10px] sm:text-xs font-light text-amber-200 tracking-wider">
                        {item.tag} • {item.badge}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] tracking-tight">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-white/75 text-xs sm:text-sm font-light leading-relaxed drop-shadow-sm line-clamp-1">
                      {item.subtitle}
                    </p>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
