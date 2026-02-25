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
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'STATUS_UPDATE') {
    // Re-broadcast a todos los popups abiertos
    chrome.runtime.sendMessage(msg).catch(() => {
      // Popup might be closed, ignore
    });
  }
  return true;
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
