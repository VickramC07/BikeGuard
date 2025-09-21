import { Link } from 'react-router-dom';
import VideoGallery from '../components/VideoGallery.jsx';
import { useUploads } from '../context/UploadContext.jsx';
import '../styles/dashboard.css';

const HomePage = () => {
  const { uploads } = useUploads();
  const hasUploads = uploads.length > 0;
  const curatedVideos = uploads.map(item => ({
    id: item.id,
    title: item.title,
    location: item.location ?? 'Local analysis',
    url: item.url,
    thumbnail: item.thumbnail ?? null,
  }));

  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h1>Live security library</h1>
          <p>
            Monitor recent BikeGuard analyses at a glance. Keep an eye on alerts, uptime, and your latest
            recordings from anywhere.
          </p>
        </div>
        <div className="dashboard-highlights">
          <article>
            <span className="metric">{String(uploads.length).padStart(2, '0')}</span>
            <p>Videos stored this session</p>
          </article>
          <article>
            <span className="metric">04</span>
            <p>Alerts in the last hour</p>
          </article>
          <article>
            <span className="metric">99.2%</span>
            <p>Uptime over 7 days</p>
          </article>
        </div>
      </header>
      {hasUploads ? (
        <VideoGallery
          title="Recent recordings"
          subtitle="Tap into recordings captured during this session. Export or re-run analysis in the upload tab."
          videos={curatedVideos}
        />
      ) : (
        <div className="dashboard-empty">
          <h2>No captures yet</h2>
          <p>
            Upload a video to begin real-time analysis and build your BikeGuard library. Need a starting point? Try
            recording a quick clip from your webcam.
          </p>
          <Link to="/upload" className="primary-link">
            Upload a video
          </Link>
        </div>
      )}
    </section>
  );
};

export default HomePage;
