import React from "react";
function PrivacyConsentModal({ onAllow, onDeny }) {
  return (
    <div className="modal-overlay">
      <div className="consent-modal">
        <h2>Privacy consent</h2>
        <p>Allow a one-time export of your rehabilitation data to your physiotherapist?</p>
        <div className="consent-actions">
          <button className="allow-button" onClick={onAllow}>Allow once</button>
          <button className="deny-button" onClick={onDeny}>Deny</button>
        </div>
      </div>
    </div>
  );
}
export default PrivacyConsentModal;
