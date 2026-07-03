export const API_BASE_URL = 'https://api.dezzex.ae/api';

export const ENDPOINTS = {
  // Auth
  register: '/users/register/',
  login: '/users/login/',
  refreshToken: '/users/token/refresh/',
  listSupervisors: '/users/supervisors/',
  listSubUsers: '/users/supervisors/{supervisor_id}/sub-users/',
  createSubUser: '/users/sub-user/create/',
  updateUser: '/users/users/{user_id}/',
  deleteUser: '/users/users/{user_id}/',

  // Customers
  sendInspectionLink: '/customers/send-link/',
  listInspections: '/customers/list/',
  verifyLink: '/customers/verify-link/',
  regenerateLink: '/customers/regenerate-link/',
  accountSummary: '/customers/account-summary/',
  inspectionOcrBase: '/customers/inspection',
  uploadInspectionOcr: '/customers/inspection/upload-ocr/',
  uploadDamageImages: '/customers/inspection/upload-damage-images/',
  startAssessment: '/customers/inspection/start-assessment/',
  uploadWindshieldImages: '/customers/inspection/upload-windshield-images/',
  startWindshieldAssessment: '/customers/inspection/start-windshield-assessment/',
  editOcrBase: '/customers/inspection/edit-ocr',
  damageResultsBase: '/customers/inspection',
  windshieldResultsBase: '/customers/inspection/windshield-results',
  editDamageAiBase: '/customers/inspection/edit-damage-ai',
  editWindshieldAiBase: '/customers/inspection/edit-windshield-ai',
  reassessDamageResult: '/customers/inspection/damage/reassess/',
  editCorrectIncorrectResult: '/customers/inspections/{inspection_id}/mark-result/',
  markAsViewed: '/customers/inspection/{inspection_id}/mark-as-viewed/',
  rotateDamageMedia: '/customers/inspection-damage-media/{media_id}/rotate/',
  supervisorAccountsSummary: '/customers/inspection/admin/supervisor-accounts-summary/',
  subUsersSummary: '/customers/inspection/supervisors/{supervisor_id}/sub-users-summary/',
};