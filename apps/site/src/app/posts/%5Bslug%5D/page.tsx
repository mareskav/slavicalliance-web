import { getPostBySlug, getAllSlugs } from '@/lib/posts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { notFound } from 'next/navigation';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <header className="bg-white dark:bg-zinc-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <nav className="mb-4">
            <a
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Zpět na hlavní stránku
            </a>
          </nav>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            {post.title}
          </h1>
          
          <div className="flex items-center text-zinc-600 dark:text-zinc-400">
            <time dateTime={post.date}>
              {format(new Date(post.date), 'd. MMMM yyyy', { locale: cs })}
            </time>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white dark:bg-zinc-800 rounded-lg p-8 shadow-sm">
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            {post.content.split('\n').map((paragraph, index) => {
              if (paragraph.trim() === '') return <br key={index} />;
              return (
                <p key={index} className="mb-4 leading-7">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </article>
      </main>
    </div>
  );
}