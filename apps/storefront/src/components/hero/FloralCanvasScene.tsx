'use client'

import { useEffect, useRef } from 'react'
import { STORYBOARD_MOODS, type EmotionalMoodId } from './storyboardConfig'

interface FloralCanvasSceneProps {
  progress: number
  mood: EmotionalMoodId
  onBudInteract?: () => void
}

interface VortexPetal {
  angle: number
  radius: number
  y: number // Absolute height in the 3600px descent vortex
  z: number
  scale: number
  tilt: number
  tiltSpeed: number
  rotation: number
  colorOffset: number
}

interface BokehOrb {
  x: number
  y: number
  radius: number
  opacity: number
  speedY: number
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

    const TOTAL_DEPTH = 3600

    // 100 Crystalline Glass Petals arranged along a descending logarithmic double-helix
    const petals: VortexPetal[] = Array.from({ length: 110 }).map((_, i) => {
      const angle = (i * 0.28) + (i % 2 === 0 ? 0 : Math.PI)
      const radius = 180 + Math.sin(i * 0.4) * 120 + Math.random() * 80
      return {
        angle,
        radius,
        y: (i / 110) * TOTAL_DEPTH + (Math.random() - 0.5) * 60,
        z: Math.random() * 450 + 80,
        scale: Math.random() * 0.6 + 0.7,
        tilt: Math.random() * Math.PI,
        tiltSpeed: (Math.random() - 0.5) * 0.03,
        rotation: Math.random() * Math.PI * 2,
        colorOffset: Math.random(),
      }
    })

    // 25 Large Cinematic Foreground Bokeh Orbs (Out-of-focus soft chromatic orbs)
    const bokehOrbs: BokehOrb[] = Array.from({ length: 25 }).map(() => ({
      x: (Math.random() - 0.5) * width * 1.4,
      y: Math.random() * TOTAL_DEPTH,
      radius: Math.random() * 55 + 35,
      opacity: Math.random() * 0.18 + 0.05,
      speedY: (Math.random() - 0.5) * 0.2,
    }))

    let time = 0
    let smoothProgress = progressRef.current
    let curR = 224
    let curG = 83
    let curB = 108

