import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LNB from '@/common/components/LNB';
import { useAuth } from '@/features';

interface ProfileMenuItem {
  label: string;
  onClick: () => void;
  isTestUser?: boolean;
  adminOnly?: boolean;
  danger?: boolean;
}

export default function Header({ handleLogout }: { handleLogout: () => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { meInfo } = useAuth();

  const profileInitial = useMemo(() => {
    const normalizedName = meInfo?.name.trim();
    if (!normalizedName) {
      return 'U';
    }

    return normalizedName[0].toUpperCase();
  }, [meInfo?.name]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const closeProfileMenuOnOutsideClick = (event: MouseEvent) => {
      const menuContainer = profileMenuContainerRef.current;
      if (!menuContainer) {
        return;
      }

      if (event.target instanceof Node && !menuContainer.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    const closeProfileMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeProfileMenuOnOutsideClick);
    document.addEventListener('keydown', closeProfileMenuOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeProfileMenuOnOutsideClick);
      document.removeEventListener('keydown', closeProfileMenuOnEscape);
    };
  }, [isProfileMenuOpen]);

  const handleProfileNavigation = (path: string) => {
    setIsProfileMenuOpen(false);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setIsProfileMenuOpen(false);
    handleLogout();
  };

  const profileMenuItems: ProfileMenuItem[] = [
    { label: '📝 My Page', onClick: () => handleProfileNavigation('/mypage') },
    {
      label: '📊 Flow Chart',
      onClick: () => handleProfileNavigation('/flowchart'),
      isTestUser: true,
    },
    { label: '👑 Admin', onClick: () => handleProfileNavigation('/admin'), adminOnly: true },
    { label: '☑️ Logout', onClick: handleLogoutClick, danger: true },
  ];

  const isAdminUser = meInfo?.isAdmin === true;

  const visibleProfileMenuItems = profileMenuItems.filter((item) => {
    if (isAdminUser) {
      return true;
    }

    if (item.adminOnly) {
      return false;
    }

    if (item.isTestUser && meInfo?.isTest !== true) {
      return false;
    }

    return true;
  });

  return (
    <header className="font-grand-hotel mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <img src="/src/assets/twisters_logo_260304.svg" alt="TWISTERS" className="h-15 w-35" />

        <div className="hidden min-w-0 flex-1 md:block">
          <LNB />
        </div>

        <button
          type="button"
          onClick={() => {
            setIsMobileMenuOpen((previous) => !previous);
            setIsProfileMenuOpen(false);
          }}
          className="rounded-lg border border-amber-300 px-3 py-2 text-xl font-light text-gray-700 transition hover:bg-amber-200 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls="header-mobile-lnb"
        >
          {isMobileMenuOpen ? 'Close' : 'LNB'}
        </button>

        <div ref={profileMenuContainerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((previous) => !previous)}
            className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-amber-50 transition hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            aria-controls="header-profile-menu"
            aria-label="Open account menu"
          >
            {meInfo?.profileImage ? (
              <img
                src={meInfo.profileImage}
                alt={`${meInfo.name} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-amber-900">{profileInitial}</span>
            )}
          </button>

          {isProfileMenuOpen && (
            <div
              id="header-profile-menu"
              role="menu"
              aria-label="User account menu"
              className="absolute right-0 z-20 mt-2 w-35 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg"
            >
              {visibleProfileMenuItems.map((item, index) => {
                return (
                  <button
                    type="button"
                    role="menuitem"
                    key={item.label}
                    onClick={item.onClick}
                    className={`block w-full px-4 py-3 text-left text-xl font-semibold transition ${
                      index > 0 ? 'border-t border-gray-100' : ''
                    } ${
                      item.danger
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-amber-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="header-mobile-lnb" className="mt-3 border-t border-amber-300 pt-3 md:hidden">
          <LNB onNavigate={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
}
