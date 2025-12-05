import React, { FC } from 'react';
import './PageNotFoundPage.css';

const PageNotFound: FC = () => {
  return (
    <div className="home-container">
      <h1>404 - Page Not Found</h1>
      <p>Oops! The page you're looking for doesn't exist.</p>
    </div>
  );
};

export default PageNotFound;
