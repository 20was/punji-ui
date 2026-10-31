// Read-only development adapter: use the established full portal shell while
// package-owned utility pages live here. No consumer source files are written.
import { createServer, loadConfigFromFile } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { utilityPages, calendarPages } from '../portal/registry.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const web = resolve(process.env.PUNJI_WEB_DIR ?? resolve(root, '../punji-web'));
if (!existsSync(resolve(web, 'vite.config.ts'))) throw new Error('Set PUNJI_WEB_DIR to the consumer checkout containing the full docs portal');
const loaded = await loadConfigFromFile({command:'serve',mode:'design'}, resolve(web,'vite.config.ts'));
if (!loaded) throw new Error('Unable to load the full portal configuration');
// Generated code only ever embeds plain identifiers and route paths. `lit` rejects anything else
// instead of escaping it, and module files are reached through constant module names, so no
// file-system path is ever written into generated source.
const lit = (value) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_/-]+$/.test(value)) throw new Error('Portal bridge: unsafe literal in generated code');
  return `'${value}'`;
};
const inject = (source, marker, replacement) => {
  if (source.split(marker).length !== 2) throw new Error(`Portal bridge target changed: ${marker}`);
  return source.replace(marker,replacement);
};
const bridge = {
  name:'punji-package-docs', enforce:'pre',
  transform(source, id) {
    const file = id.split('?')[0];
    // Local package Select/Field/CompanySearch styling takes precedence; retain legacy preview rules as fallback.
    if(file===resolve(web,'src/styles/kit.css')) {
      const selectStart=source.indexOf('/* Select: a real <select>'),selectEnd=source.indexOf('/* Status pill. */',selectStart);
      const fieldsStart=source.indexOf('/* Fields (design.punji.app/components/field):'),fieldsEnd=source.indexOf("/* A page's main action,",fieldsStart);
      const searchStart=source.indexOf('/* The company finder (CompanySearch):'),searchEnd=source.indexOf("/* A list's own filter",searchStart);
      if(selectStart<0||selectEnd<selectStart||fieldsStart<0||fieldsEnd<fieldsStart||searchStart<0||searchEnd<searchStart)throw new Error('Legacy Select/Field/CompanySearch CSS boundary changed');
      return `@layer theme, base, components, utilities, punji.legacy, punji.tokens, punji.components;\n${source.slice(0,selectStart)}@layer punji.legacy {${source.slice(selectStart,selectEnd)}}\n${source.slice(selectEnd,fieldsStart)}@layer punji.legacy {${source.slice(fieldsStart,fieldsEnd)}}\n${source.slice(fieldsEnd,searchStart)}@layer punji.legacy {${source.slice(searchStart,searchEnd)}}\n${source.slice(searchEnd)}`;
    }

    if(file===resolve(web,'src/styles/kit-filter.css')) {
      const tableStart=source.indexOf('/* ── DataTable options ── */');
      if(tableStart<0)throw new Error('Legacy DataTable CSS boundary changed');
      return `${source.slice(0,tableStart)}\n@layer punji.legacy {${source.slice(tableStart)}}`;
    }

    if(file===resolve(web,'src/design/pages/inputs.tsx')) {
      const original="import { Button, Checkbox, Chip, ChipRow, CompanySearch, DateField, Field, PriceField, NumberField, SegmentedControl, Select, SelectField, StatusPill, Switch, SymbolField, Tabs, TextAreaField } from '@punji/ui';";
      const replacement="import { Button, Checkbox, Chip, ChipRow, SegmentedControl, Select, StatusPill, Switch, Tabs } from '@punji/ui';\nimport { CompanySearch } from '@punji/package-company-search';\nimport { DateField, Field, PriceField, NumberField, SelectField, SymbolField, TextAreaField } from '@punji/package-fields';\nimport '@punji/package-tokens.css';\nimport '@punji/package-company-search.css';\nimport '@punji/package-fields.css';";
      return inject(source,original,replacement);
    }

    if(file===resolve(web,'src/design/pages/display.tsx')) {
      const original="import { Button, Card, Cell, CountBadge, DataListRow, DataRow, DataRows, DataTable, Delta, Figure, GroupedCell, LiveFigure, LockedCell, LockedHead, LockedNote, MonthGrid, RowList, StatGrid, StatTile, StatusPill, Tile, ValueRow, type SortDir } from '@punji/ui';";
      const replacement="import { Button, Card, CountBadge, DataRow, DataRows, Delta, Figure, GroupedCell, LiveFigure, LockedCell, LockedHead, LockedNote, MonthGrid, RowList, StatGrid, StatTile, StatusPill, Tile, ValueRow } from '@punji/ui';\nimport { Cell, DataListRow, DataTable, type SortDir } from '@punji/package-table';\nimport '@punji/package-tokens.css';\nimport '@punji/package-table.css';";
      return inject(source,original,replacement);
    }

    if (file === resolve(web,'src/design/registry.ts')) {
      const pages = [...utilityPages,...calendarPages].map(({view: _view,...page})=>page);
      const entry = source.split('\n').find(line=>line.startsWith("  { path: '/components/select',"));
      if(!entry)throw new Error('Select registry entry changed');
      const registry = inject(source,entry,"  { path: '/components/select', title: 'Select', group: 'Inputs', summary: 'Punji dropdowns with native form semantics and platform fallback.', sections: [{id:'examples',title:'Working examples'},{id:'api',title:'API reference'},{id:'contracts',title:'Behaviour and compatibility'}] },");
      return inject(registry,'export const PAGES: readonly DocPage[] = [',`export const PAGES: readonly DocPage[] = [\n...${JSON.stringify(pages)},`);
    }
    if (file === resolve(web,'src/design/App.tsx')) {
      const routes = utilityPages.map(page=>`${lit(page.path)}: page(() => import('@punji/portal-pages'), ${lit(page.view)}),`).join('\n');
      const withCalendar = inject(source, "  '/get-started/roadmap': page(() => import('./pages/docs'), 'Roadmap'),", `  '/get-started/roadmap': page(() => import('@punji/portal-calendar-pages'), 'PackageRoadmapPage'),`);
      const calendarRoutes = calendarPages.map(page=>`${lit(page.path)}: page(() => import('@punji/portal-calendar-pages'), ${lit(page.view)}),`).join('\n');
      const withSelect = inject(withCalendar,"  '/components/select': page(() => import('./pages/inputs'), 'SelectPage'),", `  '/components/select': page(() => import('@punji/portal-select-page'), 'SelectComponentPage'),`);
      return inject(withSelect,'const VIEWS: Record<string, LazyExoticComponent<ComponentType>> = {',`const VIEWS: Record<string, LazyExoticComponent<ComponentType>> = {\n${routes}\n${calendarRoutes}`);
    }
  },
};
const server = await createServer({
  ...loaded.config, configFile:false, root:web,
  plugins:[bridge,...(loaded.config.plugins ?? [])],
  resolve:{...loaded.config.resolve,dedupe:['react','react-dom'],alias:[
    {find:'@punji/portal-calendar-pages',replacement:resolve(root,'portal/calendar-pages.tsx')},
    {find:'@punji/portal-select-page',replacement:resolve(root,'portal/select-page.tsx')},
    {find:'@punji/portal-pages',replacement:resolve(root,'portal/pages.tsx')},
    {find:'@punji/package-company-search.css',replacement:resolve(root,'dist/css/company-search.css')},
    {find:'@punji/package-company-search',replacement:resolve(root,'dist/company-search/CompanySearch.js')},
    {find:'@punji/package-table.css',replacement:resolve(root,'dist/css/table.css')},
    {find:'@punji/package-table',replacement:resolve(root,'dist/table/Table.js')},
    {find:'@punji/package-fields.css',replacement:resolve(root,'dist/css/fields.css')},
    {find:'@punji/package-fields',replacement:resolve(root,'dist/fields/Fields.js')},
    {find:'@punji/package-select.css',replacement:resolve(root,'dist/css/select.css')},
    {find:'@punji/package-select',replacement:resolve(root,'dist/select/Select.js')},
    {find:'@punji/package-datepicker',replacement:resolve(root,'dist/date-picker/DatePicker.js')},
    {find:'@punji/package-popover.css',replacement:resolve(root,'dist/css/popover.css')},
    {find:'@punji/package-fields.css',replacement:resolve(root,'dist/css/fields.css')},
    {find:'@punji/package-tokens.css',replacement:resolve(root,'dist/tokens.css')},
    {find:'@punji/package-calendar.css',replacement:resolve(root,'dist/css/calendar.css')},
    {find:'@punji/package-calendar',replacement:resolve(root,'dist/calendar/Calendar.js')},
    {find:'@punji/portal-parts',replacement:resolve(web,'src/design/parts.tsx')},
    {find:'@punji/package-utilities',replacement:resolve(root,'dist/nepal/nepal.js')},
    {find:'@punji/package-media',replacement:resolve(root,'dist/use-media-query/useMediaQuery.js')},
    {find:'@punji/package-hydrated',replacement:resolve(root,'dist/use-hydrated/useHydrated.js')},
    {find:'@punji/package-order',replacement:resolve(root,'dist/stable-order/useStableOrder.js')},
    ...(loaded.config.resolve?.alias ?? []),
  ]},
  server:{...loaded.config.server,host:'127.0.0.1',port:Number(process.env.PORTAL_PORT ?? 5184),strictPort:true,fs:{allow:[root,web]}},
});
await server.listen();
console.log(`Full Punji UI portal: http://design.localhost:${server.config.server.port}/utilities/financial-formatters`);
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{await server.close();process.exit(0);});
