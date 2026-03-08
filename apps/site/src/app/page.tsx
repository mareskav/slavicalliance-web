import Image from "next/image";
import { getAllPosts } from '@/lib/posts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function Home() {
  const posts = getAllPosts();
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-900">
      <header className="bg-white dark:bg-zinc-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Slavic Alliance
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Sdružení slovanských národů
          </p>
          <div className="mt-4">
            <a
              href="/admin"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Admin (CMS)
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <section>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
            Nejnovější články
          </h2>

          {posts.length === 0 ? (
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                Zatím nejsou k dispozici žádné články.
              </p>
              <a
                href="/admin"
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                Vytvořit první článek v CMS
              </a>
            </div>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <article key={post.slug} className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    <a href={`/posts/${post.slug}`} className="hover:text-blue-600 transition-colors">
                      {post.title}
                    </a>
                  </h3>

                  <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                    {post.excerpt}
                  </p>

                  <div className="flex justify-between items-center text-sm text-zinc-500 dark:text-zinc-500">
                    <time dateTime={post.date}>
                      {format(new Date(post.date), 'd. MMMM yyyy', { locale: cs })}
                    </time>
                    <a
                      href={`/posts/${post.slug}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Číst více →
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
