import React, { FC, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Eagerly loaded Header Component
import Header from '../components/Header/Header';
// Lazy-loaded pages
const HomePage = lazy(() => import('../pages/Home/HomePage'));
const SuccessPage = lazy(() => import('../pages/Success/SuccessPage'));
const ErrorPage = lazy(() => import('../pages/Error/ErrorPage'));

// Route paths (type-safe)
const ROUTES = {
  HOME: '/',
  SUCCESS: '/success',
  ERROR: '/error',
} as const;

// Fallback skeleton while page loads
const PageLoader: FC = () => <div className="loader">Loading Page......</div>;

const AppRoutes: FC = () => (
  <Router>
    {/* Global Header */}
    <Header />
    {/* Lazy-loaded pages */}
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.SUCCESS} element={<SuccessPage />} />
        <Route path={ROUTES.ERROR} element={<ErrorPage />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRoutes;
