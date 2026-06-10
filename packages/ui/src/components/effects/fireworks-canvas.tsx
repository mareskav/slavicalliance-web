"use client"

import { useEffect, useRef, useState } from "react"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  hue: number
  trail: number
  sparkle: boolean
  twinkle: number
}

type BurstOrigin = {
  x: number
  y: number
}

type AvoidRect = {
  left: number
  right: number
  top: number
  bottom: number
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

const desktopFrameMs = 1000 / 24
const compactFrameMs = 1000 / 20
const baseFrameMs = 1000 / 60
const maxParticles = 128
const fireworkHues = [0, 24, 42, 55, 88, 128, 176, 205, 246, 284, 322]

const getFireworkHue = () => fireworkHues[Math.floor(Math.random() * fireworkHues.length)] + randomBetween(-7, 7)

const getViewportIntensity = (width: number, height: number) => {
  const area = width * height
  const minArea = 390 * 700
  const maxArea = 1440 * 900
  return Math.min(1, Math.max(0, (area - minArea) / (maxArea - minArea)))
}

const scheduleDelay = (width: number, height: number, compact: boolean) => {
  if (compact) return randomBetween(1700, 2800)

  const intensity = getViewportIntensity(width, height)
  return randomBetween(1250 - intensity * 420, 2200 - intensity * 520)
}

const getBurstCount = (width: number, compact: boolean) => {
  if (compact) return 1
  if (width >= 1280) return Math.random() > 0.72 ? 3 : Math.random() > 0.38 ? 2 : 1
  if (width >= 900) return Math.random() > 0.68 ? 2 : 1
  return 1
}

const getAvoidRects = (): AvoidRect[] => {
  return Array.from(document.querySelectorAll("table"))
    .map((table) => table.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom
    }))
}

const isInsideAvoidedArea = (origin: BurstOrigin, avoidRects: AvoidRect[], margin: number) => {
  return avoidRects.some(
    (rect) =>
      origin.x >= rect.left - margin &&
      origin.x <= rect.right + margin &&
      origin.y >= rect.top - margin &&
      origin.y <= rect.bottom + margin
  )
}

const getCandidateOrigin = (width: number, height: number, compact: boolean): BurstOrigin => {
  if (compact) {
    const topBand = Math.random() > 0.42
    return {
      x: randomBetween(width * 0.08, width * 0.92),
      y: topBand ? randomBetween(height * 0.1, height * 0.3) : randomBetween(height * 0.76, height * 0.92)
    }
  }

  return {
    x: randomBetween(width * 0.04, width * 0.96),
    y: randomBetween(height * 0.08, height * 0.78)
  }
}

const getBurstOrigin = (
  width: number,
  height: number,
  existingOrigins: BurstOrigin[] = [],
  compact = false,
  avoidRects: AvoidRect[] = []
): BurstOrigin => {
  const minDistance = Math.min(width, height) * 0.32
  const avoidMargin = compact ? 52 : 76

  for (let i = 0; i < 12; i += 1) {
    const origin = getCandidateOrigin(width, height, compact)
    const farEnough = existingOrigins.every((other) => Math.hypot(origin.x - other.x, origin.y - other.y) >= minDistance)

    if (farEnough && !isInsideAvoidedArea(origin, avoidRects, avoidMargin)) {
      return origin
    }
  }

  const first = existingOrigins[0]
  if (!first) {
    return {
      x: randomBetween(width * 0.06, width * 0.94),
      y: compact ? randomBetween(height * 0.1, height * 0.28) : randomBetween(height * 0.08, height * 0.68)
    }
  }

  return {
    x: first.x < width / 2 ? randomBetween(width * 0.62, width * 0.94) : randomBetween(width * 0.06, width * 0.38),
    y: compact ? randomBetween(height * 0.1, height * 0.28) : randomBetween(height * 0.12, height * 0.68)
  }
}

const spawnBurst = (particles: Particle[], width: number, height: number, origin = getBurstOrigin(width, height)) => {
  const { x, y } = origin
  const hue = getFireworkHue()
  const count = Math.round(randomBetween(26, 38))

  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + randomBetween(-0.08, 0.08)
    const speed = randomBetween(0.65, 2.05)

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: randomBetween(95, 145),
      size: randomBetween(1.7, 3.2),
      hue: hue + randomBetween(-24, 24),
      trail: randomBetween(2.8, 5),
      sparkle: Math.random() > 0.86,
      twinkle: randomBetween(0, Math.PI * 2)
    })
  }

  if (particles.length > maxParticles) {
    particles.splice(0, particles.length - maxParticles)
  }
}

