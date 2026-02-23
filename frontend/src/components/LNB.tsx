import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LnbMenuItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

export default function LNB({ onNavigate }: { onNavigate?: () => void }) {
  const { meInfo } = useAuth();

  const homePath = meInfo ? `/${meInfo.id}` : '/home';
  const menuItems: LnbMenuItem[] = [
    { to: homePath, label: 'Home' },
    { to: '/member', label: 'Member' },
    { to: '/notice', label: 'Notice' },
    { to: '/settlement', label: 'Settlement' },
    { to: '/mypage', label: 'My Page' },
    { to: '/admin', label: 'Admin', adminOnly: true },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.adminOnly) {
      return true;
    }

    return meInfo?.isAdmin === true;
  });

  return (
    <nav aria-label="Main navigation" className="flex items-center gap-1 overflow-x-auto">
      {visibleMenuItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? 'bg-[#3D5A2D] text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
