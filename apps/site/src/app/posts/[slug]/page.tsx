import { getPostBySlug, getAllSlugs } from '@/lib/posts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export const generateStaticParams = async () => {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

const PostPage = async ({ params }: PostPageProps) => {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="font-sans">
      <header>
        <div className="max-w-4xl px-0 py-8">
          <nav className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-white/65 hover:text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Zpět na hlavní stránku
            </Link>
          </nav>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/75"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="mb-4 text-4xl font-bold text-white">
            {post.title}
          </h1>
          
          <div className="flex items-center text-white/55">
            <time dateTime={post.date}>
              {format(new Date(post.date), 'd. MMMM yyyy', { locale: cs })}
            </time>
          </div>
        </div>
      </header>

      <main className="max-w-4xl py-10">
        <article>
          <div className="max-w-none text-lg leading-8 text-white/82">
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

export default PostPage;
