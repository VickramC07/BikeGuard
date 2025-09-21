import VideoGallery from '../components/VideoGallery.jsx';
import { useUploads } from '../context/UploadContext.jsx';

const LibraryPage = () => {
  const { uploads } = useUploads();
  const hasUploads = uploads.length > 0;
  const videoCount = uploads.length;
  const highThreatCount = uploads.filter(item => {
    const assessment = item.threatAssessment;
    if (!assessment || assessment.error || assessment.confidence == null) return false;
    const confidence = Number(assessment.confidence);
    if (Number.isNaN(confidence)) return false;
    return confidence >= 0.5;
  }).length;

  const curatedVideos = uploads.map(item => ({
    id: item.id,
    title: item.title,
    location: item.location ?? 'Local analysis',
    url: item.url,
    thumbnail: item.thumbnail ?? null,
    threatAssessment: item.threatAssessment ?? null,
  }));

  return (
    <section className="library-shell">
      <div className="library-counter-row">
        <button type="button" className="library-counter-btn" disabled>
          Stored videos: <span>{String(videoCount).padStart(2, '0')}</span>
        </button>
        <button type="button" className="library-threat-btn" disabled>
          Threats: <span>{String(highThreatCount).padStart(2, '0')}</span>
        </button>
      </div>
      <VideoGallery
        title="Library"
        subtitle={
          hasUploads
            ? 'Browse the clips you just analyzed. BikeGuard keeps them here until you refresh.'
            : 'No uploads yet. Analyze a video from the Upload tab to populate your personal library.'
        }
        videos={curatedVideos}
      />
      <div className="library-feedback">
        {hasUploads ? (
          <span className="status">Your uploads stay locally while this session is open.</span>
        ) : (
          <span className="status">Upload to start building your library.</span>
        )}
      </div>
    </section>
  );
};

export default LibraryPage;
