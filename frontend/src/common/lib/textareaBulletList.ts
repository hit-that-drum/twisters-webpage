import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

const MAX_BULLET_TAB_DEPTH = 3;
const BULLET_PREFIX_PATTERN = /^(\t{0,3})(?:[-*]|•)\s*/;
const LIST_PREFIX_PATTERN = /^(\t{0,3}(?:[-*]|•)\s+)/;

export const handleBulletListKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
  if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  const lineStart = target.value.lastIndexOf('\n', Math.max(target.selectionStart - 1, 0)) + 1;
  const lineEnd = target.value.indexOf('\n', target.selectionStart);
  const currentLine = target.value.slice(
    lineStart,
    lineEnd === -1 ? target.value.length : lineEnd,
  );

  if (event.key === 'Tab') {
    const lineMatch = currentLine.match(BULLET_PREFIX_PATTERN);

    if (!lineMatch) {
      return;
    }

    event.preventDefault();

    if (target.selectionStart !== target.selectionEnd) {
      return;
    }

    const currentPrefix = lineMatch[0];
    const currentDepth = lineMatch[1].length;
    const contentWithoutPrefix = currentLine.slice(currentPrefix.length);
    const nextDepth = event.shiftKey
      ? Math.max(currentDepth - 1, 0)
      : currentPrefix.includes('•')
        ? Math.min(currentDepth + 1, MAX_BULLET_TAB_DEPTH)
        : currentDepth;
    const nextPrefix = `${'\t'.repeat(nextDepth)}• `;
    const nextLine = `${nextPrefix}${contentWithoutPrefix}`;

    if (nextLine === currentLine) {
      return;
    }

    const previousCaretOffset = target.selectionStart - lineStart;
    const nextCaretOffset =
      previousCaretOffset <= currentPrefix.length
        ? nextPrefix.length
        : previousCaretOffset - currentPrefix.length + nextPrefix.length;

    target.setRangeText(
      nextLine,
      lineStart,
      lineEnd === -1 ? target.value.length : lineEnd,
      'start',
    );
    target.setSelectionRange(lineStart + nextCaretOffset, lineStart + nextCaretOffset);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (event.key !== 'Enter' || event.shiftKey || target.selectionStart !== target.selectionEnd) {
    return;
  }

  const listPrefix = currentLine.match(LIST_PREFIX_PATTERN)?.[1];

  if (!listPrefix) {
    return;
  }

  event.preventDefault();
  target.setRangeText(`\n${listPrefix}`, target.selectionStart, target.selectionEnd, 'end');
  target.dispatchEvent(new Event('input', { bubbles: true }));
};
