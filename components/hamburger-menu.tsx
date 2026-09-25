'use client';

import { Menu, X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

type HamburgerMenuProps = {
  /** The navigation links and actions rendered inside the expanded panel. */
  children: ReactNode;
  /** Visible and accessible name for the menu trigger and navigation panel. */
  label?: string;
  /** Optional hook for a page-specific layout class. */
  className?: string;
};

/**
 * A small, reusable navigation disclosure that keeps arbitrary page links and
 * buttons intact while providing the expected keyboard and pointer behaviour.
 */
export function HamburgerMenu({
  children,
  label = 'القائمة',
  className,
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const menuClassName = [
    'hamburger-menu',
    isOpen ? 'is-open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={menuClassName} ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="hamburger-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        <span className="hamburger-trigger-label">{label}</span>
      </button>

      <nav
        id={panelId}
        className="hamburger-panel"
        aria-label={label}
        data-state={isOpen ? 'open' : 'closed'}
        hidden={!isOpen}
        onClick={(event) => {
          const target = event.target as Element | null;

          if (target?.closest('a, button:not(.hamburger-trigger)')) {
            setIsOpen(false);
          }
        }}
      >
        {children}
      </nav>
    </div>
  );
}

export default HamburgerMenu;
