import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StartPage from './pages/StartPage.jsx';
import SignInPage from './pages/SignInPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import HomePage from './pages/HomePage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import MultimediaPage from './pages/MultimediaPage.jsx';
import LiveAudioPage from './pages/RealtimePage.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import './styles/app-shell.css';

const App = () => (
  <div className="app-shell">
    <Navbar />
    <main className="app-main">
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/realtime" element={<MultimediaPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/liveaudio" element={<LiveAudioPage />} />
        </Route>
        <Route path="*" element={<StartPage />} />
      </Routes>
    </main>
  </div>
);

export default App;
