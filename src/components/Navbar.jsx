import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import bikeLogo from '../assets/bike-logo.svg';
import '../styles/navbar.css';

const navItems = [
  { to: '/upload', label: 'Upload' },
  { to: '/liveaudio', label: 'LiveAudio' },
  { to: '/library', label: 'Library' },
  { to: '/realtime', label: 'Realtime' },
];

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goHome = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="nav-root">
      <button type="button" className="nav-logo" onClick={goHome}>
        <img src={bikeLogo} alt="BikeGuard" />
        <span>BikeGuard</span>
      </button>
      <nav className="nav-links">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-link ${isActive || location.pathname === '/home' && item.to === '/library' ? 'nav-link-active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-actions">
        {user ? (
          <button className="pill-button" type="button" onClick={signOut}>
            Sign out
          </button>
        ) : (
          <button className="pill-button" type="button" onClick={() => navigate('/signin')}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;
