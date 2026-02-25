/**
 * ARCA Factura Automatica - Popup Script
 * Maneja la interfaz de configuracion y lanza la automatizacion.
 */

// ===================== HELPERS =====================
function getCurrentMonthYear() {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const now = new Date();
  return `${meses[now.getMonth()]} ${now.getFullYear()}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function getDefaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const lastDay = new Date(y, m + 1, 0).getDate();
  const nextMonth = m + 1 > 11 ? 0 : m + 1;
  const nextYear = m + 1 > 11 ? y + 1 : y;
  return {
    fechaEmision: `${pad(now.getDate())}/${pad(m + 1)}/${y}`,
    periodoDesde: `01/${pad(m + 1)}/${y}`,
    periodoHasta: `${pad(lastDay)}/${pad(m + 1)}/${y}`,
    vencimientoPago: `10/${pad(nextMonth + 1)}/${nextYear}`
  };
}

// ===================== DEFAULT CONFIG =====================
const DEFAULT_CONFIG = {
  empresaNombre: '',
  puntoDeVenta: '',
  tipoComprobante: '2',
  idConcepto: '2',
  actividadAsociada: '',
  monedaExtranjera: false,
  moneda: 'PES',
  receptor: {
    condicionIVA: '1',
    tipoDoc: '80',
    nroDoc: '',
    email: '',
    formaDePago: '91'
  },
  fechas: getDefaultDates(),
  items: [
    {
      descripcion: `Servicios Profesionales ${getCurrentMonthYear()}`,
      cantidad: '1',
      medida: '7',
      precioUnitario: ''
    }
  ]
};

// ===================== DOM HELPERS =====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===================== TABS =====================
function initTabs() {
  const tabs = $$('.tab');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      $$('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      $(`#tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

// ===================== ITEMS MANAGEMENT =====================
let itemsData = [];

function createItemCard(item, idx) {
  const card = document.createElement('div');
  card.className = 'item-card';

  // Header
  const header = document.createElement('div');
  header.className = 'item-header';
  const title = document.createElement('strong');
  title.textContent = `Item ${idx + 1}`;
  header.appendChild(title);

  if (itemsData.length > 1) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-item';
    removeBtn.dataset.idx = idx;
    removeBtn.title = 'Eliminar';
    removeBtn.textContent = '\u2715';
    removeBtn.addEventListener('click', () => {
      itemsData.splice(idx, 1);
      renderItems();
    });
    header.appendChild(removeBtn);
  }
  card.appendChild(header);

  // Description field
  const descField = document.createElement('div');
  descField.className = 'field';
  const descLabel = document.createElement('label');
  descLabel.textContent = 'Descripcion';
  const descInput = document.createElement('textarea');
  descInput.className = 'item-desc';
  descInput.dataset.idx = idx;
  descInput.placeholder = 'Ej: Servicios Profesionales Enero 2026';
  descInput.value = item.descripcion;
  descInput.addEventListener('input', () => { itemsData[idx].descripcion = descInput.value; });
  descField.appendChild(descLabel);
  descField.appendChild(descInput);
  card.appendChild(descField);

  // Row: precio, cantidad, medida
  const row = document.createElement('div');
  row.className = 'item-row';

  // Precio
  const precioField = document.createElement('div');
  precioField.className = 'field';
  const precioLabel = document.createElement('label');
  precioLabel.textContent = 'Precio Unit.';
  const precioInput = document.createElement('input');
  precioInput.type = 'text';
  precioInput.className = 'item-precio';
  precioInput.dataset.idx = idx;
  precioInput.value = item.precioUnitario;
  precioInput.placeholder = '5000';
  precioInput.addEventListener('input', () => { itemsData[idx].precioUnitario = precioInput.value; });
  precioField.appendChild(precioLabel);
  precioField.appendChild(precioInput);
  row.appendChild(precioField);

  // Cantidad
  const cantField = document.createElement('div');
  cantField.className = 'field';
  const cantLabel = document.createElement('label');
  cantLabel.textContent = 'Cantidad';
  const cantInput = document.createElement('input');
  cantInput.type = 'text';
  cantInput.className = 'item-cantidad';
  cantInput.dataset.idx = idx;
  cantInput.value = item.cantidad;
  cantInput.placeholder = '1';
  cantInput.addEventListener('input', () => { itemsData[idx].cantidad = cantInput.value; });
  cantField.appendChild(cantLabel);
  cantField.appendChild(cantInput);
  row.appendChild(cantField);

  // Medida
  const medField = document.createElement('div');
  medField.className = 'field';
  const medLabel = document.createElement('label');
  medLabel.textContent = 'Medida';
  const medSelect = document.createElement('select');
  medSelect.className = 'item-medida';
  medSelect.dataset.idx = idx;
  const medOptions = [
    { value: '7', text: 'Unidades' },
    { value: '1', text: 'Kilogramos' },
    { value: '2', text: 'Metros' },
    { value: '5', text: 'Litros' },
    { value: '98', text: 'Otras' }
  ];
  medOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    if (item.medida === opt.value) option.selected = true;
    medSelect.appendChild(option);
  });
  medSelect.addEventListener('change', () => { itemsData[idx].medida = medSelect.value; });
  medField.appendChild(medLabel);
  medField.appendChild(medSelect);
  row.appendChild(medField);

  card.appendChild(row);
  return card;
}

