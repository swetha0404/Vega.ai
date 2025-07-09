import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MainLayout.css';
import Sidebar from '../components/sidebar';
import Topbar from '../components/top_bar';


function MainLayout() {
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

      <main className='main-content'>

            <div className="page-title-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <h1 className="page-title slide-in-top" style={{ fontFamily: 'Orbitron'}}>Applications</h1>
              {/* <h1 className="page-title slide-in-top" style={{ fontFamily: 'ExpansivaBold', color: '#5afbc1', fontSize: '4.5em', background: 'rgba(38,38,38,255)', width: '5em', height: '2em', padding: '0.5em' }}>Vega</h1> */}
              <h3 className="slide-in-top" style={{ fontFamily: 'ExpansivaBoldItalic', animationDelay: '0.2s' }}> Up to date AI-powered assistance to guide you.</h3>
            </div> 
            <section className="applications-section">
              <div className="cards-row">
                <div 
                  className={`app-card-home ${isLoaded ? 'bounce-in-top' : ''}`} 
                  onClick={() => navigate('/services')} 
                  style={{ 
                    cursor: 'pointer',
                    visibility: isLoaded ? 'visible' : 'hidden',
                    animationDelay: '0.5s'
                  }}
                >
                  <div className="card-title-home" style={{ fontFamily: 'ExpansivaBold' }}>SP Connections</div>
                  <img src="/SP-Connections.png" alt="SP Connections" className="card-img" />
                </div>
                <div 
                  className={`app-card-home ${isLoaded ? 'bounce-in-top' : ''}`} 
                  onClick={() => navigate('/services')} 
                  style={{ 
                    cursor: 'pointer',
                    visibility: isLoaded ? 'visible' : 'hidden',
                    animationDelay: '1.5s'
                  }}
                >
                  <div className="card-title-home" style={{ fontFamily: 'ExpansivaBold' }}>OAuth Clients</div>
                  <img src="/OAUTH.png" alt="OAuth Clients" className="card-img" />
                </div>
              </div>
            </section>
      </main>
    </div>
  );
}

export default MainLayout;