/**
 * ARCA Factura Automatica - Content Script
 * Se ejecuta en las paginas de fe.afip.gob.ar/rcel/jsp/*
 * Maneja la automatización paso a paso del flujo de facturación.
 */

(() => {
  'use strict';

  // ===================== STATE =====================
  let running = false;
  let config = null;
  const BASE_URL = 'https://fe.afip.gob.ar/rcel/jsp/';

  // ===================== UTILITIES =====================

  /** Espera N milisegundos */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Espera hasta que un selector exista en el DOM, con timeout */
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout esperando: ${selector}`));
      }, timeout);
    });
  }

  /** Setea el valor de un <select> disparando eventos nativos */
  function setSelectValue(selectEl, value) {
    if (!selectEl) return false;

    // Buscar opción por value exacto
    let found = false;
    for (const opt of selectEl.options) {
      if (opt.value === value || opt.value.includes(value)) {
        selectEl.value = opt.value;
        found = true;
        break;
      }
    }

    if (!found) {
      // Buscar por texto parcial
      for (const opt of selectEl.options) {
        if (opt.text.toLowerCase().includes(value.toLowerCase())) {
          selectEl.value = opt.value;
          found = true;
          break;
        }
      }
    }

    if (found) {
      // Disparar eventos para que AFIP procese el cambio
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      selectEl.dispatchEvent(new Event('input', { bubbles: true }));

      // También llamar al onchange inline si existe
      if (selectEl.onchange) {
        selectEl.onchange.call(selectEl);
      }
    }

    return found;
  }

  /** Setea el valor de un input de texto disparando eventos */
  function setInputValue(inputEl, value) {
    if (!inputEl) return;
    inputEl.focus();
    inputEl.value = value;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    inputEl.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    inputEl.blur();
  }

  /** Setea un checkbox */
  function setCheckbox(el, checked) {
    if (!el) return;
    if (el.checked !== checked) {
      el.click();
    }
  }

  /** Ejecuta una funcion en el contexto de la pagina via background script */
  function callPageFunction(fnName) {
    return chrome.runtime.sendMessage({
      type: 'EXEC_PAGE_FUNCTION',
      fnName: fnName
    });
  }

  /** Highlight visual temporal en un campo */
  function highlightField(el) {
    if (!el) return;
    el.classList.add('afip-ext-highlight');
    setTimeout(() => {
      el.classList.remove('afip-ext-highlight');
      el.classList.add('afip-ext-highlight-success');
      setTimeout(() => el.classList.remove('afip-ext-highlight-success'), 800);
    }, 500);
  }

  /** Calcula fechas por defecto */
  function getDefaultDates() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    const today = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const firstDay = `01/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayStr = `${pad(lastDay.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    const vencimiento = `${pad(nextMonth.getDate())}/${pad(nextMonth.getMonth() + 1)}/${nextMonth.getFullYear()}`;

    return { today, firstDay, lastDayStr, vencimiento };
  }

  /** Detecta en qué paso estamos según la URL */
  function detectStep() {
    const url = window.location.href;

    if (url.includes('index_bis.jsp') || url.includes('index.jsp')) return 1;
    if (url.includes('menu_ppal.jsp')) return 2;
    if (url.includes('buscarPtosVtas.do')) return 3;
    if (url.includes('genComDatosEmisor.do')) return 4;
    if (url.includes('genComDatosReceptor.do')) return 5;
    if (url.includes('genComDatosOperacion.do')) return 6;
    if (url.includes('genComResumenDatos.do')) return 7;

    return 0;
  }

  // ===================== OVERLAY UI =====================

  let overlayEl = null;

  function stopAndClose() {
    running = false;
    chrome.storage.local.set({ afipRunning: false });
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      text: 'Automatizacion detenida por el usuario.',
      status: 'info'
    });
    removeOverlay();
  }

  function createOverlay() {
    if (overlayEl) overlayEl.remove();

    overlayEl = document.createElement('div');
    overlayEl.id = 'afip-ext-overlay';

    // -- Header
    const header = document.createElement('div');
    header.className = 'ext-header';

    const title = document.createElement('span');
    title.className = 'ext-title';
    title.textContent = 'AutoFactura';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ext-close';
    closeBtn.title = 'Detener y cerrar';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => stopAndClose());
    header.appendChild(closeBtn);

    overlayEl.appendChild(header);

    // -- Status message
    const statusDiv = document.createElement('div');
    statusDiv.className = 'ext-status running';
    statusDiv.id = 'ext-status-msg';

    const statusText = document.createElement('span');
    statusText.className = 'ext-status-text';
    statusText.textContent = 'Iniciando automatizaci\u00f3n';
    statusDiv.appendChild(statusText);

    overlayEl.appendChild(statusDiv);

    // -- Progress steps (clean bars)
    const progress = document.createElement('div');
    progress.className = 'ext-progress';
    for (let i = 1; i <= 7; i++) {
      const step = document.createElement('div');
      step.className = 'ext-step';
      step.dataset.step = i;
      progress.appendChild(step);
    }
    overlayEl.appendChild(progress);

    document.body.appendChild(overlayEl);
  }

  function updateOverlay(msg, type = 'running', currentStep = 0) {
    if (!overlayEl) createOverlay();

    const statusEl = overlayEl.querySelector('#ext-status-msg');
    if (statusEl) {
      // Smooth text crossfade: replace the inner <span> so CSS animation re-triggers
      const oldText = statusEl.querySelector('.ext-status-text');
      const newText = document.createElement('span');
      newText.className = 'ext-status-text';
      newText.textContent = msg;

      if (oldText) {
        statusEl.replaceChild(newText, oldText);
      } else {
        statusEl.textContent = '';
        statusEl.appendChild(newText);
      }

      statusEl.className = 'ext-status ' + type;
    }

    // Update progress indicators
    overlayEl.querySelectorAll('.ext-step').forEach(step => {
      const s = parseInt(step.dataset.step);
      step.className = 'ext-step';
      if (s < currentStep) step.classList.add('done');
      else if (s === currentStep) step.classList.add('active');
    });
  }

  function removeOverlay() {
    if (overlayEl) {
      // Animate out before removing from DOM
      overlayEl.classList.add('removing');
      overlayEl.addEventListener('animationend', () => {
        if (overlayEl) {
          overlayEl.remove();
          overlayEl = null;
        }
      }, { once: true });

      // Safety fallback if animationend never fires
      setTimeout(() => {
        if (overlayEl) {
          overlayEl.remove();
          overlayEl = null;
        }
      }, 300);
    }
  }

  // ===================== STEP HANDLERS =====================

  /** Paso 1: Selección de empresa */
  async function step1_selectEmpresa() {
    updateOverlay('Paso 1: Seleccionando empresa', 'running', 1);

    const buttons = document.querySelectorAll('input.btn_empresa');
    if (buttons.length === 0) {
      throw new Error('No se encontraron botones de empresa. ¿Estás logueado?');
    }

    const targetName = config.empresaNombre.toLowerCase();
    let targetBtn = null;

    for (const btn of buttons) {
      if (btn.value.toLowerCase().includes(targetName)) {
        targetBtn = btn;
        break;
      }
    }

    // Fallback: primer botón
    if (!targetBtn) {
      targetBtn = buttons[0];
    }

    highlightField(targetBtn);
    await sleep(300);
    targetBtn.click();
  }

  /** Paso 2: Menú principal - click en "Generar Comprobante" */
  async function step2_menuPrincipal() {
    updateOverlay('Paso 2: Accediendo a generación de comprobantes', 'running', 2);

    // Intentar por ID
    let btn = document.querySelector('#btn_gen_cmp');

    // Fallback: buscar link
    if (!btn) {
      const links = document.querySelectorAll('a[href*="buscarPtosVtas.do"]');
      btn = links[0];
    }

    if (!btn) {
      throw new Error('No se encontró el botón "Generar Comprobante"');
    }

    highlightField(btn);
    await sleep(300);
    btn.click();
  }

  /** Paso 3: Punto de venta y tipo de comprobante */
  async function step3_puntoDeVenta() {
    updateOverlay('Paso 3: Configurando punto de venta', 'running', 3);

    // Punto de venta
    const pvSelect = document.querySelector('#puntodeventa');
    if (pvSelect) {
      const pvNum = config.puntoDeVenta.padStart(5, '0');
      let found = false;
      for (const opt of pvSelect.options) {
        if (opt.value === config.puntoDeVenta || opt.text.startsWith(pvNum) || opt.text.includes(config.puntoDeVenta)) {
          pvSelect.value = opt.value;
          found = true;
          break;
        }
      }
      if (!found && pvSelect.options.length > 0) {
        pvSelect.selectedIndex = 0;
      }

      // Trigger el onchange que tiene AJAX
      pvSelect.dispatchEvent(new Event('change', { bubbles: true }));
      if (pvSelect.onchange) pvSelect.onchange.call(pvSelect);
      highlightField(pvSelect);
    }

    // Esperar a que el AJAX cargue las opciones de tipo de comprobante
    updateOverlay('Paso 3: Esperando carga de tipos de comprobante', 'running', 3);
    await sleep(2000);

    // Tipo de comprobante
    const tcSelect = document.querySelector('#universocomprobante');
    if (tcSelect) {
      setSelectValue(tcSelect, config.tipoComprobante);
      highlightField(tcSelect);
    }

    await sleep(500);

    // Click continuar
    const continuar = document.querySelector("input[value='Continuar >']");
    if (continuar) {
      highlightField(continuar);
      await sleep(300);
      continuar.click();
    }
  }

  /** Paso 4: Datos de emisión */
  async function step4_datosEmisor() {
    updateOverlay('Paso 4: Completando datos de emisión', 'running', 4);

    const dates = getDefaultDates();
    const fechas = config.fechas || {};

    // Fecha de emisión
    const fcInput = document.querySelector('#fc');
    if (fcInput) {
      setInputValue(fcInput, fechas.fechaEmision || dates.today);
      highlightField(fcInput);
    }

    // Concepto
    const conceptoSelect = document.querySelector('#idconcepto');
    if (conceptoSelect) {
      setSelectValue(conceptoSelect, config.idConcepto);
      highlightField(conceptoSelect);
      // Trigger para mostrar campos de período
      if (conceptoSelect.onchange) conceptoSelect.onchange.call(conceptoSelect);
      await sleep(500);
    }

    // Moneda extranjera
    const monedaExtChk = document.querySelector('#monedaextranjera');
    if (monedaExtChk) {
      setCheckbox(monedaExtChk, config.monedaExtranjera);
    }

    // Si no es moneda extranjera, limpiar hidden y deshabilitar campos
    if (!config.monedaExtranjera) {
      const cancelHidden = document.querySelector('[name="cancelacionMonedaExtranjera"]');
      if (cancelHidden) cancelHidden.value = '';
      const monedaSelect = document.querySelector('#moneda');
      if (monedaSelect) monedaSelect.disabled = true;
      const tipoCambio = document.querySelector('#tipocambio');
      if (tipoCambio) tipoCambio.disabled = true;
    }

    await sleep(300);

    // Período facturado (solo si concepto = servicios)
    if (config.idConcepto === '2' || config.idConcepto === '3') {
      const fsdInput = document.querySelector('#fsd');
      if (fsdInput) {
        setInputValue(fsdInput, fechas.periodoDesde || dates.firstDay);
        highlightField(fsdInput);
      }

      const fshInput = document.querySelector('#fsh');
      if (fshInput) {
        setInputValue(fshInput, fechas.periodoHasta || dates.lastDayStr);
        highlightField(fshInput);
      }

      const vencInput = document.querySelector('#vencimientopago');
      if (vencInput) {
        setInputValue(vencInput, fechas.vencimientoPago || dates.vencimiento);
        highlightField(vencInput);
      }
    }

    // Actividad asociada
    const actSelect = document.querySelector('#actiAsociadaId');
    if (actSelect) {
      setSelectValue(actSelect, config.actividadAsociada);
      highlightField(actSelect);
    }

    await sleep(500);

    // Click continuar
    const continuar = document.querySelector("input[value='Continuar >']");
    if (continuar) {
      highlightField(continuar);
      await sleep(300);
      continuar.click();
    }
  }

  /** Paso 5: Datos del receptor */
  async function step5_datosReceptor() {
    updateOverlay('Paso 5: Completando datos del receptor', 'running', 5);

    const receptor = config.receptor || {};

    // Condición IVA
    const ivaSelect = document.querySelector('#idivareceptor');
    if (ivaSelect) {
      setSelectValue(ivaSelect, receptor.condicionIVA);
      highlightField(ivaSelect);
    }

    await sleep(300);

    // Tipo documento
    const tipoDocSelect = document.querySelector('#idtipodocreceptor');
    if (tipoDocSelect) {
      setSelectValue(tipoDocSelect, receptor.tipoDoc);
      highlightField(tipoDocSelect);
    }

    await sleep(300);

    // Nro documento (trigger autocomplete de AFIP)
    const nroDocInput = document.querySelector('#nrodocreceptor');
    if (nroDocInput) {
      setInputValue(nroDocInput, receptor.nroDoc);
      highlightField(nroDocInput);

      // Trigger el autocompletado de AFIP (necesita blur y/o onchange)
      nroDocInput.dispatchEvent(new Event('blur', { bubbles: true }));
      if (nroDocInput.onchange) nroDocInput.onchange.call(nroDocInput);

      // Esperar autocomplete de razón social
      updateOverlay('Paso 5: Esperando autocompletado de CUIT', 'running', 5);
      await sleep(2000);
    }

    // Email (opcional)
    if (receptor.email) {
      const emailInput = document.querySelector('#email');
      if (emailInput) {
        setInputValue(emailInput, receptor.email);
        highlightField(emailInput);
      }
    }

    // Forma de pago (checkbox)
    const formaPagoId = getFormaPagoId(receptor.formaDePago);
    const formaPagoChk = document.querySelector(`#${formaPagoId}`);
    if (formaPagoChk) {
      setCheckbox(formaPagoChk, true);
      highlightField(formaPagoChk);
    } else {
      // Fallback: buscar por value
      const allChks = document.querySelectorAll('input[name="formaDePago"]');
      for (const chk of allChks) {
        if (chk.value === receptor.formaDePago) {
          setCheckbox(chk, true);
          highlightField(chk);
          break;
        }
      }
    }

    await sleep(500);

    // Click continuar
    const continuar = document.querySelector("input[value='Continuar >']");
    if (continuar) {
      highlightField(continuar);
      await sleep(300);
      continuar.click();
    }
  }

  /** Mapea valor de forma de pago al ID del checkbox */
  function getFormaPagoId(value) {
    const map = {
      '1': 'formadepago1',
      '68': 'formadepago4',
      '69': 'formadepago5',
      '91': 'formadepago6',
      '96': 'formadepago7'
    };
    return map[value] || `formadepago6`;
  }

  /** Paso 6: Datos de la operación (ítems) */
  async function step6_datosOperacion() {
    updateOverlay('Paso 6: Cargando ítems de la factura', 'running', 6);

    const items = config.items || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const n = i + 1;

      // Si no es el primer ítem, agregar fila usando chrome.scripting API
      if (i > 0) {
        try {
          await callPageFunction('insertarFilaDetalle');
          await sleep(500);
        } catch (e) {
          console.warn('No se pudo agregar fila de detalle:', e);
        }
      }

      // Descripción
      const descEl = document.querySelector(`#detalle_descripcion${n}`) ||
                      document.querySelector(`[name="detalleDescripcion"]:nth-of-type(${n})`);
      if (descEl) {
        setInputValue(descEl, item.descripcion);
        highlightField(descEl);
      }

      // Cantidad
      const cantEl = document.querySelector(`#detalle_cantidad${n}`);
      if (cantEl) {
        setInputValue(cantEl, item.cantidad || '1');
        highlightField(cantEl);
      }

      // Medida
      const medidaEl = document.querySelector(`#detalle_medida${n}`);
      if (medidaEl) {
        setSelectValue(medidaEl, item.medida || '7');
        highlightField(medidaEl);
      }

      // Precio unitario
      const precioEl = document.querySelector(`#detalle_precio${n}`);
      if (precioEl) {
        setInputValue(precioEl, item.precioUnitario);
        highlightField(precioEl);
      }

      // Bonificación (0 por defecto)
      const bonifEl = document.querySelector(`#detalle_porcentaje${n}`);
      if (bonifEl) {
        setInputValue(bonifEl, '0');
      }

      await sleep(300);
    }

    await sleep(500);

    // Click continuar
    const continuar = document.querySelector("input[value='Continuar >']");
    if (continuar) {
      highlightField(continuar);
      await sleep(300);
      continuar.click();
    }
  }

  /** Paso 7: Resumen — NO se hace click en confirmar */
  async function step7_resumen() {
    updateOverlay(
      'Factura lista para confirmar. Revisá los datos y hacé clic en "Confirmar Datos" manualmente.',
      'success',
      7
    );

    // Notificar al popup
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      text: '✅ ¡Factura lista! Revisá los datos en la página y confirmá manualmente.',
      status: 'success'
    });
  }

  // ===================== MAIN AUTOMATION RUNNER =====================

  async function runStep(stepNum) {
    if (!running) return;

    try {
      switch (stepNum) {
        case 1: await step1_selectEmpresa(); break;
        case 2: await step2_menuPrincipal(); break;
        case 3: await step3_puntoDeVenta(); break;
        case 4: await step4_datosEmisor(); break;
        case 5: await step5_datosReceptor(); break;
        case 6: await step6_datosOperacion(); break;
        case 7: await step7_resumen(); break;
        default:
          updateOverlay('Pagina no reconocida. Navega al inicio de ARCA Monotributo.', 'error', 0);
      }
    } catch (err) {
      updateOverlay(`❌ Error en paso ${stepNum}: ${err.message}`, 'error', stepNum);
      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        text: `❌ Error en paso ${stepNum}: ${err.message}`,
        status: 'error'
      });
      running = false;
    }
  }

  /** Inicia la automatización desde el paso actual */
  async function startAutomation(cfg) {
    config = cfg;
    running = true;

    createOverlay();
    const currentStep = detectStep();

    if (currentStep === 0) {
      updateOverlay('Pagina no reconocida. Navega a ARCA Monotributo para comenzar.', 'error', 0);
      running = false;
      return;
    }

    updateOverlay(`Iniciando desde paso ${currentStep}`, 'running', currentStep);
    await sleep(500);
    await runStep(currentStep);
  }

  // ===================== CONTINUATION ON PAGE LOAD =====================

  /**
   * Cuando AFIP navega entre pasos, la página recarga completamente.
   * Usamos chrome.storage para saber si hay una automatización en curso.
   */
  async function checkContinuation() {
    try {
      const result = await chrome.storage.local.get(['afipRunning', 'afipConfig']);

      if (result.afipRunning && result.afipConfig) {
        config = result.afipConfig;
        running = true;

        const currentStep = detectStep();
        if (currentStep > 0 && currentStep <= 7) {
          createOverlay();
          updateOverlay(`Continuando paso ${currentStep}`, 'running', currentStep);
          await sleep(800); // Esperar a que la página termine de cargar
          await runStep(currentStep);

          // Si llegamos al paso 7, marcar como no corriendo
          if (currentStep === 7) {
            await chrome.storage.local.set({ afipRunning: false });
          }
        }
      }
    } catch (err) {
      console.warn('[ARCA Ext] Error en continuacion:', err);
    }
  }

  // ===================== MESSAGE LISTENER =====================

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Only accept messages from our own extension
    if (sender.id !== chrome.runtime.id) return;

    if (msg.action === 'START_AUTOMATION') {
      // Storage already set by popup before sending this message
      startAutomation(msg.config);
      sendResponse({ ok: true });
      return;
    }

    if (msg.action === 'STOP_AUTOMATION') {
      running = false;
      chrome.storage.local.set({ afipRunning: false });
      removeOverlay();
      sendResponse({ ok: true });
      return;
    }
  });

  // ===================== INIT =====================

  // Esperar a que el DOM esté completamente listo
  if (document.readyState === 'complete') {
    checkContinuation();
  } else {
    window.addEventListener('load', () => {
      checkContinuation();
    });
  }

})();
