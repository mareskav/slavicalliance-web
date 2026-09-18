import PageEditor from "../PageEditor"
import { PAGES } from "../pages-config"

type AdminPageEditorRouteProps = {
  params: Promise<{ slug: string }>
}

export const generateStaticParams = async () => {
  return PAGES.map((page) => ({ slug: page.slug }))
}

const AdminPageEditorRoute = async ({ params }: AdminPageEditorRouteProps) => {
  const { slug } = await params
  return <PageEditor key={slug} slug={slug} />
}

export default AdminPageEditorRoute
