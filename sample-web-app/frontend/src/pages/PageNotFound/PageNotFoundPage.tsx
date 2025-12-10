import React, { FC } from 'react';
import oopsImg from '../../assets/error404.svg';
import { useNavigate } from 'react-router-dom';
import './PageNotFoundPage.css';

const PageNotFound: FC = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className="main-container">
      <div className="inner-container">
        <div className="img">
          <img src={oopsImg} alt="Robot sitting with 'Oops!' sign" />
        </div>
        <section className="nf-content">
          <h1 id="nf-title" className="nf-code">
            404
          </h1>
          <h2 className="nf-heading">Page not found</h2>
          <p className="nf-desc">
            The URL you entered doesn’t exist, please check the URL and try again.
          </p>
          <button
            className="back-btn"
            type="button"
            onClick={handleBackClick}
            aria-label="Back to Home"
          >
            Back to Home
          </button>
        </section>
      </div>
    </div>
  );
};

export default PageNotFound;