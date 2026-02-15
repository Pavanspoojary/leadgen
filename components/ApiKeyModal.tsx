import React from 'react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

/**
 * @deprecated API Key management is now handled exclusively via process.env.API_KEY.
 * Manual entry is disabled per security guidelines.
 */
const ApiKeyModal: React.FC<ApiKeyModalProps> = () => {
  return null;
};

export default ApiKeyModal;