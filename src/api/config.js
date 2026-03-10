export const API_BASE_URL = 'https://api.dezzex.ae/api';

export const ENDPOINTS = {
  // Auth
  register: '/users/register/',
  login: '/users/login/',
  refreshToken: '/users/token/refresh/',

  // Customers
  sendInspectionLink: '/customers/send-link/',
  listInspections: '/customers/list/',
  verifyLink: '/customers/verify-link/',
  regenerateLink: '/customers/regenerate-link/',
  accountSummary: '/customers/account-summary/',
  inspectionOcrBase: '/customers/inspection',
  uploadInspectionOcr: '/customers/inspection/upload-ocr/',
  editOcrBase: '/customers/inspection/edit-ocr',
  damageResultsBase: '/customers/inspection',
  windshieldResultsBase: '/customers/inspection/windshield-results',
};

