import React, { FC, useState, useRef, useEffect } from 'react';
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
  const { acsUrl, publicCertificate, attributes, xml } = homeState;

  const [isRunning, setIsRunning] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const downloadTimerRef = useRef<number | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current);
      }
    };
  }, []);

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
        const errorPayload = resultAction.payload || { errorReason: 'Simulation failed. Please try again.' };
        navigate('/error', {
          state: {
            errorCode: errorPayload.errorCode || '',
            errorReason: errorPayload.errorReason || '',
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
    if (!xml) {
      console.error('XML not available for download');
      setDownloadMessage('XML not available for download');
      return;
    }

    try {
      // Create a blob from the XML string
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'saml-assertion.xml';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Show toast after successful download
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => {
        setDownloadMessage('saml-assertion.xml file downloaded');
      }, 2000);
    } catch (error) {
      console.error('Error downloading XML:', error);
      setDownloadMessage('Error downloading XML file');
    }
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
        {/* ACS URL */}
        <div className="success-content">
          <div className="form-group">
            <label htmlFor="acs-url" className="form-label acs-url-label">
              <img src={linkIcon} alt="Link" className="label-icon" />
              Test ACS URL
            </label>
            <input
              id="acs-url"
              disabled
              type="text"
              autoComplete="off"
              value={acsUrl || ''}
              className="form-input"
            />
          </div>
          {/* Encryption Certificates */}
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
                rows={10}
                disabled
                id="certificate"
                autoComplete="off"
                className="form-textarea"
                value={publicCertificate || ''}
              />
            </div>
          </div>
          {/* Run Another Simulation Button */}
          <div className="button-group">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunAnotherSimulation}
              disabled={isRunning || !acsUrl || !publicCertificate}
            >
              {isRunning ? <span className="spinner"></span> : 'Run Another Simulation'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleMetaData}>
              <img src={downloadIcon} alt="" className="btn-icon" />
              XML Assertion
            </button>
          </div>
          {/* Back to Home Page Button */}
          <div className="back-link">
            <Link to="/">Back to Home Page</Link>
          </div>
        </div>
      </div>
      {downloadMessage && (
        <div className="download-toast">
          <span>{downloadMessage}</span>
          <button className="toast-close" onClick={() => setDownloadMessage(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default SuccessPage;
