import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './index.css';
import './styles/portfolio.css';
import './styles/notes.css';

/**
 * SSG entry.
 *
 * `ViteReactSSG` renders every route in `routes` to static HTML at build time
 * and hydrates the same tree in the browser, so there is one router definition
 * and no separate server file.
 */
export const createRoot = ViteReactSSG({ routes });
