import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { formatDateTime, formatRelativeTime } from '@/common/lib/api/apiHelpers';

interface ToggleableTimeProps {
  /**
   * Raw ISO/parseable date string. Used as the canonical machine-readable
   * value (`dateTime` attribute) and as input to both formatters.
   */
  rawDate: string;
  /**
   * Optional extra classes appended to the default `cursor-pointer`.
   * Useful for callers that want underline/hover styles or font tweaks.
   */
  className?: string;
}

/**
 * Inline time element that shows a Korean relative time by default
 * ("5분 전", "3시간 전", "2일 전") and toggles to the absolute
 * `YYYY-MM-DD HH:mm:ss` form on click. Works on touch devices where
 * hover-based tooltips are unavailable.
 *
 * Keyboard activation: Enter or Space toggles the display.
 */
export default function ToggleableTime({ rawDate, className }: ToggleableTimeProps) {
  const [showAbsolute, setShowAbsolute] = useState(false);

  const toggle = () => setShowAbsolute((previous) => !previous);

  const handleClick = (event: MouseEvent<HTMLTimeElement>) => {
    // Prevent activating ancestor click handlers (e.g. a parent card that
    // opens a modal or navigates) when the user only meant to toggle.
    event.stopPropagation();
    toggle();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTimeElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }
  };

  const displayText = showAbsolute ? formatDateTime(rawDate) : formatRelativeTime(rawDate);

  return (
    <time
      dateTime={rawDate}
      role="button"
      tabIndex={0}
      aria-label={
        showAbsolute
          ? `정확한 시간 ${displayText} — 클릭하면 상대시간으로 변경됩니다.`
          : `${displayText} — 클릭하면 정확한 시간을 볼 수 있습니다.`
      }
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className ? `cursor-pointer ${className}` : 'cursor-pointer'}
    >
      {displayText}
    </time>
  );
}
