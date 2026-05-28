import type { Metadata } from "next"

import { QuizReservationsClient } from "./QuizReservationsClient"

export const metadata: Metadata = {
  title: "Kvízy",
  description: "Najdi, kdy jdou týmy na Hospodský kvíz."
}

const KvizyPage = () => {
  return (
    <div className="space-y-5 font-sans">
      <section>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-4xl">Kvízy</h1>
        <p className="mt-3 max-w-3xl text-base font-medium leading-6 text-white/58 sm:text-lg">
          Najdi, kdy jdou jednotlivé týmy na Hospodský kvíz
        </p>
      </section>

      <QuizReservationsClient />
    </div>
  )
}

export default KvizyPage
