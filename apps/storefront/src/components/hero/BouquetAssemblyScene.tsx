'use client'

import { useEffect, useState } from 'react'

interface BouquetAssemblySceneProps {
  progress: number
}

/**
 * Linear interpolation helper
 */
function lerp(start: number, end: number, t: number) {
  return start + (end - start) * Math.max(0, Math.min(1, t))
}

/**
 * Smooth cubic ease-in-out
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Calculate progress fraction inside a specific stage window
 */
function getStageProgress(progress: number, start: number, end: number): number {
  if (progress <= start) return 0
  if (progress >= end) return 1
  return easeInOutCubic((progress - start) / (end - start))
}

export default function BouquetAssemblyScene({ progress }: BouquetAssemblySceneProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [time, setTime] = useState(0)

  // Detect touch device for dynamic gesture guidance (desktop scroll vs mobile swipe)
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

  // If progress is beyond the assembly sequence, unmount from render tree for maximum performance
  if (progress > 0.36) {
    return null
  }

  // STAGES OF THE BOUQUET CHOREOGRAPHY:
  // 1. Idle Floating Dispersal: 0.00 -> 0.03
  // 2. Converging & Wrapping Assembly: 0.03 -> 0.18
  // 3. Fully Assembled Masterpiece Showcase: 0.18 -> 0.24
  // 4. Graceful Ascending Lift into the Stratosphere: 0.24 -> 0.34
  const assembleT = getStageProgress(progress, 0.03, 0.18)
  const liftT = getStageProgress(progress, 0.24, 0.34)

  // Entire bouquet container lifts upward and dissolves into glowing light as it ascends
  const containerLiftY = -liftT * 110 // in vh
  const containerLiftScale = 1 + liftT * 0.12
  const containerOpacity = Math.max(0, 1 - Math.pow(liftT, 1.8))

  // Floating prompt opacity (disappears as soon as the user starts interacting)
  const promptOpacity = Math.max(0, 1 - progress / 0.035)

  // Assembly completion badge opacity & scale
  const badgeProgress = getStageProgress(progress, 0.17, 0.23)
  const badgeExit = getStageProgress(progress, 0.24, 0.30)
  const badgeOpacity = (badgeProgress - badgeExit)

  // Floating idle sine wave calculations for zero-gravity drifting
  const fSin1 = Math.sin(time * 0.9) * 8
  const fCos1 = Math.cos(time * 0.8) * 6
  const fSin2 = Math.sin(time * 1.1 + 1.2) * 9
  const fCos2 = Math.cos(time * 1.0 + 0.8) * 7
  const fSin3 = Math.sin(time * 0.7 + 2.5) * 8
  const fCos3 = Math.cos(time * 0.9 + 1.9) * 6

  // Idle floating offsets decrease to 0 as assembly reaches completion
  const idleWeight = 1 - assembleT

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-15 pointer-events-none select-none overflow-hidden"
      style={{
        transform: `translateY(${containerLiftY}vh) scale(${containerLiftScale})`,
        opacity: containerOpacity,
        willChange: 'transform, opacity',
      }}
    >
      {/* =========================================================================
          1. INTERACTIVE GUIDANCE PROMPT (Scroll / Swipe gesture indicator)
          ========================================================================= */}
      {promptOpacity > 0.01 && (
        <div
          className="absolute bottom-16 md:bottom-20 inset-x-0 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-300"
          style={{ opacity: promptOpacity }}
        >
          <div className="relative inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {isTouchDevice ? (
              // Mobile Hand Swipe Down Icon
              <div className="w-5 h-5 flex items-center justify-center text-amber-200 animate-bounce">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4v16m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              // Desktop Mouse Scroll Wheel Icon
              <div className="w-4 h-6 rounded-full border-2 border-amber-200/80 flex items-start justify-center p-0.5">
                <div className="w-1 h-1.5 rounded-full bg-amber-200 animate-[bounce_1.5s_infinite]" />
              </div>
            )}

            <span className="text-white text-xs sm:text-sm font-medium tracking-wide drop-shadow-md">
              {isTouchDevice ? 'به سمت پایین بکشید تا دسته گل شکل بگیرد' : 'برای چیدمان دسته گل، اسکرول کنید'}
            </span>
          </div>

          <p className="mt-3 text-white/50 text-[11px] sm:text-xs font-light tracking-widest">
            هنر پیوندِ گل‌ها در انتظار حرکت شماست
          </p>
        </div>
      )}

      {/* =========================================================================
          2. COMPLETION BADGE & TITLE (Glows when assembly is complete at 0.18-0.24)
          ========================================================================= */}
      {badgeOpacity > 0.01 && (
        <div
          className="absolute top-[18%] md:top-[16%] inset-x-0 text-center px-4 transition-all duration-300"
          style={{
            opacity: badgeOpacity,
            transform: `translateY(${lerp(20, 0, badgeProgress)}px)`,
          }}
        >
          <span className="inline-block px-4 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs md:text-sm font-light tracking-widest backdrop-blur-md mb-2 shadow-[0_0_20px_rgba(251,191,36,0.25)]">
            پیوندِ کامل شد
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
            دسته‌گلی برای روایت احساس تو
          </h2>
        </div>
      )}

      {/* =========================================================================
          3. BOUQUET COMPOSITION STAGE (Centered Floral Coordinate Canvas)
          ========================================================================= */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative w-[340px] h-[480px] sm:w-[420px] h-[540px] md:w-[480px] md:h-[600px] flex items-center justify-center">

          {/* -------------------------------------------------------------------
              A. BACK LAYER: EUCALYPTUS BRANCH 1 (Left Wing)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform"
            style={{
              transform: `translate(${lerp(-180, -45, assembleT) + fSin1 * idleWeight}px, ${
                lerp(-80, -70, assembleT) + fCos1 * idleWeight
              }px) rotate(${lerp(-45, -22, assembleT)}deg) scale(${lerp(0.85, 1, assembleT)})`,
              transformOrigin: 'bottom right',
            }}
          >
            <EucalyptusBranch side="left" />
          </div>

          {/* -------------------------------------------------------------------
              B. BACK LAYER: EUCALYPTUS BRANCH 2 (Right Wing)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform"
            style={{
              transform: `translate(${lerp(180, 50, assembleT) + fSin2 * idleWeight}px, ${
                lerp(-90, -75, assembleT) + fCos2 * idleWeight
              }px) rotate(${lerp(50, 24, assembleT)}deg) scale(${lerp(0.85, 1, assembleT)})`,
              transformOrigin: 'bottom left',
            }}
          >
            <EucalyptusBranch side="right" />
          </div>

          {/* -------------------------------------------------------------------
              C. BACK LAYER: GYPSOPHILA / BABY'S BREATH (Airy Stardust Sprigs)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform"
            style={{
              transform: `translate(${lerp(-90, -15, assembleT) + fSin3 * idleWeight}px, ${
                lerp(-190, -110, assembleT) + fCos3 * idleWeight
              }px) rotate(${lerp(-20, -5, assembleT)}deg) scale(${lerp(0.9, 1.05, assembleT)})`,
            }}
          >
            <GypsophilaSprig />
          </div>

          {/* -------------------------------------------------------------------
              D. WRAPPING PAPER - BACK FOLD & ENVELOPE (کاغذ کادو کرافت و مرواریدی)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform"
            style={{
              transform: `translate(${lerp(-130, 0, assembleT) + fCos1 * idleWeight}px, ${
                lerp(120, 80, assembleT) + fSin1 * idleWeight
              }px) rotate(${lerp(-16, 0, assembleT)}deg) scale(${lerp(0.8, 1, assembleT)})`,
            }}
          >
            <WrappingPaperBack foldProgress={assembleT} />
          </div>

          {/* -------------------------------------------------------------------
              E. MID LAYER: ROSE 2 (Blush Peach/Pink Garden Rose - Left Flank)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform"
            style={{
              transform: `translate(${lerp(-140, -42, assembleT) + fCos2 * idleWeight}px, ${
                lerp(-40, -45, assembleT) + fSin2 * idleWeight
              }px) rotate(${lerp(-32, -14, assembleT)}deg) scale(${lerp(0.82, 0.95, assembleT)})`,
            }}
          >
            <RoseStem variant="pink" />
          </div>

          {/* -------------------------------------------------------------------
              F. MID LAYER: ROSE 3 (Crimson Blossom - Right Flank)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform"
            style={{
              transform: `translate(${lerp(140, 42, assembleT) + fCos3 * idleWeight}px, ${
                lerp(-30, -35, assembleT) + fSin3 * idleWeight
              }px) rotate(${lerp(35, 16, assembleT)}deg) scale(${lerp(0.85, 0.92, assembleT)})`,
            }}
          >
            <RoseStem variant="crimson" />
          </div>

          {/* -------------------------------------------------------------------
              G. CROWN LAYER: ROSE 1 (Royal Velvet Red Rose - Queen Center)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform z-10"
            style={{
              transform: `translate(${lerp(20, 0, assembleT) + fSin1 * idleWeight}px, ${
                lerp(-160, -75, assembleT) + fCos1 * idleWeight
              }px) rotate(${lerp(12, 0, assembleT)}deg) scale(${lerp(0.88, 1.08, assembleT)})`,
            }}
          >
            <RoseStem variant="red" />
          </div>

          {/* -------------------------------------------------------------------
              H. WRAPPING PAPER - FRONT WINGS & TIGHT SLEEVE (پیچیده شدن کاغذ کادو)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform z-20"
            style={{
              transform: `translate(0px, ${lerp(100, 75, assembleT)}px) scale(${lerp(0.85, 1, assembleT)})`,
            }}
          >
            <WrappingPaperFront foldProgress={assembleT} />
          </div>

          {/* -------------------------------------------------------------------
              I. SATIN SILK RIBBON & BOW (روبان و پاپیون ساتن ابریشمی دور دسته گل)
              ------------------------------------------------------------------- */}
          <div
            className="absolute transition-transform will-change-transform z-30"
            style={{
              transform: `translate(${lerp(150, 0, assembleT) + fCos2 * idleWeight}px, ${
                lerp(110, 85, assembleT) + fSin2 * idleWeight
              }px) rotate(${lerp(28, 0, assembleT)}deg) scale(${lerp(0.75, 1, assembleT)})`,
            }}
          >
            <SatinRibbon tieProgress={assembleT} />
          </div>

          {/* -------------------------------------------------------------------
              J. SOFT LUMINOUS AURA (Backlight behind the bouquet)
              ------------------------------------------------------------------- */}
          <div
            className="absolute w-72 h-72 rounded-full pointer-events-none -z-10 transition-opacity duration-700"
            style={{
              background: 'radial-gradient(circle, rgba(244,114,182,0.22) 0%, rgba(251,191,36,0.12) 50%, transparent 75%)',
              opacity: lerp(0.2, 0.85, assembleT),
              transform: `scale(${lerp(0.7, 1.3, assembleT)})`,
            }}
          />

        </div>
      </div>
    </div>
  )
}

