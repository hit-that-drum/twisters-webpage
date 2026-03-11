import { useState } from 'react';
import LNB from '@/common/components/LNB';

export default function Header({ handleLogout }: { handleLogout: () => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="font-grand-hotel mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <img src="/src/assets/twisters_logo_260304.svg" alt="TWISTERS" className="h-15 w-35" />

        <div className="hidden min-w-0 flex-1 md:block">
          <LNB />
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((previous) => !previous)}
          className="rounded-lg border border-amber-300 px-3 py-2 text-xl font-light text-gray-700 transition hover:bg-amber-200 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls="header-mobile-lnb"
        >
          {isMobileMenuOpen ? 'Close' : 'LNB'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-lg bg-amber-300 px-4 py-2 text-xl font-light text-white transition hover:bg-amber-200"
        >
          Logout
        </button>
      </div>

      {isMobileMenuOpen && (
        <div id="header-mobile-lnb" className="mt-3 border-t border-amber-300 pt-3 md:hidden">
          <LNB onNavigate={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
