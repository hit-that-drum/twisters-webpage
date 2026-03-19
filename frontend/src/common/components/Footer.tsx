import { RiFlowerFill } from 'react-icons/ri';
import { PiFlowerLotusBold, PiFlowerTulipBold } from 'react-icons/pi';
import { TbFlowerFilled } from 'react-icons/tb';

const legalLinks = [
  { label: 'Privacy', href: '#' },
  { label: 'Terms', href: '#' },
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
    <footer className="bg-[#f4d14f] px-6 pb-10 pt-10 md:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-white-900/80 md:justify-start md:gap-8 md:text-sm">
            <span className="text-white font-extrabold">TWISTERS © {currentYear}</span>
            {legalLinks.map((link) => (
              <a
                key={link.label}
                className="text-white transition-colors hover:text-white-700"
                href={link.href}
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;

              return (
                <a
                  key={social.label}
                  aria-label={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black transition-transform hover:-translate-y-0.5 md:h-10 md:w-10"
                  href={social.href}
                  target="_blank"
                >
                  <Icon className="text-sm" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
