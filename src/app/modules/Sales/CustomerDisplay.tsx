import { useState, useEffect } from 'react';

// Exactly matching the POS design tokens
const C = {
  bg: '#f1f5f9',
  surface: '#FFFFFF',
  border: '#e2e8f0',
  text: '#1e1b4b',
  textSub: '#334155',
  textMuted: '#64748b',
  primary: '#6d28d9',
  primaryLight: '#ede9fe',
  primaryBorder: '#ddd6fe',
  green: '#059669',
  red: '#dc2626',
  amber: '#d97706',
};

export function CustomerDisplay() {
  const [data, setData] = useState<any>({
    cart: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    itemCount: 0,
    customerName: 'Walk-in Customer',
    branchName: '',
    staffName: null,
    currencySymbol: '₨',
    activePayMode: 'cash',
    multiPayTotal: 0,
  });

  useEffect(() => {
  // Load from localStorage first
  try {
    const savedData = localStorage.getItem('pos_cart_data');
    if (savedData) {
      setData(JSON.parse(savedData));
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }

  // Then listen for real-time updates
  const channel = new BroadcastChannel('pos_sync');
  
  channel.onmessage = (event) => {
    if (event.data.type === 'UPDATE_CART') {
      setData(event.data.payload);
    }
  };

  return () => channel.close();
}, []);

  const format = (val: number) => `${data.currencySymbol} ${(val || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalToPay = data.multiPayTotal || data.total;

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: C.bg,
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      color: C.text,
      overflow: 'hidden',
    }}>
      
      {/* ── POS Style Header ── */}
      <div
  style={{
    background: C.surface,
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `2px solid ${C.border}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    position: 'relative',
    minHeight: 72,
  }}
>
  {/* ── Left Section ── */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      zIndex: 2,
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: C.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 10px ${C.primary}40`,
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize: '20px',
          fontWeight: 700,
        }}
      >
        ✨
      </span>
    </div>

    <div>
      <h1
        style={{
          fontSize: '16px',
          fontWeight: 800,
          margin: 0,
          color: C.text,
          letterSpacing: '-0.3px',
        }}
      >
        {data.branchName || 'SALON POS'}
      </h1>

      <p
        style={{
          fontSize: '11px',
          margin: '2px 0 0',
          color: C.textMuted,
          fontWeight: 600,
        }}
      >
        {data.customerName}
      </p>
    </div>
  </div>

  {/* ── Center Welcome Section ── */}
  <div
    style={{
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}
  >
    <span
      style={{
        fontSize: '32px',
        fontWeight: 700,
        color: C.primary,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      Welcome
    </span>

    
  </div>

  {/* ── Right Section ── */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      zIndex: 2,
    }}
  >
    {/* Live Time */}
    <div
      style={{
        padding: '6px 12px',
        borderRadius: 10,
        background: '#f8fafc',
        border: `1px solid ${C.border}`,
        fontSize: '11px',
        fontWeight: 700,
        color: C.textSub,
      }}
    >
      {new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </div>

    {/* Staff Badge */}
    {data.staffName && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 12px',
          height: 34,
          borderRadius: 10,
          background: C.primaryLight,
          border: `1px solid ${C.primaryBorder}`,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: C.primary,
          }}
        />

        <span
          style={{
            fontSize: '10px',
            color: C.primary,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Served by: {data.staffName}
        </span>
      </div>
    )}
  </div>
</div>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: 'flex', padding: '12px', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left Section: Order Details (Mimicking POS Cart Panel) */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
          <div style={{
            flex: 1,
            background: C.surface,
            borderRadius: '14px',
            border: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}>
            {/* Header for Items */}
            <div style={{ padding: '10px 16px', background: '#fcfcfd', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '13px', color: C.text }}>Selected Items</span>
              <span style={{
                background: C.amber, color: '#fff', borderRadius: 20,
                fontSize: '10px', fontWeight: 700, padding: '2px 8px',
              }}>{data.itemCount} Items</span>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
              {data.cart.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.6 }}>
                   <div style={{ fontSize: '40px' }}>🛒</div>
                   <p style={{ fontSize: '13px', fontWeight: 600, color: C.textMuted }}>Your basket is empty</p>
                </div>
              ) : (
                data.cart.map((ci: any, idx: number) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '12px', fontWeight: 600, color: C.text, margin: 0,
                        textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>{ci.item.name}</p>
                      <p style={{ fontSize: '11px', color: C.textMuted, margin: '2px 0 0', fontWeight: 500 }}>
                        QTY: {ci.quantity} × {format(ci.item.price)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px', color: C.primary }}>
                      {format(ci.item.price * ci.quantity)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals Section (Mimicking POS Totals) */}
            <div style={{ padding: '12px 16px', borderTop: `2px solid ${C.border}`, background: '#fcfcfd' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <TotalRowSmall label="SUBTOTAL" value={data.subtotal} format={format} />
                <TotalRowSmall label="DISCOUNT (-)" value={data.discount} accent={C.green} format={format} />
                <TotalRowSmall label="ORDER TAX (+)" value={data.tax} accent={C.amber} format={format} />
                
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 4, paddingTop: 4, borderTop: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase' }}>
                    Total Payable
                  </span>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: C.text, letterSpacing: '-0.5px' }}>
                    {format(data.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Payment Bar (The Orange bar you liked) */}
            <div style={{
              background: '#6d28d9',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              color: '#fff',
            }}>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Paying</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{format(totalToPay)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', opacity: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Return</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{format(Math.max(0, totalToPay - data.total))}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', opacity: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Balance</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fecaca' }}>{format(0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Promotion & Thank You */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Promo Box */}
          <div style={{
            flex: 1,
            background: C.surface,
            borderRadius: '14px',
            border: `1px solid ${C.border}`,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            position: 'relative'
          }}>
             <img 
              src="/promo_sale.png" 
              alt="Promotion"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.style.background = C.primaryLight;
                (e.target as HTMLImageElement).parentElement!.innerHTML += `
                  <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; color: ${C.primary}">
                    <div style="font-size: 50px;">🛍️</div>
                    <h3 style="font-size: 18px; font-weight: 800; margin: 10px 0 0;">Special Styling</h3>
                    <p style="font-size: 13px; font-weight: 500; opacity: 0.8;">Exclusive deals for our regular customers!</p>
                  </div>
                `;
              }}
            />
          </div>

          {/* Simple Thank You Box */}
          <div style={{
            padding: '16px',
            background: C.primary,
            borderRadius: '14px',
            color: '#fff',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Thank You for Visiting!</p>
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.8, fontWeight: 500 }}>We hope to see you again soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalRowSmall({ label, value, accent, format }: { label: string; value: number; accent?: string; format: (v: number) => string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: C.textSub, fontWeight: 600, letterSpacing: '0.4px' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: accent ?? C.textSub }}>
        {format(value)}
      </span>
    </div>
  );
}