import React, { FC, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import errorIcon from '../../assets/error.svg';
import codeIcon from '../../assets/code.svg';
import vectorIcon from '../../assets/vector.svg';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { initiateSamlLogin } from '../../features/home/homeSlice';
import { HomeInputState } from '../../features/home/types';
import './ErrorPage.css';

const ErrorPage: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Get data from Redux store (previously entered ACS URL and certificate)
  const homeState = useAppSelector((state) => state.home);
  const { acsUrl, publicCertificate, attributes, error } = homeState;

  // Get error data from location state or Redux, otherwise use empty strings
  const errorCode = (location.state as any)?.errorCode || '';
  const errorReason = (location.state as any)?.errorReason || error || '';

  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetrySimulation = async () => {
    // Check if we have the required data from Redux
    if (!acsUrl || !publicCertificate) {
      // If no data available, navigate to home page
      navigate('/');
      return;
    }
    setIsRetrying(true);
    // Build payload from Redux store data
    const payload: HomeInputState = {
      acsUrl,
      publicCertificate,
      attributes,
    };
    try {
      // Re-run the simulation with existing data
      const resultAction = await dispatch(initiateSamlLogin(payload));
      // Handle success / error cases
      if (initiateSamlLogin.fulfilled.match(resultAction)) {
        navigate('/success');
      } else if (initiateSamlLogin.rejected.match(resultAction)) {
        // Stay on error page with updated error info
        const errorPayload = resultAction.payload || { errorReason: 'Simulation failed. Please try again.' };
        navigate('/error', {
          state: {
            errorCode: errorPayload.errorCode || '',
            errorReason: errorPayload.errorReason || '',
          },
        });
      }
    } catch (error) {
      console.error('Error retrying simulation:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="error-page">
      <div className="error-container">
        <div className="error-header">
          <div className="error-icon">
            <img src={errorIcon} alt="Error" className="error-icon-img" />
          </div>
          <div className="error-text-wrapper">
            <h1 className="error-title">Transmission failed!</h1>
            <p className="error-submessage">SAML response transmission has failed.</p>
          </div>
        </div>
        {/* Error Code */}
        <div className="error-content">
          <div className="form-group">
            <label htmlFor="error-code" className="form-label">
              <img src={codeIcon} alt="Code" className="label-icon" />
              Error Code
            </label>
            <input
              disabled
              type="text"
              id="error-code"
              value={errorCode}
              autoComplete="off"
              className="form-input error-code-input"
            />
          </div>
          {/* Error Reason */}
          <div className="form-group">
            <label htmlFor="error-reason" className="form-label">
              <img src={vectorIcon} alt="Info" className="info-icon" />
              Error Reason
            </label>
            <textarea
              rows={4}
              disabled
              id="error-reason"
              value={errorReason}
              autoComplete="off"
              className="form-textarea error-reason-textarea"
            />
          </div>
          {/* Retry Simulation Button */}
          <div className="button-group">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetrySimulation}
              disabled={isRetrying || !acsUrl || !publicCertificate}
            >
              {isRetrying ? <span className="spinner"></span> : 'Retry Simulation'}
            </button>
          </div>
          {/* Back to Home Page Button */}
          <div className="back-link">
            <Link to="/">Back to Home Page</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
