const AUTH_ERROR_MAP = {
  'auth/configuration-not-found':
    'Google sign-in is not enabled for this Firebase project. Enable the Google provider and add your domain in the Firebase console.',
  'auth/popup-blocked':
    'Allow pop-ups in your browser to continue with Google sign-in.',
  'auth/popup-closed-by-user': 'The sign-in window was closed before completing the process.',
};

export const formatAuthError = error => {
  if (!error) return 'Unexpected authentication error occurred.';
  if (error.code && AUTH_ERROR_MAP[error.code]) {
    return AUTH_ERROR_MAP[error.code];
  }
  if (error.message) {
    return error.message.replace('Firebase:', '').trim();
  }
  return 'Unexpected authentication error occurred.';
};
