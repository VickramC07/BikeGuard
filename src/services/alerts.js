const EMAIL_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

const buildError = message => new Error(message ?? 'Unable to send alert email.');

export const sendSuspiciousActivityEmail = async (recipientEmail, metadata = {}) => {
  if (!recipientEmail) {
    throw buildError('Recipient email not available.');
  }

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw buildError('Email service is not configured. Add EmailJS credentials to the environment.');
  }

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: recipientEmail,
      subject: 'potential bike theft',
      message:
        metadata.message ??
        'BikeGuard detected suspicious activity. Review your live feed and secure your bike immediately.',
      ...metadata.templateParams,
    },
  };

  const response = await fetch(EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw buildError(text || 'Email request failed.');
  }

  return true;
};
