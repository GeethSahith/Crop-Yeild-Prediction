const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const transliterateToTelugu = async (name) => {
  if (!name) return '';

  try {
    const response = await fetch(`${API_URL}/api/translate-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, target_language: 'te' }),
    });

    const data = await response.json();

    if (data.success && data.translated) {
      return data.translated;
    }
    return name;
  } catch (err) {
    console.error('Name translation failed:', err);
    return name;
  }
};
