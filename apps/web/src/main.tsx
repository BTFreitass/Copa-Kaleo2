import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import { router } from './app/router';
import { AuthProvider } from './features/auth/AuthProvider';
import { TournamentProvider } from './features/tournament/TournamentProvider';
import { LoginModal } from './features/auth/LoginModal';
import { ToastProvider } from './shared/ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <TournamentProvider>
          <RouterProvider router={router} />
          <LoginModal />
        </TournamentProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
