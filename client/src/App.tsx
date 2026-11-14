import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { EmptyNote } from './components/ui';
import HomePage from './pages/HomePage';
import { hasOnboarded } from './lib/onboarding';
import OnboardingPage from './pages/OnboardingPage';

const TaskFormPage = lazy(() => import('./pages/TaskFormPage'));
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

export default function App() {
  const location = useLocation();
  // The add/edit form is a bottom sheet: when opened from a screen, that screen
  // stays rendered underneath ("background location" pattern).
  const background = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;

  if (!hasOnboarded() && location.pathname !== '/welcome') return <Navigate to="/welcome" replace />;

  return (
    // Mobile-first column (Figma frames are 390px); wider screens get a centred column
    <div className="mx-auto min-h-dvh w-full max-w-xl bg-canvas md:border-x md:border-line">
      <Suspense fallback={null}>
        <Routes location={background ?? location}>
          <Route path="/welcome" element={<OnboardingPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          {/* direct visits to the form URLs render the home screen behind the sheet */}
          <Route path="/tasks/new" element={<HomePage />} />
          <Route path="/tasks/:id/edit" element={<HomePage />} />
          <Route
            path="*"
            element={
              <EmptyNote>
                Page not found.{' '}
                <Link className="font-medium text-brand" to="/">
                  Go home
                </Link>
              </EmptyNote>
            }
          />
        </Routes>

        <Routes>
          <Route path="/tasks/new" element={<TaskFormPage />} />
          <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
          <Route path="*" element={null} />
        </Routes>
      </Suspense>
    </div>
  );
}
