import { useState } from 'react';
import '../styles/multimedia.css';

const emptySlot = index => ({
  id: index,
  file: null,
  url: '',
});

const MultimediaPage = () => {
  const [slots, setSlots] = useState([emptySlot(0), emptySlot(1), emptySlot(2), emptySlot(3)]);

  const handleFileChange = (event, slotId) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSlots(prev =>
      prev.map(slot => {
        if (slot.id === slotId) {
          if (slot.url) URL.revokeObjectURL(slot.url);
          return { id: slotId, file, url };
        }
        return slot;
      }),
    );
  };

  const clearSlot = slotId => {
    setSlots(prev =>
      prev.map(slot => {
        if (slot.id === slotId) {
          if (slot.url) URL.revokeObjectURL(slot.url);
          return emptySlot(slotId);
        }
        return slot;
      }),
    );
  };

  return (
    <section className="multimedia-shell">
      <header className="multimedia-header">
        <h1>Realtime Monitor</h1>
        <p>Load up to four video feeds to watch simultaneously.</p>
      </header>
      <div className="multimedia-grid">
        {slots.map(slot => (
          <article key={slot.id} className="multimedia-card">
            <div className="multimedia-video-wrapper">
              {slot.url ? (
                <video src={slot.url} controls playsInline />
              ) : (
                <span className="multimedia-placeholder">Select a video to begin playback</span>
              )}
            </div>
            <div className="multimedia-actions">
              <label className="file-button">
                <input
                  type="file"
                  accept="video/*"
                  onChange={event => handleFileChange(event, slot.id)}
                />
                {slot.url ? 'Replace video' : 'Upload video'}
              </label>
              {slot.url && (
                <button type="button" onClick={() => clearSlot(slot.id)}>
                  Clear
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default MultimediaPage;
