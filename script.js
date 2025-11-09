// =========================
// Current year in footer
// =========================
(function () {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/* =========================
   Map (Leaflet + OpenStreetMap) — NO API KEY
   =========================
   Expects /data/work_locations.json:
   [
     {"title":"Rooftop RTU Service","lat":29.4241,"lng":-98.4936,"note":"Downtown SA - RTU belt & bearings"},
     ...
   ]
*/
(function () {
  const el = document.getElementById('work-map');
  if (!el) return;

  // Require Leaflet (ensure <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"> is included)
  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded. Include Leaflet CSS/JS in index.html.');
    return;
  }

  // Create map
  const map = L.map('work-map', { scrollWheelZoom: false });

  // OpenStreetMap tiles (free; please be considerate of usage)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Load markers
  fetch('data/work_locations.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(points => {
      const bounds = L.latLngBounds();
      const markers = [];

      (points || []).forEach(p => {
        const lat = Number(p.lat), lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const m = L.marker([lat, lng], {
          title: p.title || 'Job location'
        }).addTo(map);

        m.bindPopup(
          `<strong style="color:#0a3d91">${escapeHtml(p.title || 'Job')}</strong><br>` +
          `<small>${escapeHtml(p.note || '')}</small>`
        );

        markers.push(m);
        bounds.extend(m.getLatLng());
      });

      if (markers.length) {
        map.fitBounds(bounds, { padding: [60, 60] });
      } else {
        // Bexar County-ish fallback
        map.setView([29.512, -98.5], 10);
      }
    })
    .catch(e => {
      console.warn('Could not load work_locations.json', e);
      map.setView([29.512, -98.5], 10);
    });
})();

// Simple HTML escaper for popup content
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"'`=\/]/g, s =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[s])
  );
}

/* =========================
   Service form — mailto helper
   =========================
   - Keeps the guaranteed “sends to service@bexarmechanical.com” via mailto.
   - If you prefer Formspree (no email client), see comment below.
*/
(function () {
  const form = document.getElementById('service-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    const data = new FormData(form);
    const name = (data.get('name') || '').toString().trim();
    const phone = (data.get('phone') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const address = (data.get('address') || '').toString().trim();
    const message = (data.get('message') || '').toString().trim();

    // Basic required validation
    if (!name || !phone || !email || !message) {
      alert('Please fill Name, Phone, Email, and Issue.');
      e.preventDefault();
      return;
    }

    const subject = encodeURIComponent(`[Service Request] ${name} — ${phone}`);
    const body = encodeURIComponent(
`Name: ${name}
Phone: ${phone}
Email: ${email}
Address: ${address}

Issue:
${message}
`
    );
    form.action = `mailto:service@bexarmechanical.com?subject=${subject}&body=${body}`;

    // To use Formspree instead (no mail client), do this:
    // e.preventDefault();
    // fetch('https://formspree.io/f/yourFormId', {
    //   method: 'POST',
    //   headers: { 'Accept': 'application/json' },
    //   body: new FormData(form)
    // }).then(() => {
    //   alert('Thanks! We received your request.');
    //   form.reset();
    // }).catch(() => alert('Sorry—something went wrong.'));
  });
})();
