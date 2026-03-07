import AppRouter from '@/app/AppRouter';
import { AppProviders } from '@/app/AppProviders';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
