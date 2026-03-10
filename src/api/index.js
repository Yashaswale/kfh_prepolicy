import { ENDPOINTS } from './config';
import { apiRequest, apiRequestForm } from './client';

// Auth APIs
export function registerUser(payload) {
  return apiRequest(ENDPOINTS.register, {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export function loginUser(payload) {
  return apiRequest(ENDPOINTS.login, {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export function refreshAccessToken(refresh) {
  return apiRequest(ENDPOINTS.refreshToken, {
    method: 'POST',
    body: { refresh },
    auth: false,
  });
}

// Customer / inspection APIs
export function sendInspectionLink(payload) {
  return apiRequest(ENDPOINTS.sendInspectionLink, {
    method: 'POST',
    body: payload,
  });
}

export function listInspections(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const qs = params.toString();
  const path = qs ? `${ENDPOINTS.listInspections}?${qs}` : ENDPOINTS.listInspections;

  return apiRequest(path, { method: 'GET' });
}

export function getInspectionOcr(id) {
  if (!id) {
    return Promise.reject(new Error('Inspection id is required for OCR request'));
  }
  const path = `${ENDPOINTS.inspectionOcrBase}/${id}/ocr/`;
  return apiRequest(path, { method: 'GET' });
}

export function verifyInspectionLink(payload) {
  return apiRequest(ENDPOINTS.verifyLink, {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export function regenerateInspectionLink(payload) {
  return apiRequest(ENDPOINTS.regenerateLink, {
    method: 'POST',
    body: payload,
  });
}

export function getAccountSummary(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const qs = params.toString();
  const path = qs ? `${ENDPOINTS.accountSummary}?${qs}` : ENDPOINTS.accountSummary;

  return apiRequest(path, { method: 'GET' });
}

export function uploadInspectionOcr(formData) {
  return apiRequestForm(ENDPOINTS.uploadInspectionOcr, {
    method: 'POST',
    formData,
    auth: false,
  });
}

export function getDamageResults(id) {
  if (!id) {
    return Promise.reject(new Error('Inspection id is required for damage results'));
  }
  const path = `${ENDPOINTS.damageResultsBase}/${id}/damage-results/`;
  return apiRequest(path, { method: 'GET' });
}

export function editInspectionOcr(mediaId, detectedText) {
  if (!mediaId) {
    return Promise.reject(new Error('Media id is required for editing OCR'));
  }
  const path = `${ENDPOINTS.editOcrBase}/${mediaId}/`;
  return apiRequest(path, {
    method: 'PUT',
    body: { detected_text: detectedText },
  });
}

export function getWindshieldResults(inspectionId) {
  if (!inspectionId) {
    return Promise.reject(new Error('Inspection id is required for windshield results'));
  }
  const path = `${ENDPOINTS.windshieldResultsBase}/${inspectionId}/`;
  return apiRequest(path, { method: 'GET' });
}
