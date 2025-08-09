import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './homeLayout.css';
import Sidebar from '../components/sidebar.jsx';
import Topbar from '../components/topBar.jsx';

function ApplicationsPage() {
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
      <Topbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <main className={`main-content`}>
        <div className="page-title-container">
          <button 
            className={`back-arrow-btn ${isLoaded ? 'slide-in-left' : ''}`} 
            onClick={() => navigate('/applications')} 
            title="Back to Applications"
            style={{ visibility: isLoaded ? 'visible' : 'hidden', color: '#cfd6e0' }}
          >
            &#8592;
          </button>
          <h1 
            className={`page-title ${isLoaded ? 'slide-in-top' : ''}`}
            style={{ 
              fontFamily: 'Orbitron', 
              visibility: isLoaded ? 'visible' : 'hidden',
              color: '#cfd6e0'
            }}
          >
            Services
          </h1>
        </div>        
        <section className="applications-section">
          <div className="cards-row">
            {/* ################################################################################# */}
            {/* ------------------------------------------------------------------------ */}
            {/* Google Workspace */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 
              onClick={() => navigate('/chatpage')}
              style={{ 
                cursor: 'pointer',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '0.3s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">Google Workspace</div> */}
              <img src="/Google-Logo.png" alt="Google Workspace" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}
            {/* Salesforce */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 
              onClick={() => navigate('/chatpage')}
              style={{ 
                cursor: 'pointer',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '0.6s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">Salesforce</div> */}
              <img src="/Salesforce-Logo.svg" alt="Salesforce" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}
            {/* ServiceNow */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 

              style={{ 
                cursor: 'not-allowed',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '0.9s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">ServiceNow</div> */}
              <img src="/ServiceNow-Logo.png" alt="ServiceNow" className="card-img" />
            </div> 
            {/* ------------------------------------------------------------------------ */}
            {/* Slack */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 

              style={{ 
                cursor: 'not-allowed',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '1.2s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">Slack</div> */}
              <img src="/Slack-Logo.png" alt="Slack" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}
            {/* Informatica */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 

              style={{ 
                cursor: 'not-allowed',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '1.5s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">Informatica</div> */}
              <img src="/Informatica-Logo.png" alt="Informatica" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}
            {/* Sharepoint*/}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 

              style={{ 
                cursor: 'not-allowed',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '1.8s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">SharePoint</div> */}
              <img src="/Sharepoint-Logo.png" alt="SharePoint" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}
            {/* VMWare */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 

              style={{ 
                cursor: 'not-allowed',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '2.1s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">VMWare</div> */}
              <img src="/VMWare-Logo.png" alt="VMWare" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}
            {/* Workday */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 

              style={{ 
                cursor: 'not-allowed',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '2.4s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">Workday</div> */}
              <img src="/Workday-Logo.png" alt="Workday" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}
            {/* Adobe Creative Cloud */}
            <div 
              className={`app-card ${isLoaded ? 'bounce-in-bck' : ''}`} 

              style={{ 
                cursor: 'not-allowed',
                visibility: isLoaded ? 'visible' : 'hidden',
                animationDelay: '2.7s',
                backgroundColor: '#121a3f'
              }}
            >
              {/* <div className="card-title">Adobe Creative Cloud</div> */}
              <img src="/Adobe-Logo.png" alt="Adobe Creative Cloud" className="card-img" />
            </div>
            {/* ------------------------------------------------------------------------ */}

            {/* ################################################################################# */}
          </div>
        </section>
      </main>

    </div>
  );
}

export default ApplicationsPage;