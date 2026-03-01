(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const form = document.getElementById('service-request-form');
  if (!form) {
    return;
  }

  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('service-submit');
  const submittedAtInput = document.getElementById('submittedAt');

  const setSubmittedAt = () => {
    if (submittedAtInput) {
      submittedAtInput.value = String(Date.now());
    }
  };

  const setStatus = (message, type) => {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message || '';
    statusEl.classList.remove('is-error', 'is-success');

    if (type === 'error') {
      statusEl.classList.add('is-error');
    }
    if (type === 'success') {
      statusEl.classList.add('is-success');
    }
  };

  setSubmittedAt();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus('Please complete all required fields.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }

    setStatus('Sending request...');

    const formData = new FormData(form);
    const payload = {
      fullName: String(formData.get('fullName') || '').trim(),
      company: String(formData.get('company') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      serviceType: String(formData.get('serviceType') || '').trim(),
      urgency: String(formData.get('urgency') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      preferredWindow: String(formData.get('preferredWindow') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      consent: Boolean(formData.get('consent')),
      website: String(formData.get('website') || ''),
      submittedAt: Number(formData.get('submittedAt') || 0),
      pageUrl: window.location.href
    };

    try {
      const response = await fetch(form.action || '/api/request-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Unable to send your request right now.');
      }

      form.reset();
      setSubmittedAt();
      setStatus(data.message || 'Thanks. Your request has been sent.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send your request right now.';
      setStatus(message + ' Please call us directly if this is urgent.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  });
})();
