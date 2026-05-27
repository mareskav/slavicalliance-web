import Image from "next/image"

type SlavicAllianceSpinnerProps = {
  logoSrc?: string
  label?: string
}

export const SlavicAllianceSpinner = ({
  logoSrc = "/slavic_alliance.svg",
  label = "Načítání",
}: SlavicAllianceSpinnerProps) => {
  return (
    <div
      className="relative flex h-28 w-28 items-center justify-center"
      role="progressbar"
      aria-label={label}
    >
      <div className="absolute inset-0 rounded-full border border-sky-200/15" />
      <div className="absolute inset-3 rounded-full border border-white/10 bg-white/3 shadow-[0_0_64px_rgba(56,189,248,0.18)]" />
      <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-sky-200 border-r-sky-300/70" />
      <Image
        src={logoSrc}
        alt=""
        width={72}
        height={72}
        priority
        className="relative h-18 w-18 object-contain drop-shadow-[0_0_22px_rgba(186,230,253,0.35)]"
        aria-hidden="true"
      />
    </div>
  )
}
