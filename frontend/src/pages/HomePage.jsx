import { useState, useEffect } from 'react';
import { useNavigate} from 'react-router-dom';
import './homeLayout.css';
import Sidebar from '../components/sidebar';
import Topbar from '../components/topBar';


function MainLayout() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  useEffect(() => {
    // Trigger animation after component mounts
    setIsLoaded(true);
  }, []);

  return (
    <div className="main-layout">
      
      <Topbar toggleSidebar={toggleSidebar}/>
      
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <main className='main-content'>

            <div className="page-title-container">
              <h1 className="page-title slide-in-top" style={{ fontFamily: 'Orbitron', color: '#cfd6e0'}}>Applications</h1>
              <h3 className="slide-in-top" style={{ fontFamily: 'ExpansivaBoldItalic', animationDelay: '0.2s', color: '#cfd6e0' }}> Up to date AI-powered assistance to guide you.</h3>
            </div> 
            <section className="applications-section">
              <div className="cards-row">
                {/* -------------All cards----------------- */}
                {/* card for PingFederate */}
                <div 
                  className={`app-card-home ${isLoaded ? 'bounce-in-top' : ''}`} 
                  // title="PingFederate"
                  style={{ 
                    cursor: 'pointer',
                    visibility: isLoaded ? 'visible' : 'hidden',
                    animationDelay: '0.3s',
                    backgroundColor: '#121a3f'
                  }}
                >
                  <div className="card-content">
                    <img src="/PF-Logo-White.png" alt="PingFederate" className="card-img" />
                  </div>
                  <div className="dropdown-menu">
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingFederate SP-Connections'>
                      <img src="/SP-Connections.png" alt="SP Connections" className="dropdown-icon" />
                    </div>
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingFederate OAuth'>
                      <img src="/OAUTH.png" alt="OAuth" className="dropdown-icon" />
                    </div>
                  </div>
                </div>

                {/* card for PingOne */}
                <div 
                  className={`app-card-home ${isLoaded ? 'bounce-in-top' : ''}`} 
                  // title="PingOne"
                  style={{ 
                    cursor: 'pointer',
                    visibility: isLoaded ? 'visible' : 'hidden',
                    animationDelay: '0.6s',
                    backgroundColor: '#121a3f'
                  }}
                >
                  <div className="card-content">
                    <img src="/PO-Logo-White.png" alt="PingOne" className="card-img" />
                  </div>
                  <div className="dropdown-menu">
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingOne SP-Connections'>
                      <img src="/SP-Connections.png" alt="SP Connections" className="dropdown-icon" />
                    </div>
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingOne OAuth'>
                      <img src="/OAUTH.png" alt="OAuth" className="dropdown-icon" />
                    </div>
                  </div>
                </div>
                
                {/* card for PingDirectory */}
                <div 
                  className={`app-card-home ${isLoaded ? 'bounce-in-top' : ''}`} 
                  // title="PingDirectory"
                  style={{ 
                    cursor: 'pointer',
                    visibility: isLoaded ? 'visible' : 'hidden',
                    animationDelay: '0.9s',
                    backgroundColor: '#121a3f'
                  }}
                >
                  <div className="card-content">
                    <img 
                    src="/PD-White.png" 
                    alt="PingDirectory" 
                    style={{ width: '250px', height: 'auto' }} />
                    </div>
                  <div className="dropdown-menu">
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingDirectory SP-Connections'>
                      <img src="/SP-Connections.png" alt="SP Connections" className="dropdown-icon"/>
                    </div>
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingDirectory OAuth'>
                      <img src="/OAUTH.png" alt="OAuth" className="dropdown-icon"/>
                    </div>
                  </div>
                </div>
                
                {/* card for PingIDM */}
                <div 
                  className={`app-card-home ${isLoaded ? 'bounce-in-top' : ''}`} 
                  // title="PingIDM"
                  style={{ 
                    cursor: 'pointer',
                    visibility: isLoaded ? 'visible' : 'hidden',
                    animationDelay: '1.2s',
                    backgroundColor: '#121a3f'
                  }}
                >
                  <div className="card-content">
                    <img src="/PI-Logo-White.png" alt="PingIDM" className="card-img" />
                  </div>
                  <div className="dropdown-menu">
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingIDM SP-Connections'>
                      <img src="/SP-Connections.png" alt="SP Connections" className="dropdown-icon" />
                    </div>
                    <div className="dropdown-option" onClick={() => navigate('/services')} title='PingIDM OAuth'>
                      <img src="/OAUTH.png" alt="OAuth" className="dropdown-icon" />
                    </div>
                  </div>
                </div>
                {/* ---------------------------------------------------------------------------------- */}
              </div>
            </section>
      </main>
    </div>
  );
}

export default MainLayout;