import { getAllPosts } from "@/lib/posts";
import { getLandingPage } from "@/lib/landing";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const renderInlineMarkdown = (text: string) => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

const LandingStory = ({ content }: { content: string }) => {
  return (
    <section className="mb-14">
      <div className="max-w-5xl space-y-9 text-white/86">
        {content
          .split(/\n\s*\n/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block, index) => {
            if (block.startsWith("# ")) {
              return (
                <h1 key={index} className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  {renderInlineMarkdown(block.replace(/^#\s+/, ""))}
                </h1>
              );
            }

            if (block.startsWith("## ")) {
              return (
                <h2 key={index} className="text-2xl font-bold text-white">
                  {renderInlineMarkdown(block.replace(/^##\s+/, ""))}
                </h2>
              );
            }

            if (block.startsWith("- ")) {
              return (
                <ul key={index} className="grid gap-2 text-lg leading-8">
                  {block.split("\n").map((item) => (
                    <li key={item}>• {renderInlineMarkdown(item.replace(/^-\s+/, ""))}</li>
                  ))}
                </ul>
              );
            }

            return (
              <p key={index} className="text-lg leading-8">
                {renderInlineMarkdown(block)}
              </p>
            );
          })}
      </div>
    </section>
  );
}

const Home = () => {
  const posts = getAllPosts();
  const landing = getLandingPage();

  return (
    <div className="font-sans">
      <LandingStory content={landing.content} />

      <section>
        <h2 className="mb-8 text-2xl font-bold text-white">📰 Nejnovější články</h2>

        {posts.length === 0 ? (
          <p className="text-white/70">Zatím nejsou k dispozici žádné články.</p>
        ) : (
          <div className="grid max-w-4xl gap-8">
            {posts.map((post) => (
              <article key={post.slug} className="text-white/82">
                <div className="mb-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-sky-100/10 px-3 py-1 text-xs font-medium text-sky-100/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h3 className="text-xl font-semibold text-white">
                  <a href={`/posts/${post.slug}`} className="hover:text-sky-100">
                    {post.title}
                  </a>
                </h3>

                <p className="mt-2 text-white/68">{post.excerpt}</p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/55">
                  <time dateTime={post.date}>
                    {format(new Date(post.date), "d. MMMM yyyy", { locale: cs })}
                  </time>
                  <a href={`/posts/${post.slug}`} className="font-medium text-sky-100/75 hover:text-white">
                    Číst více →
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
