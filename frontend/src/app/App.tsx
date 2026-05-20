import { ThemeProvider } from 'next-themes';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './lib/authContext';
import { SettingsProvider } from './lib/settingsContext';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="teammatch-theme">
      <SettingsProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
