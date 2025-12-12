import React, { FC, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ROUTES } from '../constants/AppRoutes';
// Eagerly loaded Header Component
import Header from '../components/Header/Header';
// Lazy-loaded pages
const HomePage = lazy(() => import('../pages/Home/HomePage'));
const SuccessPage = lazy(() => import('../pages/Success/SuccessPage'));
const ErrorPage = lazy(() => import('../pages/Error/ErrorPage'));
const PageNotFound = lazy(() => import('../pages/PageNotFound/PageNotFoundPage'));
const SamlValidatorPage = lazy(() => import('../pages/SamlValidator/SamlValidatorPage'));

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
        {/* 404 route */}
        <Route path="*" element={<PageNotFound />} />
        <Route path={ROUTES.SAML_VALIDATOR} element={<SamlValidatorPage />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRoutes;
