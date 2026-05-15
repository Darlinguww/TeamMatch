import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './lib/authContext';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
