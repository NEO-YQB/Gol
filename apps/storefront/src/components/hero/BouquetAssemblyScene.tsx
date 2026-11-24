'use client'

import { useEffect, useState } from 'react'

interface BouquetAssemblySceneProps {
  progress: number
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * Math.max(0, Math.min(1, t))
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

function getStageProgress(progress: number, start: number, end: number): number {
  if (progress <= start) return 0
  if (progress >= end) return 1
  return easeInOutCubic((progress - start) / (end - start))
}

export default function BouquetAssemblyScene({ progress }: BouquetAssemblySceneProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768)
    setIsTouchDevice(isTouch)

    let rafId: number
    const animate = () => {
      setTime((prev) => (prev + 0.02) % (Math.PI * 200))
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Once the scene is finished, unmount to save memory and CPU
  if (progress > 0.38) {
    return null
  }

  // CHOREOGRAPHY PROGRESS TIMELINES:
  // 1. Idle Floating Dispersal: 0.00 -> 0.04
  // 2. Converging & Wrapping Assembly: 0.04 -> 0.16
  // 3. Fully Assembled Bouquet Transition: 0.16 -> 0.20
  // 4. Bouquet Recedes into Depth & Blurs: 0.20 -> 0.26
  // 5. Narrative Text "دسته‌گلی برای روایت احساس تو" Glides to Foreground: 0.21 -> 0.28
  // 6. Upward Ascending Flight of Bouquet & Text Fade: 0.28 -> 0.36

  const assembleT = getStageProgress(progress, 0.04, 0.16)
  const bouquetRevealT = getStageProgress(progress, 0.15, 0.19)
  const depthRecedeT = getStageProgress(progress, 0.19, 0.25)
  const textEnterT = getStageProgress(progress, 0.21, 0.25)
  const textExitT = getStageProgress(progress, 0.28, 0.33)
  const liftT = getStageProgress(progress, 0.28, 0.36)

  // Floating prompt opacity (visible at beginning, fades away on initial scroll)
  const promptOpacity = Math.max(0, 1 - progress / 0.038)

  // Text title motion (clear foreground, unobstructed, no overlap)
  const textOpacity = Math.max(0, textEnterT - textExitT)
  const textTranslateY = lerp(45, 0, easeOutQuad(textEnterT)) - textExitT * 35

  // Bouquet depth receding: shrinks slightly, drops down, blurs to create depth of field
  const bouquetBlur = lerp(0, 8, depthRecedeT)
  const bouquetScale = lerp(1, 0.84, depthRecedeT) * (1 + liftT * 0.15)
  const bouquetBrightness = lerp(1, 0.65, depthRecedeT)
  const bouquetLiftY = -liftT * 115 // ascends upward in vh

  // Individual natural items fade out as the full assembled bouquet reveals
  const individualItemsOpacity = Math.max(0, 1 - bouquetRevealT * 1.5)

  // Zero-gravity idle floating physics
  const fSin1 = Math.sin(time * 0.85) * 10
  const fCos1 = Math.cos(time * 0.75) * 8
  const fSin2 = Math.sin(time * 1.05 + 1.2) * 11
  const fCos2 = Math.cos(time * 0.95 + 0.8) * 9
  const fSin3 = Math.sin(time * 0.7 + 2.5) * 9
  const fCos3 = Math.cos(time * 0.85 + 1.9) * 8

  const idleWeight = 1 - assembleT

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden"
    >
      {/* =========================================================================
          1. INITIAL INTERACTION GUIDANCE (Pinned in lower area with high contrast)
          ========================================================================= */}
      {promptOpacity > 0.01 && (
        <div
          className="absolute bottom-12 sm:bottom-16 md:bottom-20 inset-x-0 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-300 z-50 pointer-events-auto"
          style={{ opacity: promptOpacity }}
        >
          <div className="relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/60 backdrop-blur-2xl border border-white/25 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
            {isTouchDevice ? (
              // Mobile Hand Swipe Down Indicator
              <div className="w-5 h-5 flex items-center justify-center text-amber-300 animate-bounce">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 4v16m0 0l-5-5m5 5l5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              // Desktop Mouse Scroll Wheel Indicator
              <div className="w-4 h-6 rounded-full border-2 border-amber-300/90 flex items-start justify-center p-0.5">
                <div className="w-1 h-1.5 rounded-full bg-amber-300 animate-[bounce_1.4s_infinite]" />
              </div>
            )}

            <span className="text-white text-xs sm:text-sm font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {isTouchDevice ? 'به سمت پایین بکشید تا دسته گل شکل بگیرد' : 'برای چیدمان دسته گل، اسکرول کنید'}
            </span>
          </div>

          <p className="mt-2.5 text-white/70 text-[11px] sm:text-xs font-light tracking-wider drop-shadow-md">
            هنر پیوندِ گل‌ها در انتظار حرکت شماست
          </p>
        </div>
      )}

      {/* =========================================================================
          2. NARRATIVE TEXT: "دسته‌گلی برای روایت احساس تو"
             (Appears when bouquet recedes into depth and blurs - crystal clear foreground)
          ========================================================================= */}
      {textOpacity > 0.01 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-12 z-40 transition-opacity duration-300"
          dir="rtl"
          style={{
            opacity: textOpacity,
            transform: `translateY(${textTranslateY}px)`,
          }}
        >
          <div className="max-w-2xl px-6 py-4 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.95)] leading-tight tracking-tight">
              دسته‌گلی برای روایت احساس تو
            </h2>
            <p className="mt-3.5 text-white/80 text-sm sm:text-base md:text-lg font-light tracking-wide drop-shadow-md">
              از عمیق‌ترین دلتنگی‌ها تا پرشورترین عشق‌ها
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. REAL NATURAL BOTANICAL ELEMENTS & BOUQUET STAGE
          ========================================================================= */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-all duration-300"
        style={{
          transform: `translateY(${bouquetLiftY}vh)`,
          willChange: 'transform',
        }}
      >
        <div
          className="relative w-[360px] h-[520px] sm:w-[440px] sm:h-[600px] md:w-[500px] md:h-[660px] flex items-center justify-center transition-all duration-500"
          style={{
            transform: `scale(${bouquetScale})`,
            filter: `blur(${bouquetBlur}px) brightness(${bouquetBrightness})`,
            willChange: 'transform, filter',
          }}
        >

          {/* -------------------------------------------------------------------
              A. FULL ASSEMBLED LUXURY BOUQUET (Photorealistic Centerpiece)
              ------------------------------------------------------------------- */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-500 z-20"
            style={{
              opacity: bouquetRevealT,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="دسته‌گل لوکس طبیعی گلینو"
              className="max-w-full max-h-full object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
              fetchPriority="high"
              loading="eager"
              src="/hero/bouquet-assembled.webp"
            />
          </div>

          {/* -------------------------------------------------------------------
              B. DISPERSED NATURAL BOTANICAL PIECES (Active during 0.00 -> 0.16)
              ------------------------------------------------------------------- */}
          {individualItemsOpacity > 0.01 && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none"
              style={{ opacity: individualItemsOpacity }}
            >

              {/* 1. Natural Silver Dollar Eucalyptus - Left Wing */}
              <div
                className="absolute transition-transform will-change-transform z-10"
                style={{
                  transform: `translate(${lerp(-220, -50, assembleT) + fSin1 * idleWeight}px, ${
                    lerp(-120, -80, assembleT) + fCos1 * idleWeight
                  }px) rotate(${lerp(-40, -18, assembleT)}deg) scale(${lerp(0.82, 0.95, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="شاخه اکالیپتوس طبیعی"
                  className="w-36 h-56 sm:w-44 sm:h-64 object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                  src="/hero/eucalyptus.webp"
                />
              </div>

              {/* 2. Natural Silver Dollar Eucalyptus - Right Wing */}
              <div
                className="absolute transition-transform will-change-transform z-10"
                style={{
                  transform: `translate(${lerp(220, 55, assembleT) + fSin2 * idleWeight}px, ${
                    lerp(-130, -85, assembleT) + fCos2 * idleWeight
                  }px) rotate(${lerp(42, 20, assembleT)}deg) scale(${lerp(0.82, 0.95, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="شاخه اکالیپتوس طبیعی"
                  className="w-36 h-56 sm:w-44 sm:h-64 object-contain scale-x-[-1] drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                  src="/hero/eucalyptus.webp"
                />
              </div>

              {/* 3. Natural Gypsophila / Baby's Breath - Top Cloud */}
              <div
                className="absolute transition-transform will-change-transform z-15"
                style={{
                  transform: `translate(${lerp(30, 0, assembleT) + fSin3 * idleWeight}px, ${
                    lerp(-240, -110, assembleT) + fCos3 * idleWeight
                  }px) rotate(${lerp(15, 0, assembleT)}deg) scale(${lerp(0.85, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="گل ژیپسوفیلا طبیعی"
                  className="w-40 h-52 sm:w-48 sm:h-60 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                  src="/hero/gypsophila.webp"
                />
              </div>

              {/* 4. Natural Soft Pink Garden Rose - Left Flank */}
              <div
                className="absolute transition-transform will-change-transform z-20"
                style={{
                  transform: `translate(${lerp(-160, -45, assembleT) + fCos2 * idleWeight}px, ${
                    lerp(-40, -40, assembleT) + fSin2 * idleWeight
                  }px) rotate(${lerp(-30, -12, assembleT)}deg) scale(${lerp(0.85, 0.98, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="گل رز صورتی طبیعی"
                  className="w-36 h-64 sm:w-44 sm:h-72 object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.65)]"
                  src="/hero/rose-pink.webp"
                />
              </div>

              {/* 5. Natural Royal Red Velvet Rose - Center Queen */}
              <div
                className="absolute transition-transform will-change-transform z-25"
                style={{
                  transform: `translate(${lerp(150, 0, assembleT) + fSin1 * idleWeight}px, ${
                    lerp(-70, -50, assembleT) + fCos1 * idleWeight
                  }px) rotate(${lerp(25, 0, assembleT)}deg) scale(${lerp(0.88, 1.05, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="شاخه گل رز سرخ طبیعی"
                  className="w-36 h-64 sm:w-44 sm:h-72 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)]"
                  src="/hero/rose-red.webp"
                />
              </div>

              {/* 6. Luxury Craft Wrapping Paper Sleeve (Folds Inward) */}
              <div
                className="absolute transition-transform will-change-transform z-30"
                style={{
                  transform: `translate(${lerp(-100, 0, assembleT) + fCos3 * idleWeight}px, ${
                    lerp(120, 80, assembleT) + fSin3 * idleWeight
                  }px) rotate(${lerp(-14, 0, assembleT)}deg) scale(${lerp(0.8, 1, assembleT)})`,
                }}
              >
                <NaturalCraftPaperFold foldProgress={assembleT} />
              </div>

              {/* 7. Champagne Silk Satin Ribbon & Bow */}
              <div
                className="absolute transition-transform will-change-transform z-35"
                style={{
                  transform: `translate(${lerp(140, 0, assembleT) + fSin1 * idleWeight}px, ${
                    lerp(130, 95, assembleT) + fCos1 * idleWeight
                  }px) rotate(${lerp(24, 0, assembleT)}deg) scale(${lerp(0.75, 1, assembleT)})`,
                }}
              >
                <NaturalSatinRibbon tieProgress={assembleT} />
              </div>

            </div>
          )}

          {/* -------------------------------------------------------------------
              C. AMBIENT BACKLIGHT AURA
              ------------------------------------------------------------------- */}
          <div
            className="absolute w-80 h-80 rounded-full pointer-events-none -z-10 transition-opacity duration-700"
            style={{
              background: 'radial-gradient(circle, rgba(244,114,182,0.25) 0%, rgba(251,191,36,0.12) 50%, transparent 75%)',
              opacity: lerp(0.2, 0.85, assembleT),
              transform: `scale(${lerp(0.8, 1.4, assembleT)})`,
            }}
          />

        </div>
      </div>
    </div>
  )
}

/**
 * Natural Textured Craft Paper Folding Graphic
 */
function NaturalCraftPaperFold({ foldProgress }: { foldProgress: number }) {
  const foldSpread = lerp(45, 0, foldProgress)
  const leftWing = lerp(-40, 0, foldProgress)
  const rightWing = lerp(40, 0, foldProgress)

  return (
    <svg className="w-64 h-64 sm:w-72 sm:h-72 drop-shadow-[0_18px_45px_rgba(0,0,0,0.8)]" fill="none" viewBox="0 0 280 280">
      <defs>
        <linearGradient id="naturalCraft1" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#d8b997" />
          <stop offset="50%" stopColor="#a9845d" />
          <stop offset="100%" stopColor="#6e4f30" />
        </linearGradient>
        <linearGradient id="naturalCraft2" x1="100%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#e2cbb2" />
          <stop offset="60%" stopColor="#9b7752" />
          <stop offset="100%" stopColor="#583d23" />
        </linearGradient>
      </defs>

      {/* Back cone */}
      <path
        d={`M ${140 - foldSpread} 270 L ${35 - foldSpread * 0.8} 80 L 140 10 L ${245 + foldSpread * 0.8} 80 L ${140 + foldSpread} 270 Z`}
        fill="url(#naturalCraft1)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.2"
      />

      {/* Left Front Wing (Folds across center) */}
      <path
        d={`M 140 260 L ${40 + leftWing} 70 L ${145 + leftWing * 0.4} 105 L 140 260 Z`}
        fill="url(#naturalCraft2)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />

      {/* Right Front Wing (Wraps over left) */}
      <path
        d={`M 140 260 L ${240 + rightWing} 70 L ${130 + rightWing * 0.3} 110 L 140 260 Z`}
        fill="url(#naturalCraft1)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.2"
      />
    </svg>
  )
}

/**
 * Natural Satin Silk Ribbon with Tied Bow
 */
function NaturalSatinRibbon({ tieProgress }: { tieProgress: number }) {
  const bowScale = getStageProgress(tieProgress, 0.4, 1.0)

  return (
    <svg className="w-40 h-44 sm:w-44 sm:h-48 drop-shadow-[0_12px_28px_rgba(0,0,0,0.7)]" fill="none" viewBox="0 0 160 180">
      <defs>
        <linearGradient id="silkChampagne" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
      </defs>

      {/* Belt wrap */}
      <path
        d="M 38 46 C 68 56, 92 56, 122 46 C 118 56, 115 62, 112 66 C 90 72, 70 72, 48 66 Z"
        fill="url(#silkChampagne)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.8"
      />

      {/* Tied Bow */}
      <g
        style={{
          transform: `scale(${bowScale})`,
          transformOrigin: '80px 56px',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Left Loop */}
        <path
          d="M 80 56 C 50 18, 22 38, 42 66 C 56 74, 72 63, 80 56 Z"
          fill="url(#silkChampagne)"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
        />
        {/* Right Loop */}
        <path
          d="M 80 56 C 110 18, 138 38, 118 66 C 104 74, 88 63, 80 56 Z"
          fill="url(#silkChampagne)"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
        />
        {/* Knot */}
        <ellipse cx="80" cy="56" fill="#d97706" rx="8" ry="6.5" stroke="#fef08a" strokeWidth="1" />
        {/* Tails */}
        <path d="M 76 61 C 65 92, 45 125, 40 155 C 48 147, 58 151, 68 145 C 72 120, 78 90, 80 62 Z" fill="url(#silkChampagne)" />
        <path d="M 84 61 C 95 92, 115 125, 120 155 C 112 147, 102 151, 92 145 C 88 120, 82 90, 80 62 Z" fill="url(#silkChampagne)" />
      </g>
    </svg>
  )
}
