import React, { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import downloadIcon from '../../assets/download.svg';
import greenTickIcon from '../../assets/green-tick.svg';
import linkIcon from '../../assets/link.svg';
import shieldIcon from '../../assets/shield.svg';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { initiateSamlLogin } from '../../features/home/homeSlice';
import { HomeInputState } from '../../features/home/types';
import './SuccessPage.css';

const SuccessPage: FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Fetch data from Redux store
  const homeState = useAppSelector((state) => state.home);
  const { acsUrl, publicCertificate, attributes } = homeState;

  const [isRunning, setIsRunning] = useState(false);

  const handleRunAnotherSimulation = async () => {
    // Check if we have the required data from Redux
    if (!acsUrl || !publicCertificate) {
      // If no data available, navigate to home page
      navigate('/');
      return;
    }
    setIsRunning(true);
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
        // Navigate to error page with error info
        const errorMessage = resultAction.payload || 'Simulation failed. Please try again.';
        navigate('/error', {
          state: {
            errorCode: 'SIM_ERROR',
            errorReason: errorMessage,
          },
        });
      }
    } catch (error) {
      console.error('Error running simulation:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleMetaData = () => {
    // Handle metadata action - can be implemented later
    console.log('Meta Data clicked');
  };

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-header">
          <div className="success-icon">
            <img src={greenTickIcon} alt="Success" className="success-icon-img" />
          </div>
          <div className="success-text-wrapper">
            <h1 className="success-title">Simulation Successful</h1>
            <p className="success-message">
              SAML response successfully transmitted to the test endpoint URL.
            </p>
          </div>
        </div>

        <div className="success-content">
          <div className="form-group">
            <label htmlFor="acs-url" className="form-label acs-url-label">
              <img src={linkIcon} alt="Link" className="label-icon" />
              Test ACS URL
            </label>
            <input type="text" id="acs-url" className="form-input" value={acsUrl || ''} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="certificate" className="form-label acs-url-label">
              <img src={shieldIcon} alt="Shield" className="label-icon" />
              Test Encryption Certificate (Public)
            </label>
            <div className="certificate-wrapper">
              <div className="certificate-container">
                <h3 className="certificate-label">certificate.pem</h3>
              </div>
              <textarea
                id="certificate"
                className="form-textarea"
                value={publicCertificate || ''}
                readOnly
                rows={10}
              />
            </div>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunAnotherSimulation}
              disabled={isRunning || !acsUrl || !publicCertificate}
            >
              {isRunning ? 'Running Simulation...' : 'Run Another Simulation'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleMetaData}>
              <img src={downloadIcon} alt="" className="btn-icon" />
              XML Assertion
            </button>
          </div>

          <div className="back-link">
            <Link to="/">Back to Home Page</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
