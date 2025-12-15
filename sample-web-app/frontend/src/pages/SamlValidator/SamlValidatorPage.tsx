import React, { FC, useState, useEffect, useRef } from 'react';
import { getApi } from '../../services/api';
import codeIcon from '../../assets/code.svg';
import playIcon from '../../assets/playCircle.svg';
import downloadIcon from '../../assets/download.svg';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  fetchE2EReports,
  setPublishSamlSettingLoading,
  resetSamlValidatorState,
} from '../../features/samlValidator/samlValidatorSlice';
import './SamlValidatorPage.css';

const SamlValidatorPage: FC = () => {
  const dispatch = useAppDispatch();
  const { runValidatorLoading, publishSamlSettingLoading, htmlFileUrl, xmlFileUrl } =
    useAppSelector((state) => state.samlValidator);

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const downloadTimerRef = useRef<number | null>(null);

  // Cleanup Blob URLs and timer on unmount
  useEffect(() => {
    return () => {
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      if (htmlFileUrl) URL.revokeObjectURL(htmlFileUrl);
      if (xmlFileUrl) URL.revokeObjectURL(xmlFileUrl);
      dispatch(resetSamlValidatorState());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide download message after 10s
  useEffect(() => {
    if (!downloadMessage) return;
    const timer = setTimeout(() => setDownloadMessage(null), 10000);
    return () => clearTimeout(timer);
  }, [downloadMessage]);

  /** Download config.json file */
  const handlePublishSAMLSetting = async (): Promise<void> => {
    try {
      dispatch(setPublishSamlSettingLoading(true));
      const api = getApi();
      const response = await api.get<Blob>('publish-config', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'samlConfig.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = window.setTimeout(() => {
        setDownloadMessage('samlConfig.json downloaded successfully');
        dispatch(setPublishSamlSettingLoading(false));
      }, 2000);
    } catch (error: any) {
      dispatch(setPublishSamlSettingLoading(false));
      let message = 'Something went wrong. Please try again later';
      if (error.response && error.response.data instanceof Blob) {
        const text = await error.response.data.text();
        try {
          const json = JSON.parse(text);
          message = json.message || message;
        } catch {
          message = text || message;
        }
      } else {
        message = error?.message || message;
      }
      setDownloadMessage(message);
    }
  };

  /** Run E2E validator and fetch reports */
  const handleRunValidator = async (): Promise<void> => {
    const result = await dispatch(fetchE2EReports());
    if (fetchE2EReports.rejected.match(result)) {
      setDownloadMessage(
        result.payload?.error || 'Server Error: Something went wrong. Please try again later'
      );
    }
  };

  /** Generic file download handler with success message */
  const handleDownloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
    downloadTimerRef.current = window.setTimeout(() => {
      setDownloadMessage(`${filename} downloaded successfully`);
    }, 2000);
  };

  return (
    <>
      <div className="validator-container">
        {/* Header */}
        <div className="validator-header-row">
          <h1>SAML Validator</h1>
          <p className="heading-message">Validate and publish your SAML configuration setting</p>
        </div>
        <div className="divider" />
        {/* Run Validator Button */}
        <button className="submit-btn" onClick={handleRunValidator} disabled={runValidatorLoading}>
          {runValidatorLoading ? (
            <>
              Validating...
              <span className="spinner" />
            </>
          ) : (
            <>
              Run Validator <img src={playIcon} className="download-icon" alt="Run" />
            </>
          )}
        </button>
        {/* Validation Report Section */}
        <div className="text-with-icon">
          <img src={codeIcon} className="download-icon" alt="Report" />
          <span className="title-label">Validation Report</span>
        </div>
        <div className="run-container">
          {!htmlFileUrl ? (
            <p>Click ‘Run Validator’ to start validation</p>
          ) : (
            <iframe
              src={htmlFileUrl}
              title="E2E HTML Report"
              style={{ width: '100%', height: '600px', border: 'none' }}
            />
          )}
        </div>
        {/* Download Report Buttons (Shown after successful API call) */}
        {htmlFileUrl && xmlFileUrl && (
          <>
            <div className="text-with-icon">
              <span className="title-label">Download Reports</span>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="icon-button"
                onClick={() => handleDownloadFile(htmlFileUrl, 'e2e-report.html')}
              >
                <img
                  src={downloadIcon}
                  className="download-icon"
                  alt="Download HTML"
                  loading="lazy"
                />
                e2e-report.html
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => handleDownloadFile(xmlFileUrl, 'jest-e2e.xml')}
              >
                <img
                  src={downloadIcon}
                  className="download-icon"
                  alt="Download XML"
                  loading="lazy"
                />
                jest-e2e.xml
              </button>
            </div>
          </>
        )}
        <div className="divider" />
        {/* Publish SAML Setting */}
        <button
          className="green-btn"
          onClick={handlePublishSAMLSetting}
          disabled={publishSamlSettingLoading || !htmlFileUrl || !xmlFileUrl}
        >
          {publishSamlSettingLoading ? (
            <>
              Publishing...
              <span className="spinner" />
            </>
          ) : (
            'Publish SAML Setting'
          )}
        </button>
        {!htmlFileUrl && !xmlFileUrl && (
          <p className="description-message">
            Complete validation to enable ‘Publish SAML Setting’
          </p>
        )}
      </div>
      {/* Download Message Toast */}
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

export default SamlValidatorPage;
