import { useRef, useState } from 'react';
import '../styles/video-gallery.css';

const VideoGallery = ({ videos, title, subtitle }) => {
  const [activeVideoIds, setActiveVideoIds] = useState([]);
  const videoRefs = useRef({});

  const threatClass = video => {
    const assessment = video.threatAssessment;
    if (!assessment || assessment.error || assessment.confidence === undefined) return '';
    const confidence = Number(assessment.confidence);
    if (Number.isNaN(confidence)) return '';
    if (confidence <= 0.2) return 'gallery-card-safe';
    if (confidence <= 0.5) return 'gallery-card-watch';
    return 'gallery-card-risk';
  };

  const registerVideoRef = (id, node) => {
    if (node) {
      videoRefs.current[id] = node;
    } else {
      delete videoRefs.current[id];
    }
  };

  const markActive = id => {
    setActiveVideoIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const clearActive = id => {
    setActiveVideoIds(prev => prev.filter(item => item !== id));
  };

  const handleWatch = id => {
    const target = videoRefs.current[id];
    if (!target) return;
    markActive(id);
    target.currentTime = 0;
    target.muted = false;
    target.controls = true;
    const playPromise = target.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => {});
    }
  };

  const handlePause = id => {
    const target = videoRefs.current[id];
    if (!target) return;
    if (target.currentTime < target.duration) {
      target.muted = true;
      target.controls = false;
      clearActive(id);
    }
  };

  const handleEnded = id => {
    const target = videoRefs.current[id];
    if (target) {
      target.muted = true;
      target.controls = false;
      target.currentTime = 0;
    }
    clearActive(id);
  };

  return (
    <section className="gallery-shell">
      <header className="gallery-header">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <div className="gallery-grid">
        {videos.map(video => (
          <article
            key={video.id}
            className={`gallery-card ${threatClass(video)}`.trim()}
          >
            <div className="gallery-video-wrapper">
              <video
                ref={node => registerVideoRef(video.id, node)}
                src={video.url}
                controls={activeVideoIds.includes(video.id)}
                preload="metadata"
                muted={!activeVideoIds.includes(video.id)}
                playsInline
                poster={video.thumbnail ?? undefined}
                onPause={() => handlePause(video.id)}
                onEnded={() => handleEnded(video.id)}
              />
              <div
                className={`gallery-overlay ${
                  activeVideoIds.includes(video.id) ? 'gallery-overlay-hidden' : ''
                }`}
              >
                <span className="badge">{video.location}</span>
                {video.url ? (
                  <button type="button" className="ghost-btn" onClick={() => handleWatch(video.id)}>
                    Watch
                  </button>
                ) : (
                  <span className="ghost-btn ghost-btn-disabled">Watch</span>
                )}
              </div>
            </div>
            <h3 className={`gallery-title ${threatClass(video)}`.trim()}>{video.title}</h3>
            {video.threatAssessment && video.threatAssessment.confidence !== undefined && (
              <p className="gallery-threat-score">
                Suspicious activity score: {Math.round((video.threatAssessment.confidence ?? 0) * 100)}%
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default VideoGallery;