/**
 * High-Fidelity SVG: Rose with layered velvet petals, green stem and leaves
 */
function RoseStem({ variant = 'red' }: { variant?: 'red' | 'pink' | 'crimson' }) {
  const isPink = variant === 'pink'
  const isCrimson = variant === 'crimson'

  const petalGrad1 = isPink ? '#f472b6' : isCrimson ? '#b91c1c' : '#dc2626'
  const petalGrad2 = isPink ? '#db2777' : isCrimson ? '#881337' : '#991b1b'
  const petalGrad3 = isPink ? '#fbcfe8' : isCrimson ? '#f87171' : '#f87171'

  return (
    <svg
      className="w-28 h-64 sm:w-32 sm:h-72 drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]"
      fill="none"
      viewBox="0 0 120 280"
    >
      <defs>
        <linearGradient id={`rosePetalGrad-${variant}`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={petalGrad3} />
          <stop offset="45%" stopColor={petalGrad1} />
          <stop offset="100%" stopColor={petalGrad2} />
        </linearGradient>

        <linearGradient id={`roseShadowGrad-${variant}`} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor={petalGrad2} stopOpacity="0.3" />
          <stop offset="100%" stopColor="#450a0a" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id={`stemGrad-${variant}`} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#1e3a2b" />
          <stop offset="50%" stopColor="#3d6b52" />
          <stop offset="100%" stopColor="#16291e" />
        </linearGradient>

        <linearGradient id={`leafGrad-${variant}`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#4e8265" />
          <stop offset="100%" stopColor="#1c3d2a" />
        </linearGradient>
      </defs>

      {/* Stem */}
      <path
        d="M 60 70 Q 58 160, 62 270"
        stroke={`url(#stemGrad-${variant})`}
        strokeLinecap="round"
        strokeWidth="5"
      />

      {/* Stem Thorns */}
      <path d="M 59 130 Q 52 134, 50 140 Q 56 138, 59 136 Z" fill="#2d523e" />
      <path d="M 61 180 Q 68 184, 70 190 Q 64 188, 61 186 Z" fill="#2d523e" />

      {/* Stem Leaves */}
      <g>
        <path
          d="M 59 110 C 40 100, 20 115, 15 130 C 25 135, 45 130, 59 118 Z"
          fill={`url(#leafGrad-${variant})`}
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
        />
        <path d="M 59 110 Q 35 120, 18 128" stroke="#7bb091" strokeWidth="1" />
      </g>
      <g>
        <path
          d="M 61 150 C 80 140, 100 155, 105 170 C 95 175, 75 170, 61 158 Z"
          fill={`url(#leafGrad-${variant})`}
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
        />
        <path d="M 61 150 Q 85 160, 102 168" stroke="#7bb091" strokeWidth="1" />
      </g>

      {/* Calyx (Sepals beneath the bloom) */}
      <path d="M 45 74 C 40 85, 32 95, 25 102 C 34 94, 46 84, 52 75 Z" fill="#29513b" />
      <path d="M 75 74 C 80 85, 88 95, 95 102 C 86 94, 74 84, 68 75 Z" fill="#29513b" />
      <path d="M 58 75 C 60 90, 62 100, 60 110 C 64 98, 64 88, 62 75 Z" fill="#36644a" />

      {/* Multi-layered Velvet Rose Petals */}
      <g filter="drop-shadow(0 8px 16px rgba(0,0,0,0.45))">
        {/* Outer Petals */}
        <path
          d="M 60 25 C 20 25, 10 65, 35 80 C 50 90, 70 90, 85 80 C 110 65, 100 25, 60 25 Z"
          fill={`url(#rosePetalGrad-${variant})`}
        />
        <path
          d="M 28 45 C 15 60, 30 82, 55 84 C 38 80, 24 66, 28 45 Z"
          fill={`url(#roseShadowGrad-${variant})`}
        />
        <path
          d="M 92 45 C 105 60, 90 82, 65 84 C 82 80, 96 66, 92 45 Z"
          fill={`url(#roseShadowGrad-${variant})`}
        />

        {/* Mid-Cup Petals */}
        <path
          d="M 60 32 C 35 32, 28 62, 48 74 C 60 80, 72 78, 80 68 C 92 52, 85 32, 60 32 Z"
          fill={`url(#rosePetalGrad-${variant})`}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="0.8"
        />

        {/* Inner Heart & Spiral Swirl */}
        <path
          d="M 52 42 C 45 48, 50 62, 60 62 C 70 62, 75 48, 68 42 C 60 36, 55 38, 52 42 Z"
          fill={`url(#rosePetalGrad-${variant})`}
        />
        <path
          d="M 56 46 Q 60 42, 64 46 Q 66 52, 60 55 Q 54 52, 56 46 Z"
          fill={petalGrad2}
        />
        <path
          d="M 58 48 Q 60 46, 62 48 Q 63 50, 60 52 Q 57 50, 58 48 Z"
          fill="#450a0a"
        />

        {/* Petal Edge Curvature Highlights */}
        <path
          d="M 38 40 C 48 30, 72 30, 82 40"
          stroke="rgba(255,255,255,0.4)"
          strokeLinecap="round"
          strokeWidth="1.2"
        />
        <path
          d="M 30 65 Q 45 78, 60 78 Q 75 78, 90 65"
          stroke="rgba(255,255,255,0.25)"
          strokeLinecap="round"
          strokeWidth="1"
        />
      </g>
    </svg>
  )
}

/**
 * Botanical Eucalyptus Sprig with silvery-green rounded leaves
 */
function EucalyptusBranch({ side = 'left' }: { side?: 'left' | 'right' }) {
  return (
    <svg
      className="w-32 h-64 sm:w-36 sm:h-72 drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
      fill="none"
      viewBox="0 0 140 280"
    >
      <defs>
        <linearGradient id={`eucaGrad-${side}`} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#a3c4b2" />
          <stop offset="50%" stopColor="#629278" />
          <stop offset="100%" stopColor="#325241" />
        </linearGradient>
      </defs>

      {/* Main Arching Twig */}
      <path
        d={side === 'left' ? 'M 110 260 Q 60 140, 30 20' : 'M 30 260 Q 80 140, 110 20'}
        stroke="#514032"
        strokeLinecap="round"
        strokeWidth="3"
      />

      {/* Round Silver-Dollar Foliage */}
      {[
        { cx: side === 'left' ? 45 : 95, cy: 50, rx: 18, ry: 22, rot: -15 },
        { cx: side === 'left' ? 30 : 110, cy: 95, rx: 22, ry: 26, rot: 25 },
        { cx: side === 'left' ? 65 : 75, cy: 130, rx: 25, ry: 28, rot: -20 },
        { cx: side === 'left' ? 45 : 95, cy: 175, rx: 26, ry: 30, rot: 30 },
        { cx: side === 'left' ? 85 : 55, cy: 215, rx: 27, ry: 30, rot: -10 },
      ].map((leaf, idx) => (
        <g key={idx} transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}>
          <ellipse
            cx={leaf.cx}
            cy={leaf.cy}
            fill={`url(#eucaGrad-${side})`}
            rx={leaf.rx}
            ry={leaf.ry}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="0.8"
          />
          <path
            d={`M ${leaf.cx} ${leaf.cy - leaf.ry * 0.75} Q ${leaf.cx} ${leaf.cy}, ${leaf.cx} ${leaf.cy + leaf.ry * 0.75}`}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="0.8"
          />
        </g>
      ))}
    </svg>
  )
}

/**
 * Gypsophila (Baby's Breath) dainty sprig
 */
function GypsophilaSprig() {
  return (
    <svg className="w-24 h-48 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" fill="none" viewBox="0 0 100 200">
      <path d="M 50 190 Q 52 110, 48 40" stroke="#48604f" strokeWidth="1.5" />
      <path d="M 50 130 Q 30 100, 20 70" stroke="#48604f" strokeWidth="1.2" />
      <path d="M 50 110 Q 70 85, 80 55" stroke="#48604f" strokeWidth="1.2" />

      {/* Tiny White Pearl Blossoms */}
      {[
        { cx: 20, cy: 68 }, { cx: 28, cy: 55 }, { cx: 12, cy: 80 },
        { cx: 48, cy: 38 }, { cx: 42, cy: 24 }, { cx: 58, cy: 28 },
        { cx: 80, cy: 52 }, { cx: 88, cy: 40 }, { cx: 72, cy: 68 },
      ].map((flower, idx) => (
        <g key={idx}>
          <circle cx={flower.cx} cy={flower.cy} fill="#ffffff" r="4.5" />
          <circle cx={flower.cx} cy={flower.cy} fill="#fef08a" r="1.5" />
          <circle cx={flower.cx} cy={flower.cy} fill="none" r="6" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
        </g>
      ))}
    </svg>
  )
}

/**
 * Wrapping Paper - Back Flap (کاغذ کادو پشت دسته‌گل)
 */
function WrappingPaperBack({ foldProgress }: { foldProgress: number }) {
  const foldSpread = lerp(40, 0, foldProgress)

  return (
    <svg className="w-72 h-80 sm:w-80 sm:h-96 drop-shadow-[0_16px_36px_rgba(0,0,0,0.65)]" fill="none" viewBox="0 0 280 340">
      <defs>
        <linearGradient id="kraftBackGrad" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#d5b895" />
          <stop offset="60%" stopColor="#a7835b" />
          <stop offset="100%" stopColor="#7c5c37" />
        </linearGradient>
      </defs>

      {/* Triangular / Diamond Craft Wrap Back Layer */}
      <path
        d={`M ${140 - foldSpread * 1.5} 320 
            L ${30 - foldSpread} 130 
            L 140 10 
            L ${250 + foldSpread} 130 
            L ${140 + foldSpread * 1.5} 320 Z`}
        fill="url(#kraftBackGrad)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.2"
      />

      {/* Internal Fold Crease Shading */}
      <path d="M 140 10 L 140 320" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * Wrapping Paper - Front Folding Wings (پیچیده شدن دو لبه کاغذ کادو به دور ساقه‌ها)
 */
function WrappingPaperFront({ foldProgress }: { foldProgress: number }) {
  // Left and Right wing fold degrees interpolate from open (flat) to wrapped (tight cone)
  const leftFoldX = lerp(-60, 0, foldProgress)
  const rightFoldX = lerp(60, 0, foldProgress)

  return (
    <svg className="w-72 h-72 sm:w-80 sm:h-80 drop-shadow-[0_18px_40px_rgba(0,0,0,0.7)]" fill="none" viewBox="0 0 280 280">
      <defs>
        <linearGradient id="kraftFrontLeft" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f3e5d0" />
          <stop offset="70%" stopColor="#ba946b" />
          <stop offset="100%" stopColor="#8c663e" />
        </linearGradient>

        <linearGradient id="kraftFrontRight" x1="100%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#e8d3b9" />
          <stop offset="70%" stopColor="#a37c53" />
          <stop offset="100%" stopColor="#6e4d29" />
        </linearGradient>
      </defs>

      {/* Left Wrapping Wing */}
      <path
        d={`M 140 260 
            L ${35 + leftFoldX} 90 
            L ${140 + leftFoldX * 0.5} 120 
            L 140 260 Z`}
        fill="url(#kraftFrontLeft)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.2"
      />

      {/* Right Wrapping Wing (Overlaps Left Wing when wrapped) */}
      <path
        d={`M 140 260 
            L ${245 + rightFoldX} 90 
            L ${125 + rightFoldX * 0.3} 125 
            L 140 260 Z`}
        fill="url(#kraftFrontRight)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.2"
      />

      {/* Bottom stem tuck */}
      <path d="M 125 255 Q 140 268, 155 255" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
    </svg>
  )
}

/**
 * Luxury Silk Satin Ribbon with Bow and Fluttering Tails
 */
function SatinRibbon({ tieProgress }: { tieProgress: number }) {
  const bowScale = getStageProgress(tieProgress, 0.4, 1.0)
  const ribbonGlow = Math.min(1, tieProgress * 1.4)

  return (
    <svg className="w-44 h-48 sm:w-48 sm:h-52 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]" fill="none" viewBox="0 0 160 180">
      <defs>
        <linearGradient id="satinGold" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
      </defs>

      {/* Ribbon Belt around the cone waist */}
      <path
        d="M 35 48 C 65 58, 95 58, 125 48 C 122 58, 118 64, 115 68 C 90 74, 70 74, 45 68 Z"
        fill="url(#satinGold)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.8"
      />

      {/* Bow and Tails (Scale up as user wraps the bouquet) */}
      <g
        style={{
          transform: `scale(${bowScale})`,
          transformOrigin: '80px 58px',
          opacity: ribbonGlow,
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* Left Bow Loop */}
        <path
          d="M 80 58 C 50 20, 20 40, 40 68 C 55 76, 72 65, 80 58 Z"
          fill="url(#satinGold)"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
        />
        {/* Right Bow Loop */}
        <path
          d="M 80 58 C 110 20, 140 40, 120 68 C 105 76, 88 65, 80 58 Z"
          fill="url(#satinGold)"
          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
        />

        {/* Central Knot */}
        <ellipse
          cx="80"
          cy="58"
          fill="#d97706"
          rx="9"
          ry="7"
          stroke="#fef08a"
          strokeWidth="1.2"
        />

        {/* Fluttering Ribbon Left Tail */}
        <path
          d="M 76 63 C 65 95, 45 130, 40 160 C 48 152, 58 156, 68 150 C 72 125, 78 95, 80 64 Z"
          fill="url(#satinGold)"
        />

        {/* Fluttering Ribbon Right Tail */}
        <path
          d="M 84 63 C 95 95, 115 130, 120 160 C 112 152, 102 156, 92 150 C 88 125, 82 95, 80 64 Z"
          fill="url(#satinGold)"
        />
      </g>
    </svg>
  )
}
