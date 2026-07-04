import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});

const games = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    bannerImg: z.string(),
    order: z.number().optional().default(999),
    description: z.string().optional(),
    demoLink: z.url().optional(),
    githubLink: z.url().optional(),
    trailerLink: z.url().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { journal, games };
