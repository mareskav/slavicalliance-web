import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'contents/posts');

export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  content: string;
}

export const getAllPosts = (): Post[] => {
  try {
    // Zkontrolujeme, jestli adresář existuje
    if (!fs.existsSync(postsDirectory)) {
      console.warn('Posts directory does not exist:', postsDirectory);
      return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    const posts = fileNames
      .filter(name => name.endsWith('.md'))
      .map(name => {
        const slug = name.replace(/\.md$/, '');
        return getPostBySlug(slug);
      })
      .filter(Boolean) as Post[];

    // Seřadíme podle data (nejnovější první)
    return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error reading posts:', error);
    return [];
  }
}

export const getPostBySlug = (slug: string): Post | null => {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);

    if (!fs.existsSync(fullPath)) {
      console.warn('Post file does not exist:', fullPath);
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || '',
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || '',
      tags: data.tags || [],
      content,
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

export const getAllSlugs = (): string[] => {
  try {
    if (!fs.existsSync(postsDirectory)) {
      return [];
    }

    const fileNames = fs.readdirSync(postsDirectory);
    return fileNames
      .filter(name => name.endsWith('.md'))
      .map(name => name.replace(/\.md$/, ''));
  } catch (error) {
    console.error('Error reading slugs:', error);
    return [];
  }
}
