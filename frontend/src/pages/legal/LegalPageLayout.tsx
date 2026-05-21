import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/twisters_logo_260304.svg';

interface LegalPageLayoutProps {
  title: string;
  description?: string;
  effectiveDate: string;
  children: ReactNode;
}

export default function LegalPageLayout({
  title,
  description,
  effectiveDate,
  children,
}: LegalPageLayoutProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200 bg-white px-4 py-4 md:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="TWISTERS" className="h-8 w-auto md:h-10" />
          </Link>
          <Link
            to="/"
            className="text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 md:text-sm"
          >
            홈으로
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 md:px-8 md:py-12">
        <article className="mx-auto w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 md:p-10">
          <header className="mb-8 border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                {description}
              </p>
            )}
            <p className="mt-4 text-xs text-slate-500 md:text-sm">
              시행일자: {effectiveDate}
            </p>
          </header>

          <div className="prose-legal flex flex-col gap-8 text-sm leading-relaxed text-slate-700 md:text-[15px]">
            {children}
          </div>
        </article>
      </main>

      <footer className="bg-[#f4d14f] px-4 py-6 md:px-12 md:py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 text-[11px] font-medium text-white md:flex-row md:text-sm">
          <span className="font-extrabold">
            TWISTERS © {new Date().getFullYear()}
          </span>
          <div className="flex gap-4">
            <Link to="/privacy" className="transition-colors hover:opacity-80">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:opacity-80">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
