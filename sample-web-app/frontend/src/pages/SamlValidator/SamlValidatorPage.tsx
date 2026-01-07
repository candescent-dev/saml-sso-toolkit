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
  const { runValidatorLoading, publishSamlSettingLoading, htmlFileUrl, xmlFileUrl, testResults } =
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

  /** Format time in seconds to readable format */
  const formatTime = (seconds: number): string => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    }
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <>
      <div className="validator-container">
        {/* Header Section */}
        <div className="validator-header-section">
          <div className="validator-header-row">
            <h1>SAML Validator</h1>
            <p className="heading-message">
              Validate and publish your SAML configuration settings
            </p>
          </div>
        </div>

        <div className="divider" />

        {/* Action Section */}
        <div className="validator-action-section">
          <button
            className="run-validator-btn"
            onClick={handleRunValidator}
            disabled={runValidatorLoading}
          >
            {runValidatorLoading ? (
              <>
                <span className="spinner" />
                Validating...
              </>
            ) : (
              <>
                <img src={playIcon} className="btn-icon" alt="Run" />
                Run Validator
              </>
            )}
          </button>
        </div>

        {/* Validation Report Section */}
        <div className="validator-report-section">
          <div className="section-header">
            <img src={codeIcon} className="section-icon" alt="Report" />
            <span className="section-title">Validation Report</span>
          </div>

          {!testResults ? (
            <div className="report-placeholder">
              <p className="placeholder-text">Click 'Run Validator' to start validation</p>
            </div>
          ) : (
            <div className="report-content">
              {/* Summary Section */}
              <div className="test-summary">
                <div className="summary-card">
                  <div className="summary-label">Total Tests</div>
                  <div className="summary-value">{testResults.totalTests}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Passed</div>
                  <div className="summary-value success">
                    {testResults.totalTests - testResults.totalFailures - testResults.totalErrors - testResults.totalSkipped}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Failed</div>
                  <div className="summary-value failed">
                    {testResults.totalFailures + testResults.totalErrors}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Skipped</div>
                  <div className="summary-value skipped">{testResults.totalSkipped}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Duration</div>
                  <div className="summary-value">{formatTime(testResults.totalTime)}</div>
                </div>
              </div>

              {/* Test Results Table */}
              <div className="test-results-table-container">
                <table className="test-results-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.testSuites.map((suite) =>
                      suite.testCases.map((testCase, index) => (
                        <tr key={`${suite.name}-${testCase.name}-${index}`}>
                          <td className="test-name-cell">
                            <div className="test-name">{testCase.name}</div>
                            {testCase.className && (
                              <div className="test-class">{testCase.className}</div>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge status-${testCase.status}`}>
                              {testCase.status === 'passed' ? '✓ Passed' : testCase.status === 'failed' ? '✗ Failed' : '⊘ Skipped'}
                            </span>
                          </td>
                          <td className="time-cell">{formatTime(testCase.time)}</td>
                          <td className="details-cell">
                            {testCase.failureMessage ? (
                              <div className="failure-message">{testCase.failureMessage}</div>
                            ) : (
                              <span className="no-details">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Download Reports Section */}
        {htmlFileUrl && xmlFileUrl && (
          <>
            <div className="validator-download-section">
              <div className="section-header">
                <span className="section-title">Download Reports</span>
              </div>
              <div className="download-buttons-row">
                <button
                  type="button"
                  className="download-button"
                  onClick={() => handleDownloadFile(htmlFileUrl, 'e2e-report.html')}
                >
                  <img
                    src={downloadIcon}
                    className="btn-icon"
                    alt="Download HTML"
                    loading="lazy"
                  />
                  <span>e2e-report.html</span>
                </button>
                <button
                  type="button"
                  className="download-button"
                  onClick={() => handleDownloadFile(xmlFileUrl, 'jest-e2e.xml')}
                >
                  <img
                    src={downloadIcon}
                    className="btn-icon"
                    alt="Download XML"
                    loading="lazy"
                  />
                  <span>jest-e2e.xml</span>
                </button>
              </div>
            </div>
          </>
        )}

        <div className="divider" />

        {/* Publish Section */}
        <div className="validator-publish-section">
          <button
            className="publish-btn"
            onClick={handlePublishSAMLSetting}
            disabled={publishSamlSettingLoading || !htmlFileUrl || !xmlFileUrl}
          >
            {publishSamlSettingLoading ? (
              <>
                <span className="spinner" />
                Publishing...
              </>
            ) : (
              'Publish SAML Setting'
            )}
          </button>
          {!htmlFileUrl && !xmlFileUrl && (
            <p className="publish-hint">
              Complete validation to enable 'Publish SAML Setting'
            </p>
          )}
        </div>
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