function renderItems() {
  const container = $('#items-container');
  container.textContent = '';

  itemsData.forEach((item, idx) => {
    container.appendChild(createItemCard(item, idx));
  });
}

function addItem() {
  itemsData.push({ descripcion: '', cantidad: '1', medida: '7', precioUnitario: '' });
  renderItems();
}

// ===================== LOAD / SAVE CONFIG =====================
function getConfigFromUI() {
  return {
    empresaNombre: $('#empresaNombre').value.trim(),
    puntoDeVenta: $('#puntoDeVenta').value.trim(),
    tipoComprobante: $('#tipoComprobante').value,
    idConcepto: $('#idConcepto').value,
    actividadAsociada: $('#actividadAsociada').value.trim(),
    monedaExtranjera: $('#monedaExtranjera').checked,
    moneda: $('#moneda').value,
    receptor: {
      condicionIVA: $('#receptorCondicionIVA').value,
      tipoDoc: $('#receptorTipoDoc').value,
      nroDoc: $('#receptorNroDoc').value.trim(),
      email: $('#receptorEmail').value.trim(),
      formaDePago: $('#formaDePago').value
    },
    fechas: {
      fechaEmision: $('#fechaEmision').value.trim(),
      periodoDesde: $('#periodoDesde').value.trim(),
      periodoHasta: $('#periodoHasta').value.trim(),
      vencimientoPago: $('#vencimientoPago').value.trim()
    },
    items: itemsData
  };
}

function setUIFromConfig(config) {
  $('#empresaNombre').value = config.empresaNombre || '';
  $('#puntoDeVenta').value = config.puntoDeVenta || '';
  $('#tipoComprobante').value = config.tipoComprobante || '2';
  $('#idConcepto').value = config.idConcepto || '2';
  $('#actividadAsociada').value = config.actividadAsociada || '';
  $('#monedaExtranjera').checked = config.monedaExtranjera || false;
  $('#moneda').value = config.moneda || 'PES';
  toggleMonedaGroup();

  const r = config.receptor || {};
  $('#receptorCondicionIVA').value = r.condicionIVA || '1';
  $('#receptorTipoDoc').value = r.tipoDoc || '80';
  $('#receptorNroDoc').value = r.nroDoc || '';
  $('#receptorEmail').value = r.email || '';
  $('#formaDePago').value = r.formaDePago || '91';

  const defaults = getDefaultDates();
  const f = config.fechas || {};
  $('#fechaEmision').value = f.fechaEmision || defaults.fechaEmision;
  $('#periodoDesde').value = f.periodoDesde || defaults.periodoDesde;
  $('#periodoHasta').value = f.periodoHasta || defaults.periodoHasta;
  $('#vencimientoPago').value = f.vencimientoPago || defaults.vencimientoPago;

  itemsData = (config.items && config.items.length > 0) ? [...config.items] : [{ ...DEFAULT_CONFIG.items[0] }];
  renderItems();
}

