import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { CurrencyProvider } from './contexts/CurrencyContext';
import React from 'react';

function App() {
  return (
    <CurrencyProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </CurrencyProvider>
  );
}

export default App;
