'use client'

import { useEffect, useRef } from 'react'
import { STORYBOARD_MOODS, type EmotionalMoodId } from './storyboardConfig'

interface FloralCanvasSceneProps {
  progress: number
  mood: EmotionalMoodId
  onBudInteract?: () => void
}

interface SpatialPetal {
  x: number
  y: number // Absolute vertical coordinate in the 4000px descent column
  z: number
  rotation: number
  rotSpeed: number
  scale: number
  type: number // petal shape variant
  colorVariation: number
}

interface DustParticle {
  x: number
  y: number
  z: number
  size: number
  speedX: number
  speedY: number
  opacity: number
}

export default function FloralCanvasScene({
  progress,
  mood,
  onBudInteract,
}: FloralCanvasSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const progressRef = useRef(progress)
  const moodRef = useRef(mood)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    moodRef.current = mood
  }, [mood])

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
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.targetY = (e.clientY / window.innerHeight) * 2 - 1
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return
      mouseRef.current.targetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1
      mouseRef.current.targetY = (e.touches[0].clientY / window.innerHeight) * 2 - 1
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    // Generate a 3D vertical spatial column of 90 tumbling glass petals
    const TOTAL_DEPTH = 3400
    const petals: SpatialPetal[] = Array.from({ length: 90 }).map((_, i) => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (i / 90) * TOTAL_DEPTH + (Math.random() - 0.5) * 120,
      z: Math.random() * 650 + 100,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      scale: Math.random() * 0.7 + 0.6,
      type: Math.floor(Math.random() * 3),
      colorVariation: Math.random(),
    }))

    // 120 floating bioluminescent dust and dew particles
    const dustParticles: DustParticle[] = Array.from({ length: 120 }).map(() => ({
      x: (Math.random() - 0.5) * width * 1.6,
      y: Math.random() * TOTAL_DEPTH,
      z: Math.random() * 700 + 50,
      size: Math.random() * 2.8 + 1.2,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.25,
    }))

    let time = 0
    let smoothProgress = progressRef.current
    let curR = 224
    let curG = 83
    let curB = 108

    const render = () => {
      time += 0.016

      // Lerp mouse
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06

      // Lerp progress for ultra-silky descent physics
      smoothProgress += (progressRef.current - smoothProgress) * 0.1

      // Dynamic mood color interpolation
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

      curR += (targetR - curR) * 0.05
      curG += (targetG - curG) * 0.05
      curB += (targetB - curB) * 0.05

      ctx.clearRect(0, 0, width, height)

      // CAMERA POSITION (Plunging downwards along Y)
      const cameraY = smoothProgress * TOTAL_DEPTH
      const cameraTiltX = mouseRef.current.x * 30
      const cameraTiltY = mouseRef.current.y * 25

      // 1. DYNAMIC VOLUMETRIC GRADIENT BACKGROUND
      const bgGrad = ctx.createRadialGradient(
        width / 2 + cameraTiltX,
        height * 0.45 + cameraTiltY,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.85,
      )
      // Shifting background warmth along descent
      bgGrad.addColorStop(
        0,
        `rgba(${Math.round(curR * 0.35 + 15)}, ${Math.round(curG * 0.35 + 35)}, ${Math.round(curB * 0.35 + 25)}, 0.4)`,
      )
      bgGrad.addColorStop(0.5, 'rgba(15, 33, 24, 0.75)')
      bgGrad.addColorStop(1, 'rgba(7, 16, 12, 0.98)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // 2. SOFT ANGLE GOD RAYS (Light rays passing by as we dive)
      ctx.save()
      ctx.translate(width / 2, 0)
      ctx.rotate(0.18 + Math.sin(time * 0.5) * 0.02)
      for (let ray = -2; ray <= 2; ray++) {
        const rayX = ray * (width * 0.28) + Math.sin(time * 0.6 + ray) * 30
        const rayGrad = ctx.createLinearGradient(rayX, 0, rayX, height * 1.2)
        rayGrad.addColorStop(0, `rgba(255, 255, 255, ${0.06 - Math.abs(ray) * 0.015})`)
        rayGrad.addColorStop(0.6, `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, 0.02)`)
        rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = rayGrad
        ctx.fillRect(rayX - 60, 0, 120, height * 1.2)
      }
      ctx.restore()

      // 3. AMBIENT DUST & BIOLUMINESCENT PARTICLES (Travelling past camera)
      for (const p of dustParticles) {
        // Relative Y to camera
        let relY = p.y - cameraY
        // Wrap around infinite stream
        if (relY < -400) p.y += TOTAL_DEPTH
        if (relY > TOTAL_DEPTH) p.y -= TOTAL_DEPTH
        relY = p.y - cameraY

        p.x += p.speedX
        const fov = 420
        const scale = fov / (fov + p.z)
        const screenX = width / 2 + p.x * scale + cameraTiltX * scale
        const screenY = height / 2 + relY * scale + cameraTiltY * scale

        if (screenY > -50 && screenY < height + 50 && screenX > -50 && screenX < width + 50) {
          const radius = Math.max(0.6, p.size * scale)
          ctx.beginPath()
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${Math.round(curR * 0.8 + 60)}, ${Math.round(curG * 0.8 + 60)}, ${Math.round(curB * 0.8 + 60)}, ${p.opacity * scale})`
          ctx.fill()
        }
      }

      // 4. TUMBLING GLASS PETALS IN 3D PERSPECTIVE (THE DESCENT)
      // Sort petals by Z depth (painter's algorithm)
      const visiblePetals = petals
        .map((petal) => {
          petal.rotation += petal.rotSpeed
          // Relative Y to camera gives the physical feeling of falling down past them
          const relY = petal.y - cameraY
          const fov = 420
          const scale = fov / (fov + petal.z)
          const screenX = width / 2 + petal.x * scale + cameraTiltX * scale
          const screenY = height / 2 + relY * scale + cameraTiltY * scale
          return { petal, relY, scale, screenX, screenY }
        })
        .filter(
          (item) =>
            item.screenY > -180 &&
            item.screenY < height + 180 &&
            item.screenX > -180 &&
            item.screenX < width + 180,
        )
        .sort((a, b) => b.petal.z - a.petal.z)

      for (const { petal, scale, screenX, screenY } of visiblePetals) {
        ctx.save()
        ctx.translate(screenX, screenY)
        ctx.rotate(petal.rotation + Math.sin(time + petal.y) * 0.2)
        ctx.scale(scale * petal.scale, scale * petal.scale)

        const petalW = 45
        const petalH = 85

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(-petalW * 0.7, -petalH * 0.35, -petalW, -petalH * 0.8, 0, -petalH)
        ctx.bezierCurveTo(petalW, -petalH * 0.8, petalW * 0.7, -petalH * 0.35, 0, 0)
        ctx.closePath()

        // Translucent crystalline glass shading
        const pGrad = ctx.createLinearGradient(0, 0, 0, -petalH)
        pGrad.addColorStop(
          0,
          `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, 0.65)`,
        )
        pGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)')
        pGrad.addColorStop(
          1,
          `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, 0.15)`,
        )

        ctx.fillStyle = pGrad
        ctx.shadowColor = `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, 0.35)`
        ctx.shadowBlur = 12 * scale
        ctx.fill()

        // Prismatic glass edge refraction
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.restore()
      }

      // 5. CENTRAL BLOOMING NUCLEUS (The Sacred Bud you travel toward and through)
      // At smoothProgress 0.0 it is at center; as you plunge past progress 0.35, it expands and surrounds you
      const budRelY = 0 - cameraY * 0.4 // bud drifts slowly
      const budFov = 400
      const budZ = 300 - smoothProgress * 280
      const budScale = Math.max(0.1, budFov / (budFov + budZ))
      const budScreenX = width / 2 + cameraTiltX * budScale
      const budScreenY = height / 2 + budRelY * budScale + cameraTiltY * budScale + Math.sin(time * 1.2) * 10

      if (smoothProgress < 0.85) {
        const budBloom = Math.min(Math.max((smoothProgress - 0.05) / 0.45, 0), 1)
        const coreSize = 75 * budScale * (1 + budBloom * 1.5)

        ctx.save()
        ctx.translate(budScreenX, budScreenY)
        ctx.rotate(time * 0.08)

        // Radial bloom rings
        for (let ring = 0; ring < 3; ring++) {
          const rRadius = coreSize * (0.8 + ring * 0.4)
          ctx.beginPath()
          ctx.arc(0, 0, rRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 255, 255, ${(0.3 - ring * 0.08) * (1 - smoothProgress * 0.8)})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }

        // Luminous glowing core
        const cGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, coreSize)
        cGrad.addColorStop(0, '#ffffff')
        cGrad.addColorStop(
          0.4,
          `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, ${0.8 * (1 - smoothProgress * 0.7)})`,
        )
        cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.beginPath()
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2)
        ctx.fillStyle = cGrad
        ctx.shadowColor = `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, 0.9)`
        ctx.shadowBlur = 35 * budScale
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.restore()
      }

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
      aria-label="سفر فضایی در میان گلبرگ‌های شیشه‌ای و نور"
    />
  )
}
