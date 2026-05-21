import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiMenu, HiX } from 'react-icons/hi';
import LNB from '@/common/components/LNB';
import { useAuth } from '@/features';
import logo from '@/assets/twisters_logo_260304.svg';

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

  // Close drawer on Escape & lock body scroll when drawer is open.
  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const closeDrawerOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeDrawerOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', closeDrawerOnEscape);
    };
  }, [isMobileMenuOpen]);

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
      label: '📊 IA',
      onClick: () => handleProfileNavigation('/information-architecture'),
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
    <header className="font-grand-hotel mb-4 rounded-2xl border border-gray-200 bg-white px-3 py-2 md:px-4 md:py-3">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => {
            setIsMobileMenuOpen(true);
            setIsProfileMenuOpen(false);
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-300 text-gray-700 transition hover:bg-amber-100 md:hidden"
          aria-expanded={isMobileMenuOpen}
          aria-controls="header-mobile-drawer"
          aria-label="Open navigation menu"
        >
          <HiMenu size={22} />
        </button>

        <img
          src={logo}
          alt="TWISTERS"
          className="h-10 w-24 shrink-0 md:h-15 md:w-35"
        />

        <div className="hidden min-w-0 flex-1 md:block">
          <LNB />
        </div>

        {/* Spacer on mobile so the avatar is pushed to the right edge */}
        <div className="flex-1 md:hidden" />

        <div ref={profileMenuContainerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((previous) => !previous)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-amber-50 transition hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 md:h-[60px] md:w-[60px]"
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
              <span className="text-base font-semibold text-amber-900 md:text-2xl">
                {profileInitial}
              </span>
            )}
          </button>

          {isProfileMenuOpen && (
            <div
              id="header-profile-menu"
              role="menu"
              aria-label="User account menu"
              className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg md:w-35"
            >
              {visibleProfileMenuItems.map((item, index) => {
                return (
                  <button
                    type="button"
                    role="menuitem"
                    key={item.label}
                    onClick={item.onClick}
                    className={`block w-full px-4 py-3 text-left text-base font-semibold transition md:text-xl ${
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

      {/* Mobile slide-in drawer (only rendered on <md) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40 backdrop-blur-[1px]"
          />

          {/* Drawer panel */}
          <aside
            id="header-mobile-drawer"
            className="absolute left-0 top-0 flex h-full w-[45%] max-w-[230px] flex-col border-r border-amber-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-amber-200 px-4 py-3">
              <img src={logo} alt="TWISTERS" className="h-10 w-24" />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300 text-gray-700 transition hover:bg-amber-100"
                aria-label="Close navigation menu"
              >
                <HiX size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <LNB
                direction="vertical"
                onNavigate={() => setIsMobileMenuOpen(false)}
              />
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