export const FireworksCanvas = ({ enabled }: { enabled: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const shouldRun = enabled && mounted && !reducedMotion

  useEffect(() => {
    let active = true
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncReducedMotion = () => setReducedMotion(mediaQuery.matches)
    const readyTimer = window.setTimeout(() => {
      if (!active) return
      setMounted(true)
      setReducedMotion(mediaQuery.matches)
    }, 0)

    mediaQuery.addEventListener("change", syncReducedMotion)
    return () => {
      active = false
      window.clearTimeout(readyTimer)
      mediaQuery.removeEventListener("change", syncReducedMotion)
    }
  }, [])

  useEffect(() => {
    if (!shouldRun) return

    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const particles: Particle[] = []
    let frame = 0
    let animationId = 0
    let nextBurstAt = 0
    let lastFrameAt = 0
    let width = 0
    let height = 0
    let scale = 1
    let compact = false

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      compact = width < 768
      scale = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 2)
      canvas.width = Math.floor(width * scale)
      canvas.height = Math.floor(height * scale)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }

    const draw = (time: number) => {
      animationId = requestAnimationFrame(draw)

      if (lastFrameAt > 0 && time - lastFrameAt < (compact ? compactFrameMs : desktopFrameMs)) return

      const elapsed = lastFrameAt > 0 ? time - lastFrameAt : baseFrameMs
      const frameStep = Math.min(2, elapsed / baseFrameMs)
      lastFrameAt = time

      if (time >= nextBurstAt) {
        const burstCount = getBurstCount(width, compact)
        const avoidRects = getAvoidRects()
        const origins: BurstOrigin[] = []
        for (let i = 0; i < burstCount; i += 1) {
          const origin = getBurstOrigin(width, height, origins, compact, avoidRects)
          origins.push(origin)
          spawnBurst(particles, width, height, origin)
        }
        nextBurstAt = time + scheduleDelay(width, height, compact)
      }

      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = "lighter"
      context.shadowBlur = 0

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i]
        const progress = particle.age / particle.life
        const alpha = Math.max(0, (1 - progress) * 0.58)
        const tailAlpha = alpha * 0.62
        const starPulse =
          particle.sparkle && progress < 0.48
            ? 0.68 + Math.sin(particle.age * 0.2 + particle.twinkle) * 0.32
            : 0

        particle.x += particle.vx * frameStep
        particle.y += particle.vy * frameStep
        particle.vx *= 0.989 ** frameStep
        particle.vy = particle.vy * 0.989 ** frameStep + 0.012 * frameStep
        particle.age += frameStep

        context.beginPath()
        context.strokeStyle = `hsla(${particle.hue}, 96%, 72%, ${tailAlpha})`
        context.lineWidth = Math.max(0.45, particle.size * 0.58 * (1 - progress * 0.45))
        context.lineCap = "round"
        context.moveTo(particle.x - particle.vx * particle.trail, particle.y - particle.vy * particle.trail)
        context.lineTo(particle.x, particle.y)
        context.stroke()

        if (starPulse > 0) {
          const starSize = particle.size * (1.7 + starPulse) * (1 - progress * 0.45)
          const starAlpha = alpha * starPulse

          context.beginPath()
          context.strokeStyle = `hsla(${particle.hue}, 100%, 82%, ${starAlpha})`
          context.lineWidth = Math.max(0.35, particle.size * 0.34)
          context.moveTo(particle.x - starSize, particle.y)
          context.lineTo(particle.x + starSize, particle.y)
          context.moveTo(particle.x, particle.y - starSize)
          context.lineTo(particle.x, particle.y + starSize)
          context.stroke()
        }

        context.beginPath()
        context.fillStyle = `hsla(${particle.hue}, 92%, 68%, ${alpha})`
        context.arc(particle.x, particle.y, particle.size * (1 - progress * 0.35), 0, Math.PI * 2)
        context.fill()

        if (particle.age >= particle.life) {
          particles.splice(i, 1)
        }
      }

      context.shadowBlur = 0
      context.globalCompositeOperation = "source-over"

      frame += 1
      if (frame % 120 === 0 && particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles)
      }
    }

    resize()
    spawnBurst(particles, width, height)
    nextBurstAt = performance.now() + scheduleDelay(width, height, compact)
    window.addEventListener("resize", resize)
    animationId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
      context.clearRect(0, 0, width, height)
    }
  }, [shouldRun])

  if (!shouldRun) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-9] h-screen w-screen opacity-80 mix-blend-screen"
    />
  )
}
