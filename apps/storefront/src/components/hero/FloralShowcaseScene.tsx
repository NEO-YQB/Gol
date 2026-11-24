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
    subtitle: 'رزهای مخملی سرخ و اکالیپتوس در پوشش کرافت فرانسوی',
    image: '/hero/bouquet-assembled.webp',
    badge: 'انتخاب محبوب',
  },
  {
    id: 'box',
    tag: 'باکس گل مخملی',
    title: 'باکس استوانه‌ای نایت‌ولوت',
    subtitle: 'چیدمان گنبدی متراکم در جعبه مخمل با طلاکوب اختصاصی',
    image: '/hero/flower-box.webp',
    badge: 'مدرن و لوکس',
  },
  {
    id: 'basket',
    tag: 'سبد گل آرتیزان',
    title: 'سبد حصیری ارکیده و رز',
    subtitle: 'بافت دست‌ساز با ارکیده فالانوپسیس و رزهای هلویی و سرخ',
    image: '/hero/flower-basket.webp',
    badge: 'باوقار و چشم‌نواز',
  },
]

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * Math.max(0, Math.min(1, t))
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
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

  // If past this phase, unmount to save resources
  if (progress > 0.38) {
    return null
  }

  // =========================================================================
  // CAROUSEL PROGRESS CHOREOGRAPHY:
  // Showcase active between progress: 0.00 -> 0.32
  // At 0.00: Item 1 in sharp focus
  // At 0.14: Item 2 in sharp focus
  // At 0.26: Item 3 in sharp focus
  // At 0.30 -> 0.38: Entire showcase ascends upward into the stratosphere
  // =========================================================================

  const carouselT = Math.min(Math.max(progress / 0.28, 0), 1)
  const liftT = progress > 0.29 ? easeInOutCubic((progress - 0.29) / 0.08) : 0

  const containerLiftY = -liftT * 115 // in vh
  const containerOpacity = Math.max(0, 1 - liftT * 1.5)

  // Initial interaction hint (fades out as soon as user begins scrolling)
  const promptOpacity = Math.max(0, 1 - progress / 0.038)

  // Determine current active item index (for navigation pill highlight)
  const activeFraction = carouselT * (SHOWCASE_ITEMS.length - 1)
  const activeIndex = Math.min(
    Math.max(Math.round(activeFraction), 0),
    SHOWCASE_ITEMS.length - 1,
  )

  const isMobile = windowWidth < 768
  const itemSpacing = isMobile ? 310 : 440

  // Parallax subtle 3D tilt
  const tiltX = mouseRef.current.y * -5
  const tiltY = mouseRef.current.x * 7

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden transition-opacity duration-300"
      style={{
        transform: `translateY(${containerLiftY}vh)`,
        opacity: containerOpacity,
        willChange: 'transform, opacity',
      }}
    >
      {/* =========================================================================
          1. ELEGANT INTERACTION GUIDANCE (Disappears on initial scroll)
          ========================================================================= */}
      {promptOpacity > 0.01 && (
        <div
          className="absolute bottom-12 sm:bottom-16 md:bottom-20 inset-x-0 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-300 z-50 pointer-events-auto"
          style={{ opacity: promptOpacity }}
        >
          <div className="relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/60 backdrop-blur-2xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
            {isTouchDevice ? (
              <div className="w-5 h-5 flex items-center justify-center text-amber-300 animate-bounce">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 4v16m0 0l-5-5m5 5l5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              <div className="w-4 h-6 rounded-full border-2 border-amber-300/90 flex items-start justify-center p-0.5">
                <div className="w-1 h-1.5 rounded-full bg-amber-300 animate-[bounce_1.4s_infinite]" />
              </div>
            )}

            <span className="text-white text-xs sm:text-sm font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {isTouchDevice ? 'به سمت پایین بکشید تا ویترین ورق بخورد' : 'برای مرور ویترین گل‌ها، اسکرول کنید'}
            </span>
          </div>

          <p className="mt-2.5 text-white/70 text-[11px] sm:text-xs font-light tracking-wider drop-shadow-md">
            هر انتخاب، نمادی از یک حس ماندگار
          </p>
        </div>
      )}

      {/* =========================================================================
          2. MINIMAL GLASS CAROUSEL INDEX INDICATOR (Top Center)
          ========================================================================= */}
      <div className="absolute top-20 sm:top-24 inset-x-0 flex items-center justify-center pointer-events-none z-30">
        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
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
          3. 3D GLASS STAGE & INTERACTIVE CAROUSEL ITEMS
          ========================================================================= */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          perspective: '1400px',
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
            // Offset from the current virtual camera focal center
            const itemOffset = index - activeFraction

            // Coordinate & Depth interpolation
            const translateX = itemOffset * itemSpacing
            const translateZ = -Math.abs(itemOffset) * (isMobile ? 180 : 260)
            const scale = Math.max(0.68, 1 - Math.abs(itemOffset) * 0.22)
            const blur = Math.min(Math.abs(itemOffset) * 7.5, 12)
            const opacity = Math.max(0.2, 1 - Math.abs(itemOffset) * 0.55)
            const zIndex = Math.round(30 - Math.abs(itemOffset) * 10)
            const isCurrent = Math.abs(itemOffset) < 0.45

            return (
              <div
                key={item.id}
                className="absolute flex flex-col items-center justify-center transition-all duration-150 will-change-transform"
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale})`,
                  filter: `blur(${blur}px)`,
                  opacity,
                  zIndex,
                }}
              >
                {/* -------------------------------------------------------------
                    A. GLASSO-MORPHIC PEDESTAL CARD
                    ------------------------------------------------------------- */}
                <div className="relative w-[300px] sm:w-[360px] md:w-[420px] flex flex-col items-center">

                  {/* Ambient Backlight Glow behind the active item */}
                  {isCurrent && (
                    <div
                      className="absolute -top-10 w-72 h-72 rounded-full pointer-events-none -z-10 animate-pulse"
                      style={{
                        background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(244,114,182,0.12) 40%, transparent 75%)',
                      }}
                    />
                  )}

                  {/* Flower Product Image Container */}
                  <div className="relative w-64 h-80 sm:w-72 sm:h-96 md:w-80 md:h-[420px] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={item.title}
                      className="max-w-full max-h-full object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.85)] transition-transform duration-500"
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      loading="eager"
                      src={item.image}
                      style={{
                        transform: isCurrent ? 'scale(1.05)' : 'scale(0.95)',
                      }}
                    />

                    {/* Reflective Mirror Floor Below Image */}
                    <div
                      className="absolute -bottom-6 inset-x-8 h-12 pointer-events-none opacity-25 blur-sm overflow-hidden"
                      style={{
                        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, transparent 70%)',
                        transform: 'scaleY(0.4)',
                      }}
                    />
                  </div>

                  {/* Glass Pedestal Plaque with Title & Details */}
                  <div
                    className={`mt-3 w-full px-5 py-3.5 rounded-2xl transition-all duration-500 text-center ${
                      isCurrent
                        ? 'bg-black/60 backdrop-blur-2xl border border-white/25 shadow-[0_16px_45px_rgba(0,0,0,0.8)]'
                        : 'bg-black/30 backdrop-blur-md border border-white/10'
                    }`}
                    dir="rtl"
                  >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                      <span className="text-[10px] sm:text-xs font-light text-amber-200 tracking-wider">
                        {item.tag} • {item.badge}
                      </span>
                    </div>

                    {/* Product Title */}
                    <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] tracking-tight">
                      {item.title}
                    </h3>

                    {/* Subtitle / Description */}
                    <p className="mt-1 text-white/70 text-xs sm:text-sm font-light leading-relaxed drop-shadow-sm line-clamp-1">
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