function toggleMonedaGroup() {
  $('#monedaGroup').style.display = $('#monedaExtranjera').checked ? 'block' : 'none';
}

async function saveConfig(triggerBtn) {
  const config = getConfigFromUI();
  await chrome.storage.local.set({ afipConfig: config });
  updateStatus('Configuracion guardada correctamente.', 'success');

  // Visual feedback on the button that was clicked
  if (triggerBtn && triggerBtn.classList) {
    const originalText = triggerBtn.textContent;
    triggerBtn.classList.add('btn-save-success');
    triggerBtn.textContent = 'Guardado!';
    setTimeout(() => {
      triggerBtn.classList.remove('btn-save-success');
      triggerBtn.textContent = originalText;
    }, 1500);
  }
}

async function loadConfig() {
  const result = await chrome.storage.local.get('afipConfig');
  const config = result.afipConfig || DEFAULT_CONFIG;

  setUIFromConfig(config);
}

// ===================== STATUS =====================
function updateStatus(text, type = 'info') {
  const box = $('#statusBox');
  const statusText = $('#statusText');
  box.className = 'status-box ' + (type || '');
  statusText.textContent = text;
}

// ===================== RUN AUTOMATION =====================
async function runAutomation() {
  // Auto-save before running
  const config = getConfigFromUI();
  await chrome.storage.local.set({ afipConfig: config });

  // Check if we're on the AFIP page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes('fe.afip.gob.ar')) {
    updateStatus(
      'No estas en la pagina de ARCA. Usa el enlace de arriba para ingresar primero.',
      'error'
    );
    return;
  }

  updateStatus('Ejecutando automatizacion...', 'running');
  $('#btn-run').disabled = true;
  $('#btn-stop').disabled = false;

  // Send message to content script
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'START_AUTOMATION',
      config: config
    });
  } catch (err) {
    updateStatus(`Error: ${err.message}. Recarga la pagina de ARCA e intenta de nuevo.`, 'error');
    $('#btn-run').disabled = false;
    $('#btn-stop').disabled = true;
  }
}

async function stopAutomation() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'STOP_AUTOMATION' });
  }
  updateStatus('Automatizacion detenida por el usuario.', 'info');
  $('#btn-run').disabled = false;
  $('#btn-stop').disabled = true;
}

// ===================== EXPORT / IMPORT =====================
function exportConfig() {
  const config = getConfigFromUI();
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `afip-config-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importConfig() {
  $('#import-file').click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const config = JSON.parse(ev.target.result);
      setUIFromConfig(config);
      updateStatus('Configuracion importada correctamente.', 'success');
    } catch (err) {
      updateStatus('Error al leer el archivo JSON.', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ===================== LISTEN FOR MESSAGES FROM CONTENT SCRIPT =====================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATUS_UPDATE') {
    updateStatus(msg.text, msg.status);
    if (msg.status === 'success' || msg.status === 'error') {
      $('#btn-run').disabled = false;
      $('#btn-stop').disabled = true;
    }
  }
});

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  await loadConfig();

  // Moneda toggle
  $('#monedaExtranjera').addEventListener('change', toggleMonedaGroup);

  // Buttons
  $('#btn-add-item').addEventListener('click', addItem);
  $('#btn-save').addEventListener('click', (e) => saveConfig(e.currentTarget));
  $('#btn-save-config').addEventListener('click', (e) => saveConfig(e.currentTarget));
  $('#btn-save-items').addEventListener('click', (e) => saveConfig(e.currentTarget));
  $('#btn-run').addEventListener('click', runAutomation);
  $('#btn-stop').addEventListener('click', stopAutomation);
  $('#btn-export').addEventListener('click', exportConfig);
  $('#btn-import').addEventListener('click', importConfig);
  $('#import-file').addEventListener('change', handleImportFile);
  $('#btn-reset').addEventListener('click', async () => {
    setUIFromConfig(DEFAULT_CONFIG);
    await chrome.storage.local.remove('afipConfig');
    updateStatus('Configuracion reseteada a valores por defecto.', 'info');
  });
});
