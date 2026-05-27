export type TeamMarkProps = {
  logoSrc?: string
}

export const TeamMark = ({ logoSrc = "/slavic_alliance.svg" }: TeamMarkProps) => {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logoSrc}
        alt="Slavic Alliance"
        width={58}
        height={58}
        className="h-16 w-16 object-contain"
      />

      <div className="min-w-0">
        <div className="truncate text-lg font-semibold tracking-tight text-white">
          Slavic Alliance
        </div>
      </div>
    </div>
  )
}
