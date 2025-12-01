import React, { FC, useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import downloadIcon from '../../assets/download.svg';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setHomeInputState, initiateSamlLogin } from '../../features/home/homeSlice';
import { validatePublicCertificate, validateUrl } from '../../utils/helpers';
import { HomeInputState } from '../../features/home/types';
import { getApi } from '../../services/api';
import './HomePage.css';

interface FieldErrors {
  acsUrl: string | null;
  publicCertificate: string | null;
}

const HomePage: FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { attributes, loading } = useAppSelector((state) => state.home);

  const [acsUrl, setACSUrl] = useState<string>('');
  const [publicCertificate, setPublicCertificate] = useState<string>('');
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    acsUrl: null,
    publicCertificate: null,
  });

  const downloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (downloadMessage) {
      const timer = setTimeout(() => setDownloadMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [downloadMessage]);

  /* ----------------------------- Input Handlers ----------------------------- */
  const handleACSUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setACSUrl(value);
    setFieldErrors((prev) => ({
      ...prev,
      acsUrl: !value.trim() ? 'ACS URL is required' : !validateUrl(value) ? 'Invalid URL' : null,
    }));
  };

  const handlePublicCertificateChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setPublicCertificate(value);
    setFieldErrors((prev) => ({
      ...prev,
      publicCertificate: !value.trim()
        ? 'Test encryption certificate is required'
        : !validatePublicCertificate(value)
        ? 'Certificate must include BEGIN/END CERTIFICATE lines'
        : null,
    }));
  };

  const isFormValid = (): boolean => {
    return (
      validateUrl(acsUrl) &&
      validatePublicCertificate(publicCertificate) &&
      !fieldErrors.acsUrl &&
      !fieldErrors.publicCertificate
    );
  };

  /* ----------------------------- Submit Handler ----------------------------- */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    let hasError = false;
    // ACS URL Validation
    if (!acsUrl.trim()) {
      setFieldErrors((prev) => ({ ...prev, acsUrl: 'ACS URL is required' }));
      hasError = true;
    } else if (!validateUrl(acsUrl)) {
      setFieldErrors((prev) => ({ ...prev, acsUrl: 'Invalid URL' }));
      hasError = true;
    } else {
      setFieldErrors((prev) => ({ ...prev, acsUrl: null }));
    }
    // Public Certificate Validation
    if (!publicCertificate.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        publicCertificate: 'Test encryption certificate is required',
      }));
      hasError = true;
    } else if (!validatePublicCertificate(publicCertificate)) {
      setFieldErrors((prev) => ({
        ...prev,
        publicCertificate: 'Certificate must include BEGIN/END CERTIFICATE lines',
      }));
      hasError = true;
    } else {
      setFieldErrors((prev) => ({ ...prev, publicCertificate: null }));
    }
    if (hasError) return;
    // Build Payload
    const payload: HomeInputState = {
      acsUrl,
      publicCertificate,
      attributes,
    };
    // Dispatch to Redux
    dispatch(setHomeInputState(payload));
    // Call SAML login endpoint
    const resultAction = await dispatch(initiateSamlLogin(payload));
    // Handle success / error cases
    if (initiateSamlLogin.fulfilled.match(resultAction)) {
      navigate('/success');
    } else if (initiateSamlLogin.rejected.match(resultAction)) {
      navigate('/error');
    }
    // Reset fields
    setACSUrl('');
    setPublicCertificate('');
    setFieldErrors({ acsUrl: null, publicCertificate: null });
  };

  /* ----------------------------- Download Public Key ----------------------------- */
  const handleDownloadPublicKey = async (): Promise<void> => {
    try {
      const api = getApi();
      const response = await api.get<Blob>('public-key', { responseType: 'blob' });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'public.pem';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => {
        setDownloadMessage('public.pem file downloaded');
      }, 2000);
    } catch (error: any) {
      setDownloadMessage(error?.message || 'Something went wrong while downloading the public key');
    }
  };

  return (
    <>
      <div className="home-container">
        <div className="header-row">
          <h1>SAML SSO Partner Integration</h1>
          <p className="description-message">
            Complete the required data so we can set up secure SAML authentication.
          </p>
        </div>
        <div className="inputs">
          {/* ACS URL */}
          <div className="inline-input-box">
            <label
              htmlFor="acsUrl"
              className={`inline-label ${fieldErrors.acsUrl ? 'error-label' : ''}`}
            >
              Test ACS URL *
            </label>
            <input
              type="text"
              id="acsUrl"
              autoComplete="off"
              className={`inline-input ${fieldErrors.acsUrl ? 'error' : ''}`}
              placeholder="https://test.abc.com/sso/consume"
              value={acsUrl}
              onChange={handleACSUrlChange}
            />
            {fieldErrors.acsUrl && <p className="error-message">{fieldErrors.acsUrl}</p>}
            <p className="description-info">
              Vendors can expect to receive the SAML response here.
            </p>
          </div>
          {/* Encryption Certificates */}
          <div className="inline-input-box">
            <label
              htmlFor="publicCertificate"
              className={`inline-label ${fieldErrors.publicCertificate ? 'error-label' : ''}`}
            >
              Test Encryption Certificates(Public) *
            </label>
            <textarea
              rows={8}
              id="publicCertificate"
              autoComplete="off"
              className={`inline-input ${fieldErrors.publicCertificate ? 'error' : ''}`}
              placeholder="(Paste PEM Block)"
              value={publicCertificate}
              onChange={handlePublicCertificateChange}
            />
            {fieldErrors.publicCertificate && (
              <p className="error-message">{fieldErrors.publicCertificate}</p>
            )}
            <p className="description-info">
              Public certificate required to encrypt the SAML assertion before it is sent to the
              Test ACS URL.
            </p>
          </div>
        </div>
        <div className="header-row">
          <h3>Vendor Information</h3>
          <p className="description-message">
            Below mock details are for reference only and cannot be modified.
          </p>
        </div>
        {/* Vendor Inputs */}
        <div className="inputs">
          {Object.entries(attributes).map(([key, value]) => (
            <div className="inline-input-box" key={key}>
              <label htmlFor={key} className="inline-label">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              </label>
              <input
                id={key}
                disabled
                type="text"
                value={value}
                autoComplete="off"
                className="inline-input"
              />
            </div>
          ))}
        </div>
        {/* Run Simulation Button */}
        <div className="button-row">
          <button
            type="button"
            className="submit-btn"
            data-testid="metadata-button"
            onClick={handleSubmit}
            disabled={!isFormValid() || loading}
          >
            {loading ? <span className="spinner"></span> : 'Run Simulation'}
          </button>
          <button type="button" className="icon-button" onClick={handleDownloadPublicKey}>
            <img src={downloadIcon} className="download-icon" alt="Download" loading="lazy" />
            Candescent Public Key
          </button>
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
    </>
  );
};

export default HomePage;
