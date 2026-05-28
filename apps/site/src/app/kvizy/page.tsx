import type { Metadata } from "next"

import { QuizReservationsClient } from "./QuizReservationsClient"

export const metadata: Metadata = {
  title: "Kvízy",
  description: "Najdi, kdy jdou týmy na Hospodský kvíz."
}

const KvizyPage = () => {
  return (
    <div className="space-y-10 font-sans">
      <section>
        <div className="text-sm font-bold uppercase text-sky-100/60">Hospodský kvíz</div>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Kvízy</h1>
        <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-white/62 sm:text-lg">
          Najdi, kdy jdou jednotlivé týmy na Hospodský kvíz.
        </p>
      </section>

      <QuizReservationsClient />
    </div>
  )
}

export default KvizyPage
