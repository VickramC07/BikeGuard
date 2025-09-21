import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/upload.css';
import { useUploads } from '../context/UploadContext.jsx';
import { analyzeVideoThreat } from '../services/videoThreatAnalysis.js';

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('Idle');
  const [progressMap, setProgressMap] = useState({});
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const intervalRefs = useRef([]);
  const { addUploads } = useUploads();

  const handleFiles = useCallback(list => {
    const videoExtensions = /\.(mp4|m4v|mov|avi|mkv|webm|h264|h265|hevc)$/i;
    const next = Array.from(list).filter(item => {
      if (item.type && item.type.startsWith('video/')) {
        return true;
      }
      return videoExtensions.test(item.name);
    });
    setFiles(current => [...current, ...next]);
  }, []);

  const removeFile = fileName => {
    setFiles(current => current.filter(item => item.name !== fileName));
    setProgressMap(current => {
      const copy = { ...current };
      delete copy[fileName];
      return copy;
    });
    setResults(current => current.filter(item => item.title !== fileName));
  };

  const totalProgress = useMemo(() => {
    if (!files.length) return 0;
    const sum = files.reduce((acc, file) => acc + (progressMap[file.name] ?? 0), 0);
    return Math.round(sum / files.length);
  }, [files, progressMap]);

  const toTimestamp = seconds => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `00:${mm}:${ss}`;
  };

  const extractMockTimestamps = useCallback(videoName => {
    const base = videoName.length % 50;
    return [toTimestamp(10 + base), toTimestamp(65 + base), toTimestamp(110 + base)];
  }, []);

  useEffect(
    () => () => {
      intervalRefs.current.forEach(clearInterval);
      intervalRefs.current = [];
    },
    [],
  );

  const simulateUpload = useCallback(
    file =>
      new Promise(resolve => {
        const objectUrl = URL.createObjectURL(file);
        const estimatedDuration = Math.max(1600, Math.min(6000, file.size / 40));
        const startedAt = performance.now();

        setProgressMap(prev => ({ ...prev, [file.name]: 0 }));

        const interval = setInterval(() => {
          const elapsed = performance.now() - startedAt;
          const percent = Math.min(100, Math.round((elapsed / estimatedDuration) * 100));
          setProgressMap(prev => ({ ...prev, [file.name]: percent }));
          if (percent >= 100) {
            clearInterval(interval);
            intervalRefs.current = intervalRefs.current.filter(entry => entry !== interval);
            resolve({
              id: `${file.name}-${startedAt}`,
              title: file.name,
              url: objectUrl,
              objectUrl,
              location: 'Local analysis',
              timestamps: extractMockTimestamps(file.name),
              createdAt: new Date().toISOString(),
            });
          }
        }, 220);

        intervalRefs.current.push(interval);
      }),
    [extractMockTimestamps],
  );

  const handleUpload = async () => {
    if (!files.length) return;
    setStatus('Analyzing');
    setError('');
    setProgressMap({});
    try {
      const baseResults = await Promise.all(files.map(file => simulateUpload(file)));
      setResults(baseResults.map(item => ({ ...item, threatAssessment: { status: 'pending' } })));

      setStatus('Evaluating threat');

      const timestampLookup = new Map(baseResults.map(item => [item.title, item.timestamps]));

      const threatEvaluations = await Promise.all(
        files.map(async file => {
          try {
            const assessment = await analyzeVideoThreat(file, {
              timestamps: timestampLookup.get(file.name) ?? [],
            });
            return { fileName: file.name, assessment };
          } catch (evaluationError) {
            return {
              fileName: file.name,
              assessment: {
                error: evaluationError.message ?? 'Threat analysis unavailable.',
              },
            };
          }
        }),
      );

      const enriched = baseResults.map(item => {
        const match = threatEvaluations.find(entry => entry.fileName === item.title);
        return {
          ...item,
          threatAssessment: match?.assessment ?? { error: 'No threat data' },
        };
      });

      setResults(enriched);
      addUploads(enriched);
      setStatus('Complete');
    } catch (err) {
      console.error(err);
      setError('Unable to complete analysis.');
      setStatus('Error');
    }
  };

  return (
    <section className="upload-shell">
      <header className="upload-header">
        <h1>Video TimeStamp Analyzer</h1>
        <p>Upload a video to analyze key moments and extract timestamps</p>
      </header>
      <div
        className="dropzone"
        onDragOver={event => {
          event.preventDefault();
        }}
        onDrop={event => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          accept="video/*"
          onChange={event => handleFiles(event.target.files)}
        />
        <div className="dropzone-inner">
          <p className="dropzone-title">Drag & drop your footage</p>
          <p className="dropzone-hint">or click to browse and select files</p>
        </div>
      </div>
      {files.length > 0 && (
        <div className="upload-list">
          {files.map(file => (
            <article key={file.name} className="upload-item">
              <div>
                <h3>{file.name}</h3>
                <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <div className="upload-controls">
                <div className="progress-bar">
                  <div style={{ width: `${progressMap[file.name] ?? 0}%` }} />
                </div>
                <button type="button" onClick={() => removeFile(file.name)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="upload-actions">
        <button type="button" className="primary" disabled={!files.length} onClick={handleUpload}>
          Start analysis
        </button>
        <span className="status">Status: {status}</span>
        {files.length > 0 && <span className="status">Overall progress: {totalProgress}%</span>}
      </div>
      {error && <p className="upload-error">{error}</p>}
      {results.length > 0 && (
        <section className="analysis-results">
          <h2>Key moments</h2>
          <div className="analysis-grid">
            {results.map(item => (
              <article key={item.id} className="analysis-card">
                <header>
                  <h3>{item.title}</h3>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    View upload
                  </a>
                </header>
                <ul>
                  {item.timestamps.map(mark => (
                    <li key={mark}>
                      <span className="dot" />
                      {mark}
                    </li>
                  ))}
                </ul>
                {item.threatAssessment && (
                  <div
                    className={`threat-panel ${
                      item.threatAssessment.error
                        ? 'threat-panel-error'
                        : item.threatAssessment.status === 'pending'
                        ? 'threat-panel-pending'
                        : item.threatAssessment.suspicious
                        ? 'threat-panel-risk'
                        : 'threat-panel-clear'
                    }`}
                  >
                    {item.threatAssessment.status === 'pending' && <p>Evaluating suspicious activity…</p>}
                    {item.threatAssessment.error && <p>{item.threatAssessment.error}</p>}
                    {!item.threatAssessment.error && item.threatAssessment.status !== 'pending' && (
                      <>
                        <p className="threat-headline">
                          Suspicious activity:{' '}
                          <strong>{item.threatAssessment.suspicious ? 'Likely' : 'Unlikely'}</strong>
                        </p>
                        <p className="threat-detail">
                          Likelihood: {item.threatAssessment.likelihood ?? 'unknown'} | Confidence:{' '}
                          {Math.round((item.threatAssessment.confidence ?? 0) * 100)}%
                        </p>
                        <p className="threat-summary">{item.threatAssessment.summary}</p>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="holo-video-wrapper">
        <video
          src="/bikeholo.mp4"
          className="holo-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <track kind="captions" />
        </video>
      </div>
    </section>
  );
};

export default UploadPage;
