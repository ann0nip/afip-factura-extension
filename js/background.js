/**
 * ARCA Factura Automatica - Background Service Worker (MV3)
 * Maneja la comunicación entre popup y content scripts,
 * y la persistencia del estado de automatización.
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

// ===================== INSTALLATION =====================
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      afipRunning: false,
      afipConfig: {
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
        fechas: {
          fechaEmision: '',
          periodoDesde: '',
          periodoHasta: '',
          vencimientoPago: ''
        },
        items: [
          {
            descripcion: `Servicios Profesionales ${getCurrentMonthYear()}`,
            cantidad: '1',
            medida: '7',
            precioUnitario: ''
          }
        ]
      }
    });
    console.log('[ARCA Ext] Extension instalada. Configure sus datos para comenzar.');
  }
});

// ===================== MESSAGE RELAY =====================
// Relay mensajes del content script al popup
const VALID_STATUSES = ['success', 'error', 'running', 'info'];
const ALLOWED_PAGE_FUNCTIONS = ['insertarFilaDetalle'];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'STATUS_UPDATE') {
    // Sanitize before relaying
    const safeMsg = {
      type: 'STATUS_UPDATE',
      text: typeof msg.text === 'string' ? msg.text.substring(0, 500) : '',
      status: VALID_STATUSES.includes(msg.status) ? msg.status : 'info'
    };
    chrome.runtime.sendMessage(safeMsg).catch(() => {
      // Popup might be closed, ignore
    });
    return;
  }

  // Execute a page-world function via chrome.scripting (MV3 safe approach)
  if (msg.type === 'EXEC_PAGE_FUNCTION' && sender.tab) {
    const fnName = msg.fnName;
    if (!ALLOWED_PAGE_FUNCTIONS.includes(fnName)) {
      sendResponse({ error: 'Function not allowed' });
      return true;
    }
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: (name) => {
        if (typeof window[name] === 'function') window[name]();
      },
      args: [fnName]
    }).then(() => {
      sendResponse({ ok: true });
    }).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // async response needed only for this handler
  }
});

// ===================== TAB UPDATES =====================
// Limpiar estado si el usuario navega fuera de ARCA
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && !changeInfo.url.includes('fe.afip.gob.ar')) {
    // Si estaba corriendo y sale de AFIP, parar
    chrome.storage.local.get('afipRunning', (result) => {
      if (result.afipRunning) {
        chrome.storage.local.set({ afipRunning: false });
        console.log('[ARCA Ext] Automatizacion detenida: usuario navego fuera de ARCA.');
      }
    });
  }
});
