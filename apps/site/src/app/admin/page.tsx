"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { PAGES } from "./pages-config"

const AdminIndexPage = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/admin/${PAGES[0].slug}`)
  }, [router])

  return null
}

export default AdminIndexPage
