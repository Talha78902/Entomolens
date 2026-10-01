import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils/cn'

export function HeroIllustration({ className }: { className?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const handleMove = (event: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dx = (event.clientX - rect.left) / rect.width - 0.5
      const dy = (event.clientY - rect.top) / rect.height - 0.5
      wrapper.style.setProperty('--px', `${dx * 10}px`)
      wrapper.style.setProperty('--py', `${dy * 10}px`)
    }
    const handleLeave = () => {
      wrapper.style.setProperty('--px', '0px')
      wrapper.style.setProperty('--py', '0px')
    }

    wrapper.addEventListener('mousemove', handleMove)
    wrapper.addEventListener('mouseleave', handleLeave)
    return () => {
      wrapper.removeEventListener('mousemove', handleMove)
      wrapper.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <div ref={wrapperRef} className="hero-parallax">
      <svg
      viewBox="0 0 520 480"
      role="img"
      aria-label="Scientific illustration of a moth specimen"
      className={cn('h-auto w-full max-w-md text-forest-800', className)}
    >
      <defs>
        <linearGradient id="el-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5F1E6" />
          <stop offset="100%" stopColor="#DFE8DB" />
        </linearGradient>
        <radialGradient id="el-body" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#4F7D4A" />
          <stop offset="100%" stopColor="#173B2B" />
        </radialGradient>
        <radialGradient id="el-wing" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="#58896B" />
          <stop offset="60%" stopColor="#2B5840" />
          <stop offset="100%" stopColor="#102A1F" />
        </radialGradient>
        <radialGradient id="el-butterfly-type" />
      </defs>

      <rect x="2" y="2" width="516" height="476" rx="24" fill="url(#el-bg)" aria-hidden="true" />

      <g transform="translate(260 240)">
        {/* frame */}
        <circle r="190" fill="none" stroke="#173B2B" strokeOpacity="0.08" strokeWidth="1" aria-hidden="true" />
        <circle r="150" fill="none" stroke="#173B2B" strokeOpacity="0.08" strokeWidth="1" aria-hidden="true" />

        {/* pin */}
        <line x1="0" y1="-40" x2="0" y2="-170" stroke="#172019" strokeOpacity="0.35" strokeWidth="1.5" aria-hidden="true" />
        <circle cx="0" cy="-178" r="7" fill="none" stroke="#172019" strokeOpacity="0.5" strokeWidth="1.2" aria-hidden="true" />

        {/* left wings */}
        <path
          d="M-8 -10 Q-70 -160 -215 -150 Q-235 -95 -190 -35 Q-120 -2 -8 -10 Z"
          fill="url(#el-wing)"
          fillOpacity="0.92"
        />
        <path
          d="M-8 12 Q-60 90 -195 125 Q-220 180 -160 205 Q-90 170 -8 12 Z"
          fill="url(#el-wing)"
          fillOpacity="0.8"
        />

        {/* right wings */}
        <path
          d="M8 -10 Q70 -160 215 -150 Q235 -95 190 -35 Q120 -2 8 -10 Z"
          fill="url(#el-wing)"
          fillOpacity="0.92"
        />
        <path
          d="M8 12 Q60 90 195 125 Q220 180 160 205 Q90 170 8 12 Z"
          fill="url(#el-wing)"
          fillOpacity="0.8"
        />

        {/* wing markings */}
        {[-1, 1].map((side) => (
          <g key={side} fill="#F5F1E6" opacity="0.35">
            <ellipse cx={side * 120} cy={-90} rx="34" ry="24" transform={`rotate(${-side * 14} ${side * 120} -90)`} />
            <ellipse cx={side * 100} cy={80} rx="26" ry="18" transform={`rotate(${side * 8} ${side * 100} 80)`} />
            <circle cx={side * 170} cy={-70} r="4" />
            <circle cx={side * 30} cy={-40} r="3" />
          </g>
        ))}

        {/* body */}
        <ellipse cx="0" cy="40" rx="16" ry="95" fill="url(#el-body)" />
        {/* thorax */}
        <ellipse cx="0" cy="-18" rx="15" ry="30" fill="#2B5840" />

        {/* antennae */}
        <path d="M-5 -45 Q-30 -90 -18 -120" stroke="#172019" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M5 -45 Q30 -90 18 -120" stroke="#172019" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* eye spot hint */}
        <circle r="52" fill="none" stroke="#F5F1E6" strokeOpacity="0.15" strokeWidth="1.5" aria-hidden="true" />
      </g>

      {/* caption bar */}
      <rect x="2" y="430" width="516" height="48" rx="0" fill="#173B2B" aria-hidden="true" />
      <text x="262" y="460" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="17" fill="#F5F1E6">
        Order Lepidoptera · Specimen Collection No. 001
      </text>
      </svg>
    </div>
  )
}