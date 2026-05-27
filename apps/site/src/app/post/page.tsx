"use client";

import { format } from "date-fns";
import { cs } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  cover?: string;
  content: string;
}

const fallbackHello: Post = {
  slug: "hello",
  title: "Hello Slavic Alliance",
  date: "2026-02-15T12:00:00.000Z",
  excerpt: "První článek z Markdownu.",
  tags: ["intro"],
  content: "Nazdar! Tohle je první post.",
};

const slugFromPath = () => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] === "posts" ? parts[1] || "" : new URLSearchParams(window.location.search).get("slug") || "";
};

const PostPage = () => {
  const [slug] = useState(() => (typeof window === "undefined" ? "" : slugFromPath()));
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await fetch(`/api/content/posts/${encodeURIComponent(slug)}`);
        if (!response.ok) {
          throw new Error("Post not found.");
        }

        setPost(await response.json());
      } catch {
        if (slug === "hello") {
          setPost(fallbackHello);
          return;
        }

        setError("Článek nebyl nalezen.");
      }
    };

    if (slug) void loadPost();
  }, [slug]);

  if (!slug || error) {
    return <p className="text-white/70">{error}</p>;
  }

  if (!post) {
    return <p className="text-white/70">Načítám článek...</p>;
  }

  return (
    <div className="font-sans">
      <header>
        <div className="max-w-4xl px-0 py-8">
          <nav className="mb-4">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-white/65 hover:text-white">
              Zpět na hlavní stránku
            </Link>
          </nav>

          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="sa-chip">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="mb-4 text-4xl font-bold text-white">{post.title}</h1>

          <div className="flex items-center text-white/55">
            <time dateTime={post.date}>{format(new Date(post.date), "d. MMMM yyyy", { locale: cs })}</time>
          </div>
        </div>
      </header>

      <main className="max-w-4xl py-10">
        {post.cover ? (
          <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
            <Image src={post.cover} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : null}

        <article>
          <div className="max-w-none text-lg leading-8 text-white/82">
            {post.content.split("\n").map((paragraph, index) => {
              if (paragraph.trim() === "") return <br key={index} />;
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
};

export default PostPage;
