import { useCallback, useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { useAuth } from '../context/AuthContext.jsx';
import { sendSuspiciousActivityEmail } from '../services/alerts.js';
import { analyzeTranscriptForTheft } from '../services/analysis.js';
import '../styles/realtime.css';

const DEFAULT_ALERT_STATE = { status: 'idle', triggered: false, reason: '', error: '' };

const RealtimePage = () => {
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptBoxRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const modelRef = useRef(null);
  const { user } = useAuth();
  const [streamActive, setStreamActive] = useState(false);
  const [segments, setSegments] = useState([]);
  const [liveSegment, setLiveSegment] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [reportState, setReportState] = useState({ status: 'idle', message: '' });
  const [alertState, setAlertState] = useState(DEFAULT_ALERT_STATE);
  const [detectionState, setDetectionState] = useState({ status: 'idle', objects: [], error: undefined });
  const analysisTimerRef = useRef(null);
  const lastAnalyzedRef = useRef('');
  const analysisAbortRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setLiveSegment('');
  }, []);

  const clearDetectionCanvas = () => {
    const canvas = detectionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const stopEverything = useCallback(() => {
    stopRecognition();
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setReportState({ status: 'idle', message: '' });
    setAlertState(DEFAULT_ALERT_STATE);
    lastAnalyzedRef.current = '';
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    lastDetectionTimeRef.current = 0;
    clearDetectionCanvas();
    setDetectionState({ status: 'idle', objects: [], error: undefined });
  }, [stopRecognition]);

  useEffect(() => () => stopEverything(), [stopEverything]);

  useEffect(() => {
    if (!transcriptBoxRef.current) return;
    transcriptBoxRef.current.scrollTo({
      top: transcriptBoxRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [segments, liveSegment]);

  const startRecognition = useCallback(() => {
    setError('');
    setReportState({ status: 'idle', message: '' });
    setAlertState(DEFAULT_ALERT_STATE);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Live transcription not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      const finalChunks = [];
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;
        if (result.isFinal) {
          finalChunks.push(text.charAt(0).toUpperCase() + text.slice(1));
        } else {
          interim = `${interim} ${text}`.trim();
        }
      }

      if (finalChunks.length) {
        setSegments(prev => [...prev, ...finalChunks]);
        setLiveSegment('');
      }

      if (interim) {
        const capitalized = interim.charAt(0).toUpperCase() + interim.slice(1);
        setLiveSegment(capitalized);
      } else {
        setLiveSegment('');
      }
    };
    recognition.onerror = event => {
      setError(event.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, []);

  const startStream = async () => {
    setError('');
    setReportState({ status: 'idle', message: '' });
    setAlertState(DEFAULT_ALERT_STATE);
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      setStreamActive(true);
      setSegments([]);
      setLiveSegment('');
      lastAnalyzedRef.current = '';
      startRecognition();
      await startDetection();
    } catch (err) {
      setError(err.message);
    }
  };

  const resolveRecipientEmail = () => {
    if (!user) return null;
    const googleProfile = user.providerData?.find(profile => profile.providerId === 'google.com');
    return googleProfile?.email ?? user.email ?? null;
  };

  const handleReport = async () => {
    const targetEmail = resolveRecipientEmail();
    if (!targetEmail) {
      setReportState({ status: 'error', message: 'No Google email associated with this account.' });
      return;
    }
    setReportState({ status: 'pending', message: 'Sending alert…' });
    try {
      await sendSuspiciousActivityEmail(targetEmail);
      setReportState({ status: 'success', message: 'Alert sent to your Google inbox. Check for BikeGuard updates.' });
    } catch (err) {
      setReportState({
        status: 'error',
        message: err.message || 'Unable to send alert. Please verify email configuration.',
      });
    }
  };

  const drawDetections = useCallback(detections => {
    const canvas = detectionCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth || !video.videoHeight) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);
    detections.forEach(({ bbox, className, class: classId, score }) => {
      const label =
        className ??
        (typeof classId === 'number'
          ? `Class ${classId}`
          : classId ?? 'Object');
      const [x, y, width, height] = bbox;
      context.strokeStyle = 'rgba(97, 210, 255, 0.85)';
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);
      const caption = `${label} ${(score * 100).toFixed(0)}%`;
      const padding = 6;
      context.font = '14px Inter, sans-serif';
      const textWidth = context.measureText(caption).width;
      context.fillStyle = 'rgba(5, 8, 15, 0.85)';
      context.fillRect(x, Math.max(y - 24, padding), textWidth + padding * 2, 22);
      context.fillStyle = '#61d2ff';
      context.fillText(caption, x + padding, Math.max(y - 8, padding + 6));
    });

    setDetectionState({
      status: 'success',
      objects: detections.slice(0, 6).map((item, idx) => ({
        id: `${item.className ?? item.class ?? 'object'}-${idx}`,
        label:
          item.className ??
          (typeof item.class === 'number'
            ? `Class ${item.class}`
            : item.class ?? 'Object'),
        score: item.score,
      })),
      error: undefined,
    });
  }, []);

  const runDetectionLoop = useCallback(async () => {
    if (!modelRef.current || !videoRef.current) return;
    if (videoRef.current.readyState < 2) {
      detectionLoopRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }
    const now = performance.now();
    if (now - lastDetectionTimeRef.current < 250) {
      detectionLoopRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }
    lastDetectionTimeRef.current = now;
    try {
      const predictions = await modelRef.current.detect(videoRef.current);
      drawDetections(predictions ?? []);
    } catch (err) {
      setDetectionState({ status: 'error', objects: [], error: err.message });
    }
    detectionLoopRef.current = requestAnimationFrame(runDetectionLoop);
  }, [drawDetections]);

  const startDetection = useCallback(async () => {
    if (!videoRef.current) return;
    setDetectionState(prev => ({ ...prev, status: 'loading', error: undefined }));
    try {
      if (!modelRef.current) {
        modelRef.current = await cocoSsd.load();
      }
      lastDetectionTimeRef.current = performance.now();
      setDetectionState(prev => ({ ...prev, status: 'success' }));
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
      }
      clearDetectionCanvas();
      detectionLoopRef.current = requestAnimationFrame(runDetectionLoop);
    } catch (err) {
      setDetectionState({ status: 'error', objects: [], error: err.message });
    }
  }, [runDetectionLoop]);

  const scheduleAnalysis = useCallback(
    text => {
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
      }
      if (analysisAbortRef.current) {
        analysisAbortRef.current.abort();
        analysisAbortRef.current = null;
      }
      analysisTimerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        analysisAbortRef.current = controller;
        try {
          setAlertState(prev => ({ ...prev, status: 'pending', error: '' }));
          const result = await analyzeTranscriptForTheft(text, controller.signal);
          lastAnalyzedRef.current = text;
          setAlertState({
            status: 'success',
            triggered: Boolean(result.alert),
            reason: result.reason || '',
            error: '',
          });
        } catch (analysisError) {
          if (analysisError.name !== 'AbortError') {
            lastAnalyzedRef.current = text;
            setAlertState({
              status: 'error',
              triggered: false,
              reason: '',
              error: analysisError.message,
            });
          }
        }
        analysisTimerRef.current = null;
        analysisAbortRef.current = null;
      }, 1200);
    },
    [],
  );

  useEffect(() => () => {
    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  }, []);

  useEffect(() => {
    const transcriptForAnalysis = segments.join(' ').trim();
    if (!transcriptForAnalysis) {
      setAlertState(DEFAULT_ALERT_STATE);
    }
    if (!transcriptForAnalysis) {
      lastAnalyzedRef.current = '';
      return;
    }
    if (transcriptForAnalysis === lastAnalyzedRef.current) {
      return;
    }
    scheduleAnalysis(transcriptForAnalysis);
  }, [segments, scheduleAnalysis]);

  return (
    <section className="realtime-shell">
      <header className="realtime-header">
        <h1>Live Audio Stream Analyzer</h1>
        <p>Live transcription and threat detection</p>
        <div className="realtime-actions">
          {streamActive ? (
            <button type="button" onClick={stopEverything} className="stop">
              Stop stream
            </button>
          ) : (
            <button type="button" onClick={startStream} className="start">
              Start live analysis
            </button>
          )}
          <button
            type="button"
            className="secondary"
            onClick={listening ? stopRecognition : startRecognition}
            disabled={!streamActive}
          >
            {listening ? 'Pause transcription' : 'Resume transcription'}
          </button>
          {alertState.triggered && (
            <button
              type="button"
              className="alert-indicator"
              onClick={handleReport}
              disabled={reportState.status === 'pending'}
            >
              Alert!
            </button>
          )}
          <button
            type="button"
            className="report"
            onClick={handleReport}
            disabled={reportState.status === 'pending'}
          >
            {reportState.status === 'pending' ? 'Reporting…' : 'Report suspicious activity'}
          </button>
        </div>
        {error && <p className="realtime-error">{error}</p>}
        {alertState.status === 'pending' && <p className="alert-feedback alert-feedback-pending">Analyzing audio for threats…</p>}
        {alertState.error && <p className="alert-feedback alert-feedback-error">{alertState.error}</p>}
        {alertState.triggered && alertState.reason && (
          <p className="alert-feedback alert-feedback-success">{alertState.reason}</p>
        )}
        {reportState.message && (
          <p className={`report-feedback report-feedback-${reportState.status}`}>
            {reportState.message}
          </p>
        )}
      </header>
      <div className="realtime-grid">
        <div className="realtime-video-card">
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={detectionCanvasRef} className="detection-canvas" />
          {!streamActive && <span className="video-placeholder">Webcam preview will appear here</span>}
        </div>
        <aside className="realtime-panel">
          <h2>Audio transcription</h2>
          <div className="transcript-box" ref={transcriptBoxRef}>
            {segments.length === 0 && !liveSegment ? (
              <p className="placeholder">Live text to speech will populate here.</p>
            ) : (
              <div className="transcript-stream">
                {segments.map((chunk, index) => (
                  <p key={`${chunk}-${index}`} className="transcript-line">
                    {chunk}
                  </p>
                ))}
                {liveSegment && (
                  <p className="transcript-line transcript-live">{liveSegment}</p>
                )}
              </div>
            )}
          </div>
          <div className="detection-summary">
            <h3>Live objects</h3>
            {detectionState.status === 'loading' && <p className="placeholder">Loading detector…</p>}
            {detectionState.status === 'error' && (
              <p className="alert-feedback-error">{detectionState.error}</p>
            )}
            {detectionState.objects.length === 0 && detectionState.status === 'success' && (
              <p className="placeholder">No objects detected.</p>
            )}
            {detectionState.objects.length > 0 && (
              <ul>
                {detectionState.objects.map(item => (
                  <li key={item.id}>
                    <span>{item.label}</span>
                    <span className="confidence">{Math.round(item.score * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default RealtimePage;
