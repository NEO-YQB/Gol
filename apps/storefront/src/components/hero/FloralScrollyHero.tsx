'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import FloralAtmosphereOverlay from './FloralAtmosphereOverlay'
import { STORYBOARD_MOODS, type EmotionalMoodId } from './storyboardConfig'

// Dynamic import with no SSR for the 3D WebGL Canvas Engine
const FloralCanvasScene = dynamic(() => import('./FloralCanvasScene'), {
  ssr: false,
  loading: () => <FloralCanvasFallback />,
})

function FloralCanvasFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_#1c4839_0%,_#0d2119_75%,_#06110c_100%)]"
    >
      <div className="relative w-48 h-48 rounded-full border border-white/20 bg-white/5 backdrop-blur-md animate-pulse shadow-[0_0_60px_rgba(255,255,255,0.15)] flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500/30 to-amber-400/40 blur-xl" />
      </div>
    </div>
  )
}

interface FloralScrollyHeroProps {
  pageTitle?: string
  fallbackImageUrl?: string
}

export function FloralScrollyHero({ pageTitle }: FloralScrollyHeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const targetProgressRef = useRef(0)
  const currentProgressRef = useRef(0)
  const [smoothProgress, setSmoothProgress] = useState(0)
  const [selectedMood, setSelectedMood] = useState<EmotionalMoodId>('love')
  const [reducedMotion, setReducedMotion] = useState(false)

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Passive high-performance scroll listener with Liquid Damping / Smooth Inertia
  useEffect(() => {
    if (reducedMotion) return

    let rafId: number | null = null

    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const totalScrollable = rect.height - windowHeight

      if (totalScrollable <= 0) {
        targetProgressRef.current = 0
        return
      }

      const rawProgress = -rect.top / totalScrollable
      targetProgressRef.current = Math.min(Math.max(rawProgress, 0), 1)
    }

    // Continuous 120fps physics loop for buttery-smooth damping
    const updatePhysics = () => {
      // 0.065 provides an ultra-silky, liquid deceleration (like Lenis/GSAP smooth scroll)
      const diff = targetProgressRef.current - currentProgressRef.current
      if (Math.abs(diff) > 0.0001) {
        currentProgressRef.current += diff * 0.065
        setSmoothProgress(currentProgressRef.current)
      }

      rafId = requestAnimationFrame(updatePhysics)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    rafId = requestAnimationFrame(updatePhysics)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [reducedMotion])

  // Skip straight to catalog
  const handleSkipToCatalog = useCallback(() => {
    const catalogEl = document.getElementById('storefront-catalog')
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' })
      return
    }

    const container = containerRef.current
    if (container) {
      const targetTop = container.offsetTop + container.offsetHeight - 80
      window.scrollTo({ top: targetTop, behavior: 'smooth' })
    }
  }, [])

  const currentMood = STORYBOARD_MOODS[selectedMood]

  return (
    <div
      ref={containerRef}
      className="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen max-w-none isolate"
      style={{
        // 380vh gives generous headroom for the 3-phase linger & float motion
        height: reducedMotion ? '100vh' : '380vh',
      }}
    >
      {/* SSR SEO Semantic Layer (Indexed by Googlebot on first payload) */}
      <div className="sr-only" aria-hidden="false">
        <h1>{pageTitle || 'گلینو — خرید آنلاین گل از نزدیک‌ترین گلفروشی‌های منتخب'}</h1>
        <p>بعضی حرف‌ها، با یک گل شروع می‌شوند. گلینو پلتفرمی برای سفارش فوری گل و گیاه از بهترین گلفروشی‌های اطراف شما با ارسال کمتر از ۲ ساعت است.</p>
        <h2>دوست‌داشتن • دلتنگی • شروعی تازه</h2>
      </div>

      {/* Sticky Viewport Container */}
      <section
        className="sticky top-0 h-screen w-full overflow-hidden transition-colors duration-1000"
        style={{
          background: currentMood.bgGradient,
        }}
        aria-label="روایت تعاملی هیرو گلینو"
      >
        {/* Dynamic 3D WebGL Canvas Scene */}
        {!reducedMotion && (
          <FloralCanvasScene
            progress={smoothProgress}
            mood={selectedMood}
            onBudInteract={() => {
              setSelectedMood((prev) =>
                prev === 'love' ? 'longing' : prev === 'longing' ? 'new_beginning' : 'love',
              )
            }}
          />
        )}

        {/* Ambient Vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_35%,rgba(5,13,9,0.85)_100%)] z-10"
        />

        {/* Interactive HUD & Kinetic Typography */}
        <FloralAtmosphereOverlay
          progress={smoothProgress}
          mood={selectedMood}
          onSelectMood={setSelectedMood}
          onSkipToCatalog={handleSkipToCatalog}
        />
      </section>
    </div>
  )
}
