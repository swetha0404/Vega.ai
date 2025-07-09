import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './MainLayout.css';
import Sidebar from '../components/sidebar.jsx';
import Topbar from '../components/top_bar.jsx';

function ApplicationsPage() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Trigger animation after component mounts
    setIsLoaded(true);
  }, []);

  return (
    <div className="main-layout">
      <Topbar />

      <Sidebar />
      <main className={`main-content`}>
        <div className="page-title-container">
          <button 
            className={`back-arrow-btn ${isLoaded ? 'slide-in-left' : ''}`} 
            onClick={() => navigate('/applications')} 
            title="Back to Applications"
            style={{ visibility: isLoaded ? 'visible' : 'hidden' }}
          >
            &#8592;
          </button>
          <h1 
            className={`page-title ${isLoaded ? 'slide-in-top' : ''}`}
            style={{ 
              fontFamily: 'Orbitron', 
              visibility: isLoaded ? 'visible' : 'hidden'
            }}
          >
            Services
          </h1>
        </div>        
        <section className="applications-section">
          <div className="cards-row">
            
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 
              onClick={() => navigate('/chatpage')} 
              style={{ 
                cursor: 'pointer',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '0.3s'
              }}
            >
              <div className="card-title">PingFederate</div>
              <img src="/PF-Logo.png" alt="PingFederate" className="card-img" />
            </div>
            
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 
              style={{ 
                cursor: 'pointer',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '0.8s'
              }}
            >
              <div className="card-title">Google Workspace</div>
              <img src="/Google_logo.png" alt="Google Workspace" className="card-img" />
            </div>

            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 
              onClick={() => navigate('/voicetotest')}
              style={{ 
                cursor: 'pointer',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '1.3s'
              }}
            >
              <div className="card-title">(VoicetoText Test)</div>
              <img src="/Salesforce_logo.svg" alt="VoicetoText" className="card-img" />
            </div>
            
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 
              onClick={() => navigate('/tts')}
              style={{ 
                cursor: 'pointer',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '1.8s'
              }}
            >
              <div className="card-title">(Text to Speech Test)</div>
              <img src="/servicenow.png" alt="Text to Speech" className="card-img" />
            </div> 
            
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 
              onClick={() => navigate('/aiavatar')}
              style={{ 
                cursor: 'pointer',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '2.3s'
              }}
            >
              <div className="card-title">AI Avatar Assistant</div>
              <img src="/slack.png" alt="Heygen" className="card-img" />
            </div>

          </div>
        </section>
      </main>

    </div>
  );
}

export default ApplicationsPage; 