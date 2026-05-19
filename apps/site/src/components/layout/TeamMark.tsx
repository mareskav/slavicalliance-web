import Image from "next/image"

export const TeamMark = () => {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/slavic_alliance.svg"
        alt="Slavic Alliance"
        width={58}
        height={58}
        className="h-16 w-16 object-contain"
        priority
      />

      <div className="min-w-0">
        <div className="truncate text-lg font-semibold tracking-tight text-white">
          Slavic Alliance
        </div>
      </div>
    </div>
  )
}
