import { useEffect, useRef, useState } from 'react';

// Custom dropdown with a rounded option list. Native <select> option panels
// are rendered by the OS and can't be styled, so this replaces them where
// the rounded look matters. API mirrors <select>: value, onChange, options
// as [{ value, label }], placeholder, disabled.
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  disabled = false,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (o) => {
    onChange(o.value);
    setOpen(false);
  };

  return (
    <div className={`select-box ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="select-box-trigger"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span
          className="select-option-label"
          style={selected ? undefined : { color: 'var(--muted-2)' }}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg className="select-box-chevron" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="select-box-pop" role="listbox">
          {options.length === 0 ? (
            <div className="select-option select-option-muted" role="option" aria-disabled="true">
              No options available
            </div>
          ) : (
            options.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`select-option ${o.value === value ? 'selected' : ''}`}
                role="option"
                aria-selected={o.value === value}
                onClick={() => choose(o)}
              >
                <span className="select-option-label">{o.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}