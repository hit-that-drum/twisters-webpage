import { Link } from 'react-router-dom';
import { RiFlowerFill } from 'react-icons/ri';
import { PiFlowerLotusBold, PiFlowerTulipBold } from 'react-icons/pi';
import { TbFlowerFilled } from 'react-icons/tb';

const legalLinks = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
];

const socialLinks = [
  {
    label: 'RiFlowerFill',
    href: 'https://youtu.be/rMcoIEx1jg8?si=aVGagWYBEhK7RdbM',
    icon: RiFlowerFill,
  },
  {
    label: 'PiFlowerLotusBold',
    href: 'https://youtu.be/Ur7aK4FvK-U?si=MgCaiiKBEZi_YbF5',
    icon: PiFlowerLotusBold,
  },
  {
    label: 'PiFloserTylipBold',
    href: 'https://youtu.be/gvXsmI3Gdq8?si=c3eCxEfD_C-DZ_Eq',
    icon: PiFlowerTulipBold,
  },
  {
    label: 'TbFlowerFilled',
    href: 'https://youtu.be/5PS2cJsSJrI?si=5r66xqJh6BdXWNmM',
    icon: TbFlowerFilled,
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#f4d14f] px-4 pb-6 pt-6 md:px-12 md:pb-10 md:pt-10 lg:px-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-white-900/80 md:justify-start md:gap-8 md:text-sm">
            <span className="text-white font-extrabold">TWISTERS © {currentYear}</span>
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                className="text-white transition-colors hover:text-white-700"
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;

              return (
                <a
                  key={social.label}
                  aria-label={social.label}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition-transform hover:-translate-y-0.5 md:h-10 md:w-10"
                  href={social.href}
                  target="_blank"
                >
                  <Icon className="text-xs md:text-sm" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
