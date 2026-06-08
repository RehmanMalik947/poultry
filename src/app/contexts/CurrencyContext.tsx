import React, { createContext, useContext, useState } from 'react';

const CURRENCY_MAP: Record<string, string> = {
  PKR: 'Rs.',
  USD: '$',
  AED: 'د.إ',
  SAR: '﷼',
  GBP: '£',
  EUR: '€',
  INR: '₹',
};

type CurrencyContextValue = {
  currency: string;
  symbol: string;
  setCurrency: (c: string) => void;
  format: (amount: number | string | null | undefined) => string;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'PKR',
  symbol: 'Rs.',
  setCurrency: () => {},
  format: (n) => `Rs.${(Number(n) || 0).toFixed(2)}`,
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(() =>
    localStorage.getItem('app_currency') ?? 'PKR'
  );

  const symbol = CURRENCY_MAP[currency] ?? 'Rs.';

  const setCurrency = (c: string) => {
    localStorage.setItem('app_currency', c);
    setCurrencyState(c);
  };

  const format = (amount: number | string | null | undefined) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    return `${symbol}${(Number(num) || 0).toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}