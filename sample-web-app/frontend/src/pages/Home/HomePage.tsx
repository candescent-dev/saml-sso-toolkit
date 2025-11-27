import React, { FC, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import {
  setInitUrl,
  setEncCertificate,
  setFirstName,
  setLastName,
  setMemberId,
  setEmail,
} from '../../features/home/homeSlice';
import { validateCertificate, validateUrl } from '../../utils/helpers';
import downloadIcon from '../../assets/download.svg';
import './HomePage.css';

const HomePage: FC = () => {
  const dispatch = useDispatch();
  const { initUrl, encCertificate, firstName, lastName, memberId, email } = useSelector(
    (state: RootState) => state.home
  );

  const [fieldErrors, setFieldErrors] = useState<{
    initUrl: string | null;
    encCertificate: string | null;
    firstName: string | null;
    lastName: string | null;
    memberId: string | null;
    email: string | null;
  }>({
    initUrl: null,
    encCertificate: null,
    firstName: null,
    lastName: null,
    memberId: null,
    email: null,
  });

  /* ----------------------------- Input Handlers ----------------------------- */
  const handleInitUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    dispatch(setInitUrl(value));
    if (!value.trim()) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Init URL is required' }));
    } else if (!validateUrl(value)) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Invalid URL' }));
    } else {
      setFieldErrors((prev) => ({ ...prev, initUrl: null }));
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    dispatch(setEncCertificate(value));
    const hasHeader = value.includes('-----BEGIN CERTIFICATE-----');
    const hasFooter = value.includes('-----END CERTIFICATE-----');
    const body = value.replace(/-----.*-----/g, '').trim();
    const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
    if (!value.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Test encryption certificate is required',
      }));
    } else if (!hasHeader || !hasFooter) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Certificate must include BEGIN/END PUBLIC KEY lines',
      }));
    } else if (!base64Regex.test(body)) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Certificate body must be valid Base64',
      }));
    } else if (body.length < 100) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Certificate seems too short',
      }));
    } else {
      setFieldErrors((prev) => ({ ...prev, encCertificate: null }));
    }
  };

  const isFormValid = (): boolean => {
    if (!validateUrl(initUrl) || !validateCertificate(encCertificate)) return false;
    return true;
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    let hasError = false;
    // Init URL Validation
    if (!initUrl.trim()) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Init URL is required' }));
      hasError = true;
    } else if (!validateUrl(initUrl)) {
      setFieldErrors((prev) => ({ ...prev, initUrl: 'Invalid URL' }));
      hasError = true;
    } else {
      setFieldErrors((prev) => ({ ...prev, initUrl: null }));
    }
    const hasHeader = encCertificate.includes('-----BEGIN CERTIFICATE-----');
    const hasFooter = encCertificate.includes('-----END CERTIFICATE-----');
    const body = encCertificate.replace(/-----.*-----/g, '').trim();
    const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
    if (!encCertificate.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Test encryption certificate is required',
      }));
      hasError = true;
    } else if (!hasHeader || !hasFooter) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Certificate must include BEGIN/END PUBLIC KEY lines',
      }));
      hasError = true;
    } else if (!base64Regex.test(body)) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Certificate body must be valid Base64',
      }));
      hasError = true;
    } else if (body.length < 100) {
      setFieldErrors((prev) => ({
        ...prev,
        encCertificate: 'Certificate seems too short',
      }));
      hasError = true;
    } else {
      setFieldErrors((prev) => ({ ...prev, encCertificate: null }));
    }
    if (hasError) return;
    const payload = {
      acsUrl: initUrl,
      publicCertificate: encCertificate,
      attributes: {
        firstName,
        lastName,
        memberId,
        email,
      },
    };
    // Reset Fields
    setInitUrl('');
    setEncCertificate('');
    setEmail('');
    setFirstName('');
    setLastName('');
    setMemberId('');
    setFieldErrors({
      initUrl: null,
      encCertificate: null,
      firstName: null,
      lastName: null,
      email: null,
      memberId: null,
    });
  };

  return (
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
            htmlFor="initUrl"
            className={`inline-label ${fieldErrors.initUrl ? 'error-label' : ''}`}
          >
            Test ACS URL *
          </label>
          <input
            type="text"
            id="initUrl"
            autoComplete="off"
            className={`inline-input ${fieldErrors.initUrl ? 'error' : ''}`}
            placeholder="https://test.abc.com/sso/consume"
            value={initUrl}
            onChange={handleInitUrlChange}
          />
          {fieldErrors.initUrl && <p className="error-message">{fieldErrors.initUrl}</p>}
          <p className="description-info">Vendors can expect to receive the SAML response here.</p>
        </div>
        {/* Encryption Certificates */}
        <div className="inline-input-box">
          <label
            htmlFor="callbackHost"
            className={`inline-label ${fieldErrors.encCertificate ? 'error-label' : ''}`}
          >
            Test Encryption Certificates(Public) *
          </label>
          <textarea
            id="callbackHost"
            autoComplete="off"
            className={`inline-input ${fieldErrors.encCertificate ? 'error' : ''}`}
            placeholder="(Paste PEM Block)"
            value={encCertificate}
            onChange={handleCertificateChange}
            rows={8}
          />
          {fieldErrors.encCertificate && (
            <p className="error-message">{fieldErrors.encCertificate}</p>
          )}
          <p className="description-info">
            Public certificate required to encrypt the SAML assertion before it is sent to the Test
            ACS URL.
          </p>
        </div>
      </div>
      <div className="header-row">
        <h3>Vendor Information</h3>
        <p className="description-message">
          Below mock details are for reference only and cannot be modified.
        </p>
      </div>
      {/* First Name */}
      <div className="inputs">
        <div className="inline-input-box">
          <label
            htmlFor="firstName"
            className={`inline-label ${fieldErrors.firstName ? 'error-label' : ''}`}
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            autoComplete="off"
            disabled
            className={`inline-input ${fieldErrors.firstName ? 'error' : ''}`}
            placeholder="Test"
            value={firstName}
          />
        </div>
        {/* Last Name */}
        <div className="inline-input-box">
          <label
            htmlFor="lastName"
            className={`inline-label ${fieldErrors.lastName ? 'error-label' : ''}`}
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            autoComplete="off"
            disabled
            className={`inline-input ${fieldErrors.lastName ? 'error' : ''}`}
            placeholder="Test"
            value={lastName}
          />
        </div>
        {/* Member ID */}
        <div className="inline-input-box">
          <label
            htmlFor="memberId"
            className={`inline-label ${fieldErrors.memberId ? 'error-label' : ''}`}
          >
            Member ID
          </label>
          <input
            type="text"
            id="memberId"
            autoComplete="off"
            disabled
            className={`inline-input ${fieldErrors.memberId ? 'error' : ''}`}
            placeholder="AS83747TB"
            value={memberId}
          />
        </div>
        {/* Email */}
        <div className="inline-input-box">
          <label
            htmlFor="email"
            className={`inline-label ${fieldErrors.email ? 'error-label' : ''}`}
          >
            Email
          </label>
          <input
            type="text"
            id="email"
            autoComplete="off"
            disabled
            className={`inline-input ${fieldErrors.email ? 'error' : ''}`}
            placeholder="test@test.com"
            value={email}
          />
        </div>
        {/* Run Simulation Button */}
        <div className="button-row">
          <button
            type="button"
            className="submit-btn"
            data-testid="metadata-button"
            onClick={handleSubmit}
            disabled={!isFormValid()}
          >
            Run Simulation
          </button>
          <button type="button" className="icon-button" data-testid="jwk-button" onClick={() => {}}>
            <img src={downloadIcon} className="download-icon" alt="Download" loading="lazy" />
            Candescent Public Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
