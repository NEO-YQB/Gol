'use client'

import { useEffect, useRef } from 'react'
import { STORYBOARD_MOODS, type EmotionalMoodId } from './storyboardConfig'

interface FloralCanvasSceneProps {
  progress: number
  mood: EmotionalMoodId
  onBudInteract?: () => void
}

interface Particle {
  x: number
  y: number
  z: number
  size: number
  speedX: number
  speedY: number
  speedZ: number
  opacity: number
  phase: number
}

export default function FloralCanvasScene({
  progress,
  mood,
  onBudInteract,
}: FloralCanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isHovering: false })
  const moodRef = useRef(mood)
  const progressRef = useRef(progress)

  useEffect(() => {
    moodRef.current = mood
  }, [mood])

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1
      const normY = (e.clientY / window.innerHeight) * 2 - 1
      mouseRef.current.targetX = normX
      mouseRef.current.targetY = normY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return
      const t = e.touches[0]
      const normX = (t.clientX / window.innerWidth) * 2 - 1
      const normY = (t.clientY / window.innerHeight) * 2 - 1
      mouseRef.current.targetX = normX
      mouseRef.current.targetY = normY
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    // Initialize 80 ambient pollen/dew particles
    const particles: Particle[] = Array.from({ length: 80 }).map(() => ({
      x: (Math.random() - 0.5) * width * 1.2,
      y: (Math.random() - 0.5) * height * 1.2,
      z: Math.random() * 800 + 100,
      size: Math.random() * 2.6 + 1.2,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.5 - 0.2,
      speedZ: (Math.random() - 0.5) * 0.6,
      opacity: Math.random() * 0.6 + 0.25,
      phase: Math.random() * Math.PI * 2,
    }))

    let time = 0

    // Interpolated mood colors
    const currentMoodConfig = STORYBOARD_MOODS[moodRef.current]
    let currentAccentR = 224
    let currentAccentG = 83
    let currentAccentB = 108

    const render = () => {
      time += 0.016

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05

      const curProgress = progressRef.current
      const targetMood = STORYBOARD_MOODS[moodRef.current]

      // Determine RGB targets from mood
      let targetR = 224
      let targetG = 83
      let targetB = 108
      if (moodRef.current === 'longing') {
        targetR = 123
        targetG = 166
        targetB = 217
      } else if (moodRef.current === 'new_beginning') {
        targetR = 232
        targetG = 168
        targetB = 98
      }

      currentAccentR += (targetR - currentAccentR) * 0.06
      currentAccentG += (targetG - currentAccentG) * 0.06
      currentAccentB += (targetB - currentAccentB) * 0.06

      // Clear with subtle trail/transparent fill
      ctx.clearRect(0, 0, width, height)

      const centerX = width / 2 + mouseRef.current.x * 35
      const centerY = height / 2 + mouseRef.current.y * 30 + Math.sin(time * 0.8) * 8

      // 1. Draw Background Ambient Glow
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        20,
        centerX,
        centerY,
        Math.min(width, height) * 0.75,
      )
      bgGrad.addColorStop(
        0,
        `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, ${0.18 + curProgress * 0.08})`,
      )
      bgGrad.addColorStop(
        0.5,
        `rgba(24, 48, 36, ${0.45 + curProgress * 0.15})`,
      )
      bgGrad.addColorStop(1, 'rgba(11, 25, 18, 0.96)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // 2. Draw Proximity Radar Waves (active in Stage 3 & 4)
      if (curProgress > 0.45) {
        const proximityIntensity = Math.min((curProgress - 0.45) / 0.35, 1)
        for (let r = 1; r <= 3; r++) {
          const waveRadius = ((time * 35 + r * 75) % 260) + 70
          const waveAlpha = Math.max(0, (1 - waveRadius / 330) * 0.22 * proximityIntensity)
          ctx.beginPath()
          ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(197, 151, 77, ${waveAlpha})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
      }

      // 3. Draw Ambient Pollen / Dew Particles in 3D perspective
      for (const p of particles) {
        p.x += p.speedX
        p.y += p.speedY
        p.z += p.speedZ

        if (p.z < 50) p.z = 850
        if (p.z > 850) p.z = 50
        if (p.x < -width) p.x = width
        if (p.x > width) p.x = -width
        if (p.y < -height) p.y = height
        if (p.y > height) p.y = -height

        const fov = 400
        const scale = fov / (fov + p.z)
        const screenX = centerX + p.x * scale + mouseRef.current.x * (scale * 60)
        const screenY = centerY + p.y * scale + mouseRef.current.y * (scale * 60)
        const radius = Math.max(0.6, p.size * scale)
        const twinkle = Math.sin(time * 2 + p.phase) * 0.3 + 0.7

        ctx.beginPath()
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${Math.round(currentAccentR * 0.9 + 50)}, ${Math.round(currentAccentG * 0.9 + 50)}, ${Math.round(currentAccentB * 0.9 + 50)}, ${p.opacity * twinkle * scale})`
        ctx.shadowColor = `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, 0.6)`
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // 4. Draw the Central Glass Bud & Blooming Petals
      // Bloom factor: 0.0 (closed bud) -> 1.0 (fully bloomed bouquet)
      const bloom = Math.min(Math.max((curProgress - 0.05) / 0.85, 0), 1)
      const budScale = Math.min(width, height) * (0.24 + bloom * 0.08)

      // Base Bud Stem / Pedicel
      ctx.save()
      ctx.translate(centerX, centerY)

      // Subtle rotation from mouse
      ctx.rotate(mouseRef.current.x * 0.12)

      // Petal Layers
      const petalLayers = [
        { count: 5, radius: budScale * (0.45 + bloom * 0.65), spread: 0.25 + bloom * 0.8, alpha: 0.78, blur: 16 },
        { count: 7, radius: budScale * (0.65 + bloom * 0.85), spread: 0.4 + bloom * 0.95, alpha: 0.58, blur: 22 },
        { count: 9, radius: budScale * (0.85 + bloom * 1.1), spread: 0.6 + bloom * 1.15, alpha: 0.38, blur: 28 },
      ]

      petalLayers.forEach((layer, layerIdx) => {
        const angleStep = (Math.PI * 2) / layer.count
        const layerRot = (time * 0.04 * (layerIdx % 2 === 0 ? 1 : -1)) + (layerIdx * 0.3)

        for (let i = 0; i < layer.count; i++) {
          const angle = i * angleStep + layerRot
          const petalDist = layer.radius
          const px = Math.cos(angle) * petalDist * layer.spread
          const py = Math.sin(angle) * petalDist * layer.spread * 0.85

          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(angle + Math.PI / 2 + Math.sin(time + i) * 0.04)

          // Petal shape (Crystalline / Glass Refraction)
          const petalWidth = (budScale * 0.32) / (layerIdx + 1) * (1 + bloom * 0.5)
          const petalLength = (budScale * 0.6) / (layerIdx + 0.9) * (1 + bloom * 0.6)

          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.bezierCurveTo(
            -petalWidth * 0.8,
            -petalLength * 0.4,
            -petalWidth,
            -petalLength * 0.85,
            0,
            -petalLength,
          )
          ctx.bezierCurveTo(
            petalWidth,
            -petalLength * 0.85,
            petalWidth * 0.8,
            -petalLength * 0.4,
            0,
            0,
          )
          ctx.closePath()

          // Glass Petal Shading (Fresnel edge glow + translucent core)
          const petalGrad = ctx.createLinearGradient(0, 0, 0, -petalLength)
          petalGrad.addColorStop(
            0,
            `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, ${layer.alpha * 0.85})`,
          )
          petalGrad.addColorStop(
            0.6,
            `rgba(255, 255, 255, ${layer.alpha * 0.45})`,
          )
          petalGrad.addColorStop(
            1,
            `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, ${layer.alpha * 0.2})`,
          )

          ctx.fillStyle = petalGrad
          ctx.shadowColor = `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, 0.4)`
          ctx.shadowBlur = layer.blur
          ctx.fill()

          // Subtle Glass Edge Highlight
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 - layerIdx * 0.1})`
          ctx.lineWidth = 1.1
          ctx.stroke()
          ctx.shadowBlur = 0

          ctx.restore()
        }
      })

      // Central Glass Core (The glowing heart of the bud)
      const coreRadius = budScale * (0.28 + Math.sin(time * 1.5) * 0.02)
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius)
      coreGrad.addColorStop(0, '#ffffff')
      coreGrad.addColorStop(
        0.35,
        `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, 0.9)`,
      )
      coreGrad.addColorStop(
        0.8,
        `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, 0.25)`,
      )
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.beginPath()
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2)
      ctx.fillStyle = coreGrad
      ctx.shadowColor = `rgba(${Math.round(currentAccentR)}, ${Math.round(currentAccentG)}, ${Math.round(currentAccentB)}, 0.85)`
      ctx.shadowBlur = 32
      ctx.fill()
      ctx.shadowBlur = 0

      // Core Glass Highlight Ring
      ctx.beginPath()
      ctx.arc(0, 0, coreRadius * 0.8, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)'
      ctx.lineWidth = 1.4
      ctx.stroke()

      ctx.restore()

      animFrameIdRef.current = requestAnimationFrame(render)
    }

    animFrameIdRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-auto touch-none"
      onClick={onBudInteract}
      style={{
        transition: 'filter 0.5s ease',
      }}
      aria-label="نمایش تعاملی غنچه و شکفتن گل‌ها"
    />
  )
}
