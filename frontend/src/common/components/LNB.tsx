import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features';

interface LnbMenuItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

export default function LNB({ onNavigate }: { onNavigate?: () => void }) {
  const { meInfo } = useAuth();

  const homePath = meInfo ? `/${meInfo.id}` : '/home';
  const menuItems: LnbMenuItem[] = [
    { to: homePath, label: '🏠 Home' },
    { to: '/member', label: '👥 Member' },
    { to: '/notice', label: '📢 Notice' },
    { to: '/settlement', label: '💰 Settlement' },
    { to: '/board', label: '🎲 Board' },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.adminOnly) {
      return true;
    }

    return meInfo?.isAdmin === true;
  });

  return (
    <div className="mx-auto max-w-5xl">
      <nav
        aria-label="Main navigation"
        className="flex items-center justify-around gap-1 overflow-x-auto"
      >
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-3 py-2 text-3xl font-light transition ${
                isActive
                  ? 'bg-amber-300 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
