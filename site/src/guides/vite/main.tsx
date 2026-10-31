// src/main.tsx of a Vite React + TypeScript app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@punji/ui/styles.css';
import { Button } from '@punji/ui/button';
import { MoneyDisplay } from '@punji/ui/money-display';

function App() {
  return (
    <main>
      <p>
        Balance <MoneyDisplay value={250_000_00n} currency="USD" locale="en-US" />
      </p>
      <Button onClick={() => window.print()}>Print statement</Button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
