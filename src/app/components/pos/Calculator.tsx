import React, { useState, useEffect, useCallback } from 'react';
import { Delete } from 'lucide-react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = useCallback((n: string) => {
    setDisplay(prev => (prev === '0' ? n : prev + n));
  }, []);

  const handleOperator = useCallback((op: string) => {
    setDisplay(prev => {
      setEquation(prev + ' ' + op + ' ');
      return '0';
    });
  }, []);

  const calculate = useCallback(() => {
    try {
      setDisplay(prev => {
        // Basic math calculation using Function for safety
        const mathEquation = (equation + prev)
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/%/g, '/100');
        
        const result = new Function(`return ${mathEquation}`)();
        setEquation('');
        return String(Number(result.toFixed(8))); // Fix precision issues
      });
    } catch {
      setDisplay('Error');
    }
  }, [equation]);

  const clear = useCallback(() => {
    setDisplay('0');
    setEquation('');
  }, []);

  const backspace = useCallback(() => {
    setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      if (e.key === '.') handleNumber('.');
      if (e.key === '+') handleOperator('+');
      if (e.key === '-') handleOperator('-');
      if (e.key === '*') handleOperator('×');
      if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      }
      if (e.key === '%') handleOperator('%');
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
      }
      if (e.key === 'Backspace') backspace();
      if (e.key === 'Escape' || e.key.toLowerCase() === 'c') clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumber, handleOperator, calculate, backspace, clear]);

  const btnStyle: React.CSSProperties = {
    padding: '12px',
    fontSize: '18px',
    fontWeight: '600',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const opStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#f8fafc',
    color: '#6d28d9',
  };

  const eqStyle: React.CSSProperties = {
    ...btnStyle,
    background: '#6d28d9',
    color: '#fff',
    gridColumn: 'span 2',
  };

  return (
    <div style={{ width: '100%', padding: '10px', userSelect: 'none' }}>
      <div style={{ 
        background: '#f1f5f9', 
        padding: '15px', 
        borderRadius: '12px', 
        marginBottom: '15px',
        textAlign: 'right',
        minHeight: '90px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {equation}
        </div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {display}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <button onClick={clear} style={opStyle}>C</button>
        <button onClick={backspace} style={opStyle}><Delete size={20} /></button>
        <button onClick={() => handleOperator('%')} style={opStyle}>%</button>
        <button onClick={() => handleOperator('÷')} style={opStyle}>÷</button>

        <button onClick={() => handleNumber('7')} style={btnStyle}>7</button>
        <button onClick={() => handleNumber('8')} style={btnStyle}>8</button>
        <button onClick={() => handleNumber('9')} style={btnStyle}>9</button>
        <button onClick={() => handleOperator('×')} style={opStyle}>×</button>

        <button onClick={() => handleNumber('4')} style={btnStyle}>4</button>
        <button onClick={() => handleNumber('5')} style={btnStyle}>5</button>
        <button onClick={() => handleNumber('6')} style={btnStyle}>6</button>
        <button onClick={() => handleOperator('-')} style={opStyle}>-</button>

        <button onClick={() => handleNumber('1')} style={btnStyle}>1</button>
        <button onClick={() => handleNumber('2')} style={btnStyle}>2</button>
        <button onClick={() => handleNumber('3')} style={btnStyle}>3</button>
        <button onClick={() => handleOperator('+')} style={opStyle}>+</button>

        <button onClick={() => handleNumber('0')} style={{ ...btnStyle, gridColumn: 'span 2' }}>0</button>
        <button onClick={() => handleNumber('.')} style={btnStyle}>.</button>
        <button onClick={calculate} style={eqStyle}>=</button>
      </div>
    </div>
  );
}
