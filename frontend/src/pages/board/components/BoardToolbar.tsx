import { memo, useState, type FormEvent } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { BOARD_SORT_OPTIONS } from '@/pages/board/lib/boardConstants';
import type { BoardSortOption } from '@/pages/board/lib/boardTypes';

interface BoardToolbarProps {
  searchInput: string;
  sortOption: BoardSortOption;
  onSearchInputChange: (value: string) => void;
  onSortOptionChange: (value: BoardSortOption) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
}

function BoardToolbar({
  searchInput,
  sortOption,
  onSearchInputChange,
  onSortOptionChange,
  onSearchSubmit,
  onResetFilters,
}: BoardToolbarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const formId = 'board-toolbar-form';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    onSearchSubmit(event);
    setIsMobileOpen(false);
  };

  const handleReset = () => {
    onResetFilters();
    setIsMobileOpen(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsMobileOpen((previous) => !previous)}
        aria-expanded={isMobileOpen}
        aria-controls={formId}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left md:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FiSearch aria-hidden="true" size={16} />
          검색 / 필터
        </span>
        <FiChevronDown
          aria-hidden="true"
          size={18}
          className={`text-slate-500 transition-transform ${isMobileOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <form
        id={formId}
        onSubmit={handleSubmit}
        className={`grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto] ${
          isMobileOpen ? 'grid border-t border-slate-200' : 'hidden'
        } md:grid md:border-t-0`}
      >
        <input
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search title/content/author"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500"
        />

        <select
          value={sortOption}
          onChange={(event) => onSortOptionChange(event.target.value as BoardSortOption)}
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-500"
        >
          {BOARD_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="flex h-10 items-center justify-center rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          Search
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Reset
        </button>
      </form>
    </div>
  );
}

export default memo(BoardToolbar);
