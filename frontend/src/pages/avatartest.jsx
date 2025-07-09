import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 

import Avatar from "../components/avatar";

function AvatarPage() {
    const navigate = useNavigate();
  return (
    <div style={{ top: 0, left: 0, width: '100vw', height: '100vh', padding: '3rem 3rem 3rem 3rem', overflow: 'auto', alignContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', }}>
      <div style={{display: 'flex', flexDirection: 'row', gap: '2rem', justifyContent: 'center', marginBottom: '3rem' }}>
        <button
            className="chat-back-button"
            style={{fontSize: '2.3rem' }}
            onClick={() => navigate('/services')}
            title="Back to Services">
            &#8592;
        </button>
        <h1 style={{ textAlign: 'center', fontSize: '2rem', margin: '1rem 0 1rem 0' }}>Avatar Test Page</h1>
      </div>
      <div id="avatar-container">
        <Avatar/>
      </div>
    </div>
  );
}
export default AvatarPage;