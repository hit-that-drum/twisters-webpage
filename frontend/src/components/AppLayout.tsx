import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="px-6 pt-6">
        <Header />
      </div>

      <main className="flex-1">
        <Outlet />
      </main>

      <div className="px-6 pb-4">
        <Footer />
      </div>
    </div>
  );
}
