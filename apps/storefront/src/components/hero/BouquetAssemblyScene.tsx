'use client'

import { useEffect, useMemo, useState } from 'react'

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

function easeInQuad(t: number): number {
  return t * t
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

  // Stardust stars configured once
  const stardustStars = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      baseAngle: (i / 18) * Math.PI * 2,
      rx: 160 + (i % 3) * 35,
      ry: 210 + (i % 4) * 25,
      speed: 1.2 + (i % 2) * 0.4,
      size: 14 + (i % 5) * 5,
      delay: i * 0.35,
    }))
  }, [])

  // If progress is beyond this scene, unmount to save GPU/CPU
  if (progress > 0.38) {
    return null
  }

  // =========================================================================
  // CHOREOGRAPHY PROGRESS TIMELINE:
  // 1. Idle Floating Dispersal: 0.00 -> 0.04
  // 2. Converging Assembly: 0.04 -> 0.16
  // 3. 3D Twist & Magical Stardust Vortex: 0.06 -> 0.18
  // 4. Radiant Light Burst & Full Bouquet Fusion: 0.16 -> 0.20
  // 5. Bouquet Recedes to Depth & Blurs: 0.20 -> 0.26
  // 6. Narrative Title "دسته‌گلی برای روایت احساس تو" Glides to Foreground: 0.21 -> 0.28
  // 7. Ascending Upward Flight of Bouquet: 0.28 -> 0.36
  // =========================================================================

  const assembleT = getStageProgress(progress, 0.04, 0.16)
  const fusionT = getStageProgress(progress, 0.15, 0.185)
  const depthRecedeT = getStageProgress(progress, 0.19, 0.25)
  const textEnterT = getStageProgress(progress, 0.21, 0.25)
  const textExitT = getStageProgress(progress, 0.28, 0.33)
  const liftT = getStageProgress(progress, 0.28, 0.36)

  // Floating prompt opacity (fades as user begins scrolling)
  const promptOpacity = Math.max(0, 1 - progress / 0.038)

  // Narrative title motion (unobstructed foreground)
  const textOpacity = Math.max(0, textEnterT - textExitT)
  const textTranslateY = lerp(45, 0, easeOutQuad(textEnterT)) - textExitT * 35

  // Bouquet depth receding: shrinks, lowers, and blurs for photographic depth of field
  const bouquetBlur = lerp(0, 8.5, depthRecedeT)
  const bouquetScale = lerp(1, 0.84, depthRecedeT) * (1 + liftT * 0.14)
  const bouquetBrightness = lerp(1, 0.65, depthRecedeT)
  const bouquetLiftY = -liftT * 115

  // 3D rotation twist at moment of transformation (0.13 -> 0.19)
  const twistProgress = getStageProgress(progress, 0.12, 0.185)
  const twistRotateY = Math.sin(twistProgress * Math.PI) * -18 // 3D yaw swing
  const twistTilt = Math.sin(twistProgress * Math.PI) * 4

  // Radiant Light Bloom Burst (peaks at progress ~0.175)
  const burstProgress = getStageProgress(progress, 0.155, 0.19)
  const burstOpacity = Math.sin(burstProgress * Math.PI)
  const burstScale = lerp(0.4, 2.4, easeOutQuad(burstProgress))

  // Stardust vortex intensity (swirls during convergence 0.06 to 0.19)
  const stardustActivity = Math.sin(getStageProgress(progress, 0.05, 0.19) * Math.PI)

  // Dispersed pieces fade out seamlessly as the unified bouquet locks in
  const individualItemsOpacity = Math.max(0, 1 - fusionT * 1.5)

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
          1. INITIAL INTERACTION GUIDANCE (High contrast, clearly separated)
          ========================================================================= */}
      {promptOpacity > 0.01 && (
        <div
          className="absolute bottom-12 sm:bottom-16 md:bottom-20 inset-x-0 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-300 z-50 pointer-events-auto"
          style={{ opacity: promptOpacity }}
        >
          <div className="relative inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/65 backdrop-blur-2xl border border-white/25 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
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
            اجزای دسته‌گل با حرکت شما به هم می‌پیوندند
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
          <div className="max-w-2xl px-8 py-5 rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.85)]">
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
          perspective: '1200px',
          willChange: 'transform',
        }}
      >
        <div
          className="relative w-[360px] h-[520px] sm:w-[440px] sm:h-[600px] md:w-[500px] md:h-[660px] flex items-center justify-center transition-all duration-500"
          style={{
            transform: `scale(${bouquetScale}) rotateY(${twistRotateY}deg) rotateZ(${twistTilt}deg)`,
            filter: `blur(${bouquetBlur}px) brightness(${bouquetBrightness})`,
            willChange: 'transform, filter',
          }}
        >

          {/* -------------------------------------------------------------------
              A. FULL ASSEMBLED LUXURY BOUQUET (Unified Final Masterpiece)
              ------------------------------------------------------------------- */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-500 z-20"
            style={{
              opacity: fusionT,
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
              B. RADIANT LIGHT BURST BLOOM (Moment of Transformation at ~0.17)
              ------------------------------------------------------------------- */}
          {burstOpacity > 0.01 && (
            <div
              className="absolute pointer-events-none z-30 transition-transform duration-100 flex items-center justify-center"
              style={{
                opacity: burstOpacity,
                transform: `scale(${burstScale})`,
              }}
            >
              {/* Outer Golden Flash Glow */}
              <div
                className="w-80 h-80 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(254,240,138,0.95) 0%, rgba(244,114,182,0.6) 35%, rgba(251,191,36,0.2) 65%, transparent 85%)',
                }}
              />
              {/* Inner Radiant Starburst Rays */}
              <svg className="absolute w-64 h-64 animate-[spin_4s_linear_infinite]" fill="none" viewBox="0 0 100 100">
                <path d="M 50 0 L 52 48 L 100 50 L 52 52 L 50 100 L 48 52 L 0 50 L 48 48 Z" fill="#ffffff" />
                <path d="M 15 15 L 49 49 L 85 85 L 51 51 Z" stroke="rgba(254,240,138,0.7)" strokeWidth="1.5" />
                <path d="M 85 15 L 51 49 L 15 85 L 49 51 Z" stroke="rgba(254,240,138,0.7)" strokeWidth="1.5" />
              </svg>
            </div>
          )}

          {/* -------------------------------------------------------------------
              C. MAGICAL STARDUST SPIRAL (گردش جادویی ستاره‌ای دور دسته گل)
              ------------------------------------------------------------------- */}
          {stardustActivity > 0.05 && (
            <div
              className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center transition-opacity duration-200"
              style={{ opacity: stardustActivity }}
            >
              {stardustStars.map((star) => {
                // Orbital parametric angle
                const currentAngle = star.baseAngle + time * star.speed + assembleT * Math.PI * 4
                const starX = Math.cos(currentAngle) * star.rx
                const starY = Math.sin(currentAngle) * star.ry * 0.75 - lerp(40, 0, assembleT)
                const starZ = Math.sin(currentAngle) // Depth layering (scale & brightness)
                const starScale = lerp(0.6, 1.25, (starZ + 1) / 2)
                const starOpacity = lerp(0.3, 1, (starZ + 1) / 2)

                return (
                  <div
                    key={star.id}
                    className="absolute transition-transform will-change-transform flex items-center justify-center"
                    style={{
                      transform: `translate(${starX}px, ${starY}px) scale(${starScale})`,
                      opacity: starOpacity,
                    }}
                  >
                    <svg
                      className="drop-shadow-[0_0_10px_rgba(254,240,138,0.95)] animate-pulse"
                      fill="none"
                      height={star.size}
                      viewBox="0 0 24 24"
                      width={star.size}
                    >
                      <path
                        d="M 12 0 L 14.5 9.5 L 24 12 L 14.5 14.5 L 12 24 L 9.5 14.5 L 0 12 L 9.5 9.5 Z"
                        fill="url(#starGoldGrad)"
                      />
                    </svg>
                  </div>
                )
              })}

              <svg className="hidden">
                <defs>
                  <linearGradient id="starGoldGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="40%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* -------------------------------------------------------------------
              D. EXACT CONSTITUENT PARTS OF THIS BOUQUET (0.00 -> 0.16)
              Extracted directly from bouquet-assembled.webp
              ------------------------------------------------------------------- */}
          {individualItemsOpacity > 0.01 && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none"
              style={{ opacity: individualItemsOpacity }}
            >

              {/* 1. Exact Eucalyptus Branch - Left Wing */}
              <div
                className="absolute transition-transform will-change-transform z-10"
                style={{
                  transform: `translate(${lerp(-220, -115, assembleT) + fSin1 * idleWeight}px, ${
                    lerp(-130, -55, assembleT) + fCos1 * idleWeight
                  }px) rotate(${lerp(-36, 0, assembleT)}deg) scale(${lerp(0.85, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="شاخه اکالیپتوس دسته گل"
                  className="w-40 sm:w-48 object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.65)]"
                  src="/hero/part-eucalyptus-left.webp"
                />
              </div>

              {/* 2. Exact Eucalyptus Branch - Right Wing */}
              <div
                className="absolute transition-transform will-change-transform z-10"
                style={{
                  transform: `translate(${lerp(220, 115, assembleT) + fSin2 * idleWeight}px, ${
                    lerp(-140, -55, assembleT) + fCos2 * idleWeight
                  }px) rotate(${lerp(38, 0, assembleT)}deg) scale(${lerp(0.85, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="شاخه اکالیپتوس راست دسته گل"
                  className="w-44 sm:w-52 object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.65)]"
                  src="/hero/part-eucalyptus-right.webp"
                />
              </div>

              {/* 3. Exact Gypsophila Sprig - Top Crown */}
              <div
                className="absolute transition-transform will-change-transform z-15"
                style={{
                  transform: `translate(${lerp(30, 0, assembleT) + fSin3 * idleWeight}px, ${
                    lerp(-250, -125, assembleT) + fCos3 * idleWeight
                  }px) rotate(${lerp(14, 0, assembleT)}deg) scale(${lerp(0.85, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="گل ژیپسوفیلا تاج دسته گل"
                  className="w-52 sm:w-60 object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.55)]"
                  src="/hero/part-gypsophila.webp"
                />
              </div>

              {/* 4. Exact Soft Pink Rose - Upper Center Flank */}
              <div
                className="absolute transition-transform will-change-transform z-20"
                style={{
                  transform: `translate(${lerp(-160, -5, assembleT) + fCos2 * idleWeight}px, ${
                    lerp(-50, -65, assembleT) + fSin2 * idleWeight
                  }px) rotate(${lerp(-28, 0, assembleT)}deg) scale(${lerp(0.85, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="رز صورتی طبیعی دسته گل"
                  className="w-40 sm:w-48 object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.7)]"
                  src="/hero/part-rose-pink.webp"
                />
              </div>

              {/* 5. Exact Deep Velvet Red Rose - Queen Center Bloom */}
              <div
                className="absolute transition-transform will-change-transform z-25"
                style={{
                  transform: `translate(${lerp(150, -35, assembleT) + fSin1 * idleWeight}px, ${
                    lerp(-60, -5, assembleT) + fCos1 * idleWeight
                  }px) rotate(${lerp(24, 0, assembleT)}deg) scale(${lerp(0.88, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="رز سرخ مخملی دسته گل"
                  className="w-40 sm:w-48 object-contain drop-shadow-[0_20px_42px_rgba(0,0,0,0.75)]"
                  src="/hero/part-rose-red.webp"
                />
              </div>

              {/* 6. Exact Craft Paper Cone Wrap - Lower Body */}
              <div
                className="absolute transition-transform will-change-transform z-12"
                style={{
                  transform: `translate(${lerp(-120, 0, assembleT) + fCos3 * idleWeight}px, ${
                    lerp(140, 140, assembleT) + fSin3 * idleWeight
                  }px) rotate(${lerp(-16, 0, assembleT)}deg) scale(${lerp(0.8, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="کاغذ کادو کرافت دسته گل"
                  className="w-56 sm:w-64 object-contain drop-shadow-[0_22px_48px_rgba(0,0,0,0.8)]"
                  src="/hero/part-wrap.webp"
                />
              </div>

              {/* 7. Exact Champagne Satin Ribbon & Tied Bow */}
              <div
                className="absolute transition-transform will-change-transform z-30"
                style={{
                  transform: `translate(${lerp(160, 0, assembleT) + fSin1 * idleWeight}px, ${
                    lerp(130, 50, assembleT) + fCos1 * idleWeight
                  }px) rotate(${lerp(26, 0, assembleT)}deg) scale(${lerp(0.75, 1, assembleT)})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="روبان ساتن پاپیون دسته گل"
                  className="w-48 sm:w-56 object-contain drop-shadow-[0_16px_36px_rgba(0,0,0,0.75)]"
                  src="/hero/part-ribbon.webp"
                />
              </div>

            </div>
          )}

          {/* -------------------------------------------------------------------
              E. AMBIENT BACKLIGHT AURA
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
