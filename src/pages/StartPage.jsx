import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTypingEffect } from '../hooks/useTypingEffect.js';
import '../styles/start-page.css';

const StartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const heroText = useTypingEffect('Receive instant alerts', 70);

  const handleCTA = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/signin');
    }
  };

  return (
    <section className="start-shell">
      <div className="start-glow" />
      <div className="start-card">
        <p className="start-kicker">Smart security for every ride</p>
        <h1 className="start-title">BikeGuard</h1>
        <p className="start-subtitle">{heroText || 'Receive instant alerts'}</p>
        <p className="start-description">
          Harness AI-powered monitoring and live analytics to keep your bike safe wherever you go.
        </p>
        <button type="button" className="cta-button" onClick={handleCTA}>
          {user ? 'Enter dashboard' : 'Get started'}
        </button>
      </div>
    </section>
  );
};

export default StartPage;
