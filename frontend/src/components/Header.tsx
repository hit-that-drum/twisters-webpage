import { useState } from 'react';
import LNB from './LNB';

export default function Header({ handleLogout }: { handleLogout: () => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <h1 className="shrink-0 text-2xl font-bold">TWISTERS</h1>

        <div className="hidden min-w-0 flex-1 md:block">
          <LNB />
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((previous) => !previous)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls="header-mobile-lnb"
        >
          {isMobileMenuOpen ? 'Close' : 'LNB'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-lg bg-[#3D5A2D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d4321]"
        >
          Logout
        </button>
      </div>

      {isMobileMenuOpen && (
        <div id="header-mobile-lnb" className="mt-3 border-t border-gray-200 pt-3 md:hidden">
          <LNB onNavigate={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