    const render = () => {
      time += 0.016

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05

      // Smooth progress with inertia
      smoothProgress += (progressRef.current - smoothProgress) * 0.09

      // Target mood colors
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

      // SPIRAL DESCENT COORDINATES
      const cameraY = smoothProgress * TOTAL_DEPTH
      const cameraAngle = smoothProgress * Math.PI * 0.65 // Slight helical twist during descent
      const cameraDriftX = mouseRef.current.x * 35
      const cameraDriftY = mouseRef.current.y * 25

      // 1. DEEP CINEMATIC GRADIENT VOID
      const bgGrad = ctx.createRadialGradient(
        width / 2 + cameraDriftX,
        height * 0.42 + cameraDriftY,
        40,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.9,
      )
      bgGrad.addColorStop(
        0,
        `rgba(${Math.round(curR * 0.4 + 20)}, ${Math.round(curG * 0.4 + 30)}, ${Math.round(curB * 0.4 + 20)}, 0.45)`,
      )
      bgGrad.addColorStop(0.55, 'rgba(12, 28, 20, 0.8)')
      bgGrad.addColorStop(1, 'rgba(5, 12, 9, 0.98)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // 2. RADIAL SHOCKWAVE / BLOOM BURST AT PROGRESS ~0.40 («شکوفا می‌شوند»)
      if (smoothProgress > 0.30 && smoothProgress < 0.55) {
        const shockProgress = (smoothProgress - 0.30) / 0.25
        const shockRadius = shockProgress * (Math.max(width, height) * 0.75)
        const shockAlpha = Math.sin(shockProgress * Math.PI) * 0.35

        ctx.beginPath()
        ctx.arc(width / 2, height / 2, shockRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${shockAlpha})`
        ctx.lineWidth = 2.5
        ctx.stroke()

        // Inner glowing ring
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, shockRadius * 0.7, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, ${shockAlpha * 0.6})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // 3. LARGE CINEMATIC FOREGROUND BOKEH ORBS
      for (const orb of bokehOrbs) {
        let relY = orb.y - cameraY
        if (relY < -300) orb.y += TOTAL_DEPTH
        if (relY > TOTAL_DEPTH) orb.y -= TOTAL_DEPTH
        relY = orb.y - cameraY

        const screenX = width / 2 + orb.x + cameraDriftX * 0.5
        const screenY = height / 2 + relY * 0.8 + cameraDriftY * 0.5

        if (screenY > -100 && screenY < height + 100 && screenX > -100 && screenX < width + 100) {
          const oGrad = ctx.createRadialGradient(
            screenX,
            screenY,
            0,
            screenX,
            screenY,
            orb.radius,
          )
          oGrad.addColorStop(
            0,
            `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, ${orb.opacity * 1.5})`,
          )
          oGrad.addColorStop(
            0.6,
            `rgba(${Math.round(curR * 0.8)}, ${Math.round(curG * 0.8)}, ${Math.round(curB * 0.8)}, ${orb.opacity * 0.5})`,
          )
          oGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.beginPath()
          ctx.arc(screenX, screenY, orb.radius, 0, Math.PI * 2)
          ctx.fillStyle = oGrad
          ctx.fill()
        }
      }

      // 4. THE DESCENDING HELIX OF TUMBLING GLASS PETALS
      // Transform each petal relative to the plunging spiral camera
      const projectedPetals = petals
        .map((p) => {
          p.tilt += p.tiltSpeed
          // Relative coordinates
          const relY = p.y - cameraY
          const currentAngle = p.angle + cameraAngle + time * 0.15
          const worldX = Math.cos(currentAngle) * p.radius
          const worldZ = Math.sin(currentAngle) * p.radius + p.z

          const fov = 440
          const scale = fov / (fov + worldZ)
          const screenX = width / 2 + worldX * scale + cameraDriftX * scale
          const screenY = height / 2 + relY * scale + cameraDriftY * scale

          return { p, relY, worldZ, scale, screenX, screenY }
        })
        .filter(
          (item) =>
            item.screenY > -160 &&
            item.screenY < height + 160 &&
            item.screenX > -160 &&
            item.screenX < width + 160,
        )
        .sort((a, b) => b.worldZ - a.worldZ)

      for (const { p, scale, screenX, screenY } of projectedPetals) {
        ctx.save()
        ctx.translate(screenX, screenY)
        ctx.rotate(p.rotation + Math.sin(time + p.y) * 0.3)
        ctx.scale(scale * p.scale, scale * p.scale * Math.cos(p.tilt))

        const petalW = 42
        const petalH = 80

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(-petalW * 0.75, -petalH * 0.35, -petalW, -petalH * 0.8, 0, -petalH)
        ctx.bezierCurveTo(petalW, -petalH * 0.8, petalW * 0.75, -petalH * 0.35, 0, 0)
        ctx.closePath()

        // Prismatic glass petal gradient
        const pGrad = ctx.createLinearGradient(0, 0, 0, -petalH)
        pGrad.addColorStop(
          0,
          `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, 0.7)`,
        )
        pGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.55)')
        pGrad.addColorStop(
          1,
          `rgba(${Math.round(curR * 0.9 + 40)}, ${Math.round(curG * 0.9 + 40)}, ${Math.round(curB * 0.9 + 40)}, 0.15)`,
        )

        ctx.fillStyle = pGrad
        ctx.shadowColor = `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, 0.4)`
        ctx.shadowBlur = 10 * scale
        ctx.fill()

        // Edge chromatic highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)'
        ctx.lineWidth = 1.3
        ctx.stroke()
        ctx.shadowBlur = 0

        ctx.restore()
      }

      // 5. LUMINOUS ESSENCE CORE (Initial solitary bud at start, then bursts and dissolves)
      if (smoothProgress < 0.45) {
        const coreAlpha = Math.max(0, 1 - smoothProgress / 0.42)
        const coreRelY = -cameraY * 0.3
        const coreScale = Math.max(0.2, 1 - smoothProgress * 0.5)
        const coreScreenX = width / 2 + cameraDriftX * coreScale
        const coreScreenY = height / 2 + coreRelY + cameraDriftY * coreScale

        ctx.save()
        ctx.translate(coreScreenX, coreScreenY)
        ctx.rotate(time * 0.1)

        const coreRadius = 60 * coreScale
        const cGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius)
        cGrad.addColorStop(0, '#ffffff')
        cGrad.addColorStop(
          0.35,
          `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, ${0.9 * coreAlpha})`,
        )
        cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')

        ctx.beginPath()
        ctx.arc(0, 0, coreRadius, 0, Math.PI * 2)
        ctx.fillStyle = cGrad
        ctx.shadowColor = `rgba(${Math.round(curR)}, ${Math.round(curG)}, ${Math.round(curB)}, ${coreAlpha})`
        ctx.shadowBlur = 40
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
      aria-label="سفر فضایی مارپیچ در میان گلبرگ‌ها و نور"
    />
  )
}
