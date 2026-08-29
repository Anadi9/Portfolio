import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import remarkPostData from "./src/lib/remark-post-data.mjs";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    // `enforce: 'pre'` puts MDX ahead of the React plugin, which otherwise
    // never sees the JSX the compiler emits. GFM is what makes pipe tables and
    // strikethrough work — a comparison table is the whole payload of a page
    // like the cheat sheet, so it is not optional. `rehype-slug` gives every
    // heading an id, which is what lets a long page — the 100-prompt playbook
    // above all — link to its own sections. `remarkPostData` runs last, after
    // the frontmatter plugins have consumed their node, and exports the same
    // ids as a list — plus a prose word count — so the notes rail can render
    // its table of contents and a reading estimate on the server rather than
    // discovering them from the DOM after mount.
    { enforce: "pre" as const, ...mdx({
      remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "frontmatter" }], remarkGfm, remarkPostData],
      rehypePlugins: [rehypeSlug],
    }) },
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssgOptions: {
    // The router is client-side after hydration; `dirStyle: 'nested'` writes
    // /notes/index.html rather than /notes.html so a plain static host serves
    // the canonical trailing-slash-free URL without rewrite rules.
    dirStyle: "nested",
    formatting: "minify",
  },
}));
