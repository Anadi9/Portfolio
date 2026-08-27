/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react';
  import type { Frontmatter } from '@/data/notes';

  export const frontmatter: Frontmatter;
  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
}
