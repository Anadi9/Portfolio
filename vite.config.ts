import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import remarkPostData from "./src/lib/remark-post-data.mjs";
import fs from "fs";
import path from "path";
import type { Plugin } from "vite";
import { vercelApiDev } from "./scripts/vite-api-dev";

// `vite preview` maps `/notes` only to `notes.html` and otherwise falls back to
// `/index.html`, so with `dirStyle: 'nested'` every page but the hub was served
// the hub's HTML and hydration failed (React #418/#423). Cloudflare's
// `html_handling: "drop-trailing-slash"` serves `notes/index.html` at `/notes`;
// this does the same in preview so it hydrates the page production serves.
const nestedHtmlPreview = (): Plugin => ({
  name: "nested-html-preview",
  configurePreviewServer(server) {
    const outDir = path.resolve(server.config.root, server.config.build.outDir);
    server.middlewares.use((req, _res, next) => {
      const [pathname, query] = (req.url ?? "").split(/(?=\?)/);
      if (pathname && !pathname.endsWith("/") && !path.extname(pathname)) {
        let decoded = pathname;
        try {
          decoded = decodeURIComponent(pathname);
        } catch {
          /* malformed escape: leave it to the default handling */
        }
        if (fs.existsSync(path.join(outDir, decoded, "index.html"))) req.url = `${pathname}/index.html${query ?? ""}`;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    // `enforce: 'pre'` puts MDX ahead of the React plugin, which otherwise
    // never sees the JSX the compiler emits. GFM is what makes pipe tables and
    // strikethrough work, and a comparison table is the whole payload of a page
    // like the cheat sheet, so it is not optional. `rehype-slug` gives every
    // heading an id, which is what lets a long page (the 100-prompt playbook
    // above all) link to its own sections. `remarkPostData` runs last, after
    // the frontmatter plugins have consumed their node, and exports the same
    // ids as a list, plus a prose word count, so the notes rail can render
    // its table of contents and a reading estimate on the server rather than
    // discovering them from the DOM after mount.
    { enforce: "pre" as const, ...mdx({
      remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: "frontmatter" }], remarkGfm, remarkPostData],
      rehypePlugins: [rehypeSlug],
    }) },
    react(),
    // `/api/*` in dev; see the plugin for what it does and doesn't emulate.
    vercelApiDev(),
    nestedHtmlPreview(),
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
