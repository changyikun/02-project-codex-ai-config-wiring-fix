import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AttributeHelpButtonProps {
  id: string;
  label: string;
  note: string;
  open: boolean;
  onToggle: () => void;
  buttonClassName: string;
}

interface PopoverPlacement {
  left: number;
  top: number;
  width: number;
  side: 'left' | 'right';
}

const VIEWPORT_PADDING = 12;
const POPOVER_GAP = 8;
const MAX_POPOVER_WIDTH = 320;
const MIN_POPOVER_WIDTH = 220;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const resolvePlacement = (buttonRect: DOMRect, popoverHeight: number): PopoverPlacement => {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const maxWidth = Math.max(MIN_POPOVER_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);
  const width = Math.min(MAX_POPOVER_WIDTH, maxWidth);
  const rightSpace = viewportWidth - buttonRect.right - VIEWPORT_PADDING;
  const leftSpace = buttonRect.left - VIEWPORT_PADDING;
  const side = rightSpace >= width + POPOVER_GAP || rightSpace >= leftSpace ? 'right' : 'left';
  const preferredLeft = side === 'right' ? buttonRect.right + POPOVER_GAP : buttonRect.left - POPOVER_GAP - width;
  const left = clamp(preferredLeft, VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
  const estimatedHeight = popoverHeight > 0 ? popoverHeight : 96;
  const top = clamp(
    buttonRect.top + buttonRect.height / 2 - estimatedHeight / 2,
    VIEWPORT_PADDING,
    Math.max(VIEWPORT_PADDING, viewportHeight - estimatedHeight - VIEWPORT_PADDING),
  );

  return { left, top, width, side };
};

export function AttributeHelpButton({ id, label, note, open, onToggle, buttonClassName }: AttributeHelpButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPlacement(null);
      return undefined;
    }

    const updatePlacement = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) {
        return;
      }
      const popoverHeight = popoverRef.current?.getBoundingClientRect().height ?? 0;
      setPlacement(resolvePlacement(buttonRect, popoverHeight));
    };

    updatePlacement();
    const frame = window.requestAnimationFrame(updatePlacement);
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open]);

  const dialog = open
    ? createPortal(
        <div
          id={id}
          ref={popoverRef}
          role="dialog"
          className="attribute-help-popover-layer"
          data-side={placement?.side ?? 'right'}
          style={{
            left: placement ? `${placement.left}px` : `${VIEWPORT_PADDING}px`,
            top: placement ? `${placement.top}px` : `${VIEWPORT_PADDING}px`,
            width: placement ? `${placement.width}px` : `min(${MAX_POPOVER_WIDTH}px, calc(100vw - 24px))`,
            visibility: placement ? 'visible' : 'hidden',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <strong>{label}</strong>
          <span>{note}</span>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        aria-label={`查看${label}说明`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        ?
      </button>
      {dialog}
    </>
  );
}
