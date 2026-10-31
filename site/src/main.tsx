import { createRoot } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- the library's CSS distribution is a public API
import '@punji/ui/styles.css';
// oxlint-disable-next-line import/no-unassigned-import -- site styles
import './styles.css';
import { App } from './app/App.tsx';

createRoot(document.getElementById('root')!).render(<App />);
