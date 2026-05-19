import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features';

interface LnbMenuItem {
  to: string;
  label: string;
  adminOnly?: boolean;
}

interface LnbProps {
  onNavigate?: () => void;
  /**
   * Layout direction:
   *  - 'horizontal' (default): items in a row, used in the desktop header.
   *  - 'vertical': items stacked, used inside the mobile drawer.
   */
  direction?: 'horizontal' | 'vertical';
}

export default function LNB({ onNavigate, direction = 'horizontal' }: LnbProps) {
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

  const isVertical = direction === 'vertical';

  const navClassName = isVertical
    ? 'flex flex-col gap-1'
    : 'flex items-center justify-around gap-1 overflow-x-auto';

  const linkBaseClassName = isVertical
    ? 'block whitespace-nowrap rounded-lg px-4 py-3 text-2xl font-light transition'
    : 'whitespace-nowrap rounded-lg px-3 py-2 text-3xl font-light transition';

  return (
    <div className={isVertical ? 'w-full' : 'mx-auto max-w-5xl'}>
      <nav aria-label="Main navigation" className={navClassName}>
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${linkBaseClassName} ${
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
