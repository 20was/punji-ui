import { createRoot } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- CSS distribution is a public API.
import '@punji/ui/styles.css';
// oxlint-disable-next-line import/no-unassigned-import -- Fixture layout.
import './style.css';
import { fixtures } from './manifest.ts';
import { ownStage, registry } from './fixtures.tsx';

const query = new URLSearchParams(location.search);
const id = query.get('fixture');
const theme = query.get('theme') === 'dark' ? 'dark' : 'light';
// The library's own mechanism: data-theme on an ancestor (here the root, so the page background follows).
document.documentElement.dataset.theme = theme;

const root = createRoot(document.getElementById('root')!);
const Fixture = id ? registry[id] : undefined;
if (Fixture) {
  root.render(ownStage.has(id!) ? <div data-fixture={id}><Fixture /></div> : <div className="vr-stage" data-fixture={id}><Fixture /></div>);
} else {
  root.render(<div className="vr-stage"><h1>Fixtures</h1><ul>{fixtures.map((f) => <li key={f.id}><a href={`?fixture=${f.id}&theme=${theme}`}>{f.title}</a></li>)}</ul></div>);
}
