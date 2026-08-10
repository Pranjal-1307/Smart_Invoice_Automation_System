let currentInvoices = [];
let currentFilter = 'PENDING';
let currentRole = 'FINANCE_MANAGER'; // Default role: FINANCE_MANAGER, AP_CLERK, ADMIN

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initDragAndDrop();
  fetchInvoices();
  switchRole('FINANCE_MANAGER', false);
});

// Role Switcher Logic & Dynamic UI Adaptation
function switchRole(roleId, autoNavigate = true) {
  currentRole = roleId;
  const roleSelect = document.getElementById('roleSelector');
  if (roleSelect && roleSelect.value !== roleId) {
    roleSelect.value = roleId;
  }

  const roleBanner = document.getElementById('roleBanner');
  const roleIcon = document.getElementById('roleBannerIcon');
  const roleTitle = document.getElementById('roleBannerTitle');
  const roleDesc = document.getElementById('roleBannerDesc');

  roleBanner.className = 'role-banner';

  const inputNotice = document.getElementById('inputRoleNotice');
  const approvalNotice = document.getElementById('approvalRoleNotice');
  const mongoNotice = document.getElementById('mongoRoleNotice');
  const btnBulkApprove = document.getElementById('btnBulkApprove');
  const adminEngineControls = document.getElementById('adminEngineControls');
  const adminResetBtn = document.getElementById('adminResetBtn');

  if (roleId === 'AP_CLERK') {
    roleBanner.classList.add('banner-ap');
    roleIcon.textContent = '👤';
    roleTitle.textContent = 'Accounts Payable (AP Clerk) Portal Active';
    roleDesc.textContent = 'Primary Duty: Ingest & upload invoice documents, batch files, and datasets. Approval sign-offs are reserved for Finance Manager.';

    if (inputNotice) inputNotice.style.display = 'none';
    if (approvalNotice) {
      approvalNotice.style.display = 'block';
      approvalNotice.innerHTML = `<span>🔒 <strong>AP Clerk View:</strong> Approval actions are restricted. Switch role to Finance Manager to authorize invoices.</span>`;
    }
    if (mongoNotice) mongoNotice.style.display = 'none';
    if (btnBulkApprove) btnBulkApprove.style.display = 'none';
    if (adminEngineControls) adminEngineControls.style.display = 'none';
    if (adminResetBtn) adminResetBtn.style.display = 'none';

    if (autoNavigate) switchTab('input');

  } else if (roleId === 'ADMIN') {
    roleBanner.classList.add('banner-admin');
    roleIcon.textContent = '⚙️';
    roleTitle.textContent = 'System & RPA Admin Console Active';
    roleDesc.textContent = 'Primary Duty: Pipeline log diagnostics, engine OCR threshold tuning, raw JSON inspection, and Database Purge operations.';

    if (inputNotice) {
      inputNotice.style.display = 'block';
      inputNotice.innerHTML = `<span>ℹ️ <strong>System Admin Notice:</strong> Document ingestion is an AP Clerk operational task.</span>`;
    }
    if (approvalNotice) {
      approvalNotice.style.display = 'block';
      approvalNotice.innerHTML = `<span>🛡️ <strong>System Admin Audit:</strong> Financial approvals are reserved for Finance Managers.</span>`;
    }
    if (mongoNotice) mongoNotice.style.display = 'block';
    if (btnBulkApprove) btnBulkApprove.style.display = 'none';
    if (adminEngineControls) adminEngineControls.style.display = 'block';
    if (adminResetBtn) adminResetBtn.style.display = 'inline-flex';

    if (autoNavigate) switchTab('mongodb');

  } else {
    // FINANCE_MANAGER
    roleBanner.classList.add('banner-manager');
    roleIcon.textContent = '👑';
    roleTitle.textContent = 'Finance Manager (Approver) Portal Active';
    roleDesc.textContent = 'Primary Duty: Review pending invoices, inspect line items & tax breakdowns, and execute single or bulk Approve/Reject sign-offs.';

    if (inputNotice) {
      inputNotice.style.display = 'block';
      inputNotice.innerHTML = `<span>ℹ️ <strong>Manager Notice:</strong> File upload is managed by AP Clerks. Switch to AP Clerk to upload new invoices.</span>`;
    }
    if (approvalNotice) approvalNotice.style.display = 'none';
    if (mongoNotice) mongoNotice.style.display = 'none';
    if (btnBulkApprove) btnBulkApprove.style.display = 'inline-flex';
    if (adminEngineControls) adminEngineControls.style.display = 'none';
    if (adminResetBtn) adminResetBtn.style.display = 'none';

    if (autoNavigate) switchTab('approval');
  }

  // Refresh view contents to update role-sensitive buttons
  renderMongoDBTable();
  renderApprovalDesk();
  appendLog(`[ROLE_CHANGE] Active role set to: ${roleId}`);
}

// Navigation handling
function initNav() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeNav) activeNav.classList.add('active');

  document.querySelectorAll('.tab-page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(`tab-${tabId}`);
  if (targetPage) targetPage.classList.add('active');

  // Update Page Header
  const titles = {
    workflow: { title: "Workflow Overview", sub: "Real-time tracking from Invoice Input to MongoDB & Approval" },
    input: { title: "Invoice Input Stage (AP Clerk)", sub: "Submit Single PDF/IMG, Multiple PDF/IMG, or Dataset CSV/XLSX" },
    engine: { title: "Processing Engine & Diagnostics (Admin)", sub: "OCR field extraction, rule validation & log inspection" },
    mongodb: { title: "MongoDB Document Store (Admin & Audit)", sub: "Direct document collection viewer for invoices_db" },
    approval: { title: "Approval Workflow Desk (Finance Manager)", sub: "Review pending invoices and execute manager decisions" }
  };
  if (titles[tabId]) {
    document.getElementById('pageTitle').textContent = titles[tabId].title;
    document.getElementById('pageSubtitle').textContent = titles[tabId].sub;
  }
}

// Role-Guarded File Input Trigger
function triggerFileInput(inputId) {
  if (currentRole !== 'AP_CLERK') {
    const confirmSwitch = confirm(`🔒 Role Notice: Uploading invoices is an Accounts Payable (AP Clerk) task.\n\nWould you like to switch to AP Clerk role now to upload files?`);
    if (confirmSwitch) {
      switchRole('AP_CLERK');
    }
    return;
  }
  const inputEl = document.getElementById(inputId);
  if (inputEl) inputEl.click();
}

// Drag & Drop Setup
function initDragAndDrop() {
  const setupZone = (zoneId, inputType) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      zone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
      }, false);
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentRole !== 'AP_CLERK') {
        alert("🔒 Permission Notice: Invoice uploading is restricted to AP Clerk role. Switch role to AP Clerk in top header.");
        return;
      }
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        processUploadedFiles(Array.from(files), inputType);
      }
    });
  };

  setupZone('dropZoneSingle', 'SINGLE_PDF');
  setupZone('dropZoneMulti', 'MULTIPLE_PDF');
  setupZone('dropZoneDataset', 'DATASET_CSV');
}

// File Selection & Reading Logic
function handleFileSelect(event, inputType) {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    processUploadedFiles(files, inputType);
  }
}

async function processUploadedFiles(files, inputType) {
  appendLog(`[FILE_INGEST] Processing ${files.length} file(s) for ${inputType} by ${currentRole}...`);

  const previewIdMap = {
    'SINGLE_PDF': 'singleFilePreview',
    'MULTIPLE_PDF': 'multiFilePreview',
    'DATASET_CSV': 'datasetFilePreview'
  };
  const previewArea = document.getElementById(previewIdMap[inputType]);

  if (previewArea) {
    previewArea.style.display = 'block';
    previewArea.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">Selected Files:</div>
      ${files.map(f => `
        <div class="file-item-chip">
          <span class="file-name">📄 ${f.name}</span>
          <span class="file-size">${(f.size / 1024).toFixed(1)} KB</span>
        </div>
      `).join('')}
      <button class="btn sm primary" style="width:100%; margin-top:8px;" onclick="uploadAndExtractFiles('${inputType}')">
        ⚡ Upload & Extract Data (${files.length})
      </button>
    `;
  }

  // Save selected files globally for upload trigger
  window.pendingUploadFiles = window.pendingUploadFiles || {};
  window.pendingUploadFiles[inputType] = files;
}

async function uploadAndExtractFiles(inputType) {
  if (currentRole !== 'AP_CLERK') {
    alert("🔒 Role Notice: Upload operations are restricted to Accounts Payable (AP Clerk). Please switch active role.");
    return;
  }

  const files = window.pendingUploadFiles ? window.pendingUploadFiles[inputType] : null;
  if (!files || files.length === 0) {
    alert("Please select files first!");
    return;
  }

  for (const file of files) {
    const fileContent = await readFileContent(file);
    await triggerProcess(inputType, file.name, {
      fileSize: file.size,
      fileType: file.type,
      rawContent: fileContent
    });
  }

  // Clear preview
  const previewIdMap = {
    'SINGLE_PDF': 'singleFilePreview',
    'MULTIPLE_PDF': 'multiFilePreview',
    'DATASET_CSV': 'datasetFilePreview'
  };
  const previewArea = document.getElementById(previewIdMap[inputType]);
  if (previewArea) previewArea.style.display = 'none';
}

function readFileContent(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.type.includes('text')) {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    } else {
      reader.onload = (e) => resolve(e.target.result); // Base64 Data URL
      reader.readAsDataURL(file);
    }
  });
}

// Fetch invoices from backend Express server
async function fetchInvoices() {
  try {
    const [invRes, statsRes] = await Promise.all([
      fetch('/api/invoices'),
      fetch('/api/stats')
    ]);

    const invData = await invRes.json();
    const statsData = await statsRes.json();

    if (invData.success) {
      currentInvoices = invData.invoices;
      renderQuickTable();
      renderMongoDBTable();
      renderApprovalDesk();
      updateLogsConsole();
    }

    if (statsData.success) {
      const stats = statsData.stats;
      document.getElementById('statTotalVal').textContent = `$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      document.getElementById('statAccuracy').textContent = `${stats.avgConfidence.toFixed(1)}%`;
      document.getElementById('statPendingCount').textContent = stats.pending;
      document.getElementById('pendingBadge').textContent = stats.pending;
    }
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

// Trigger Processing Engine Pipeline
async function triggerProcess(inputType, fileName, fileData = null) {
  try {
    appendLog(`[PROCESSING_TRIGGER] Ingestion by ${currentRole}: ${inputType} for file "${fileName}"...`);
    switchTab('engine');

    const payload = {
      inputType,
      fileName,
      fileData,
      role: currentRole
    };

    const res = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      data.processed.forEach(item => {
        appendLog(`[SUCCESS] Extracted Invoice: ${item.invoiceNumber} | Vendor: ${item.vendor} | Total: $${item.total.toFixed(2)} | Confidence: ${(item.confidenceScore*100).toFixed(0)}%`);
      });
      fetchInvoices();
    }
  } catch (err) {
    appendLog(`[ERROR] Processing failed: ${err.message}`);
  }
}

// Log Console
function appendLog(msg) {
  const consoleEl = document.getElementById('consoleLogs');
  const timestamp = new Date().toLocaleTimeString();
  consoleEl.textContent += `\n[${timestamp}] ${msg}`;
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function clearLogsConsole() {
  const consoleEl = document.getElementById('consoleLogs');
  consoleEl.textContent = `[CONSOLE_CLEARED] Logs wiped by ${currentRole} at ${new Date().toLocaleTimeString()}`;
}

function simulateEngineDiagnostic() {
  appendLog(`[ADMIN_DIAGNOSTIC] Running system OCR layout checks & pattern matching validation...`);
  appendLog(`[ADMIN_DIAGNOSTIC] OCR Threshold set to ${document.getElementById('ocrConfidenceRange').value}%`);
  appendLog(`[ADMIN_DIAGNOSTIC] Database collection index state: HEALTHY (3 indexes verified)`);
}

function updateLogsConsole() {
  const consoleEl = document.getElementById('consoleLogs');
  if (!consoleEl.textContent.trim()) {
    consoleEl.textContent = `[ENGINE_STANDBY] Active monitoring enabled. Pipeline ready.`;
  }
}

// Render Quick Overview Table
function renderQuickTable() {
  const tbody = document.getElementById('quickTableBody');
  tbody.innerHTML = '';

  currentInvoices.slice(0, 5).forEach(inv => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${inv.invoiceNumber}</code></td>
      <td><strong>${inv.vendor}</strong></td>
      <td><span class="badge sm">${inv.inputType}</span></td>
      <td>$${inv.total.toFixed(2)}</td>
      <td>${(inv.confidenceScore * 100).toFixed(0)}%</td>
      <td><span class="badge-status ${inv.status}">${inv.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Render MongoDB Collection Table
function renderMongoDBTable() {
  const tbody = document.getElementById('mongoTableBody');
  const filterSelect = document.getElementById('dbStatusFilter');
  const filterVal = filterSelect ? filterSelect.value : 'ALL';
  tbody.innerHTML = '';

  const filtered = currentInvoices.filter(i => filterVal === 'ALL' || i.status === filterVal);

  filtered.forEach(inv => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div><code>${inv.id}</code></div>
        <small style="color:var(--text-muted)">${inv.invoiceNumber}</small>
      </td>
      <td><span class="badge-source">${inv.inputType}</span></td>
      <td>
        <div><strong>${inv.vendor}</strong></div>
        <small style="color:var(--text-muted)">${inv.vendorEmail}</small>
      </td>
      <td><strong>$${inv.total.toFixed(2)}</strong></td>
      <td>${(inv.confidenceScore * 100).toFixed(0)}%</td>
      <td><span class="badge-status ${inv.status}">${inv.status}</span></td>
      <td>
        <button class="btn xs secondary" onclick="inspectLogs('${inv.id}')">Logs (${inv.processingLogs.length})</button>
      </td>
      <td>
        <button class="btn xs primary" onclick="inspectInvoice('${inv.id}')">Inspect</button>
        ${currentRole === 'ADMIN' ? `<button class="btn xs ghost" style="color:var(--secondary);" onclick="inspectJson('${inv.id}')">JSON</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Approval Desk Cards
function filterApproval(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.desk-filters .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderApprovalDesk();
}

function renderApprovalDesk() {
  const grid = document.getElementById('approvalCardsGrid');
  grid.innerHTML = '';

  const filtered = currentInvoices.filter(i => i.status === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">
      No invoices found in <strong>${currentFilter}</strong> stage.
    </div>`;
    return;
  }

  filtered.forEach(inv => {
    const card = document.createElement('div');
    card.className = 'approval-card';

    const isManager = currentRole === 'FINANCE_MANAGER';
    const isAp = currentRole === 'AP_CLERK';

    card.innerHTML = `
      <div>
        <div class="card-top">
          <div>
            <div class="inv-num">${inv.invoiceNumber}</div>
            <div class="vendor-name">${inv.vendor}</div>
          </div>
          <span class="badge-status ${inv.status}">${inv.status}</span>
        </div>

        <div class="amount-box">
          <div>
            <span style="font-size:11px; color:var(--text-muted);">TOTAL INVOICE</span>
            <div class="val">$${inv.total.toFixed(2)}</div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:11px; color:var(--text-muted);">CONFIDENCE</span>
            <div style="color:var(--accent); font-weight:700;">${(inv.confidenceScore * 100).toFixed(0)}%</div>
          </div>
        </div>

        <div style="font-size:12px; color:var(--text-muted); margin-bottom: 12px;">
          📅 Due Date: ${inv.dueDate} | File: <code>${inv.filename}</code>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn sm secondary" onclick="inspectInvoice('${inv.id}')">Details</button>
        ${inv.status === 'PENDING' ? `
          <button class="btn sm accent" ${!isManager ? 'style="opacity:0.6; cursor:not-allowed;" title="Finance Manager role required"' : ''} onclick="approveInvoice('${inv.id}')">
            ${isManager ? 'Approve' : '🔒 Approve'}
          </button>
          <button class="btn sm secondary" style="color:var(--danger); ${!isManager ? 'opacity:0.6; cursor:not-allowed;' : ''}" title="${!isManager ? 'Finance Manager role required' : ''}" onclick="rejectInvoice('${inv.id}')">
            ${isManager ? 'Reject' : '🔒 Reject'}
          </button>
        ` : `
          <button class="btn sm secondary" style="grid-column: span 2;" disabled>Processed</button>
        `}
      </div>
    `;
    grid.appendChild(card);
  });
}

// Single Invoice Approval (Finance Manager Duty)
async function approveInvoice(id) {
  if (currentRole === 'AP_CLERK') {
    alert("🔒 Role Restriction: Accounts Payable (AP Clerk) is not authorized to approve invoices. Switch active role to Finance Manager.");
    return;
  }

  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole
      },
      body: JSON.stringify({ id, notes: `Approved via Approval Desk by ${currentRole}`, role: currentRole })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[APPROVAL] Invoice ${id} approved by ${currentRole}.`);
      fetchInvoices();
    } else {
      alert(`Approval error: ${data.message}`);
    }
  } catch (err) {
    alert("Approval error: " + err.message);
  }
}

// Bulk Approval (Finance Manager Exclusive)
async function executeBulkApproval() {
  if (currentRole !== 'FINANCE_MANAGER') {
    alert("🔒 Role Restriction: Bulk approval is restricted to Finance Managers.");
    return;
  }

  const pendingCount = currentInvoices.filter(i => i.status === 'PENDING' && i.confidenceScore >= 0.95).length;
  if (pendingCount === 0) {
    alert("No pending invoices with high confidence (≥95%) available for bulk approval.");
    return;
  }

  const confirmBulk = confirm(`⚡ Confirm Bulk Approval:\n\nApprove ${pendingCount} pending invoice(s) with confidence score ≥ 95%?`);
  if (!confirmBulk) return;

  try {
    const res = await fetch('/api/approve-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole
      },
      body: JSON.stringify({ role: currentRole, minConfidence: 0.95 })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[BULK_APPROVAL] ${data.approvedCount} invoice(s) bulk approved by Finance Manager.`);
      fetchInvoices();
    }
  } catch (err) {
    alert("Bulk approval error: " + err.message);
  }
}

// Single Invoice Rejection (Finance Manager Duty)
async function rejectInvoice(id) {
  if (currentRole === 'AP_CLERK') {
    alert("🔒 Role Restriction: Accounts Payable (AP Clerk) is not authorized to reject invoices. Switch active role to Finance Manager.");
    return;
  }

  const reason = prompt("Enter rejection reason for Finance Manager audit log:");
  if (reason === null) return;

  try {
    const res = await fetch('/api/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole
      },
      body: JSON.stringify({ id, reason, role: currentRole })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[REJECTION] Invoice ${id} rejected by ${currentRole}. Reason: ${reason}`);
      fetchInvoices();
    } else {
      alert(`Rejection error: ${data.message}`);
    }
  } catch (err) {
    alert("Rejection error: " + err.message);
  }
}

// Database Reset (System Admin Exclusive Action)
async function confirmResetDatabase() {
  if (currentRole !== 'ADMIN') {
    alert("🔒 Permission Denied: Database purge operations are strictly restricted to System Admins.");
    return;
  }

  const firstWarning = confirm("⚠️ ADMIN WARNING:\n\nAre you sure you want to purge and reset all invoice records in MongoDB?");
  if (!firstWarning) return;

  try {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole
      },
      body: JSON.stringify({ role: currentRole })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[ADMIN_ACTION] MongoDB invoices collection purged by System Admin.`);
      fetchInvoices();
    } else {
      alert(`Reset error: ${data.message}`);
    }
  } catch (err) {
    alert("Reset error: " + err.message);
  }
}

// Modal Inspection
function inspectInvoice(id) {
  const inv = currentInvoices.find(i => i.id === id);
  if (!inv) return;

  const modalBody = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent = `Inspection: ${inv.invoiceNumber} (${inv.vendor})`;

  let lineItemsHtml = inv.lineItems.map(item => `
    <tr>
      <td>${item.description}</td>
      <td>${item.quantity}</td>
      <td>$${item.unitPrice.toFixed(2)}</td>
      <td><strong>$${item.total.toFixed(2)}</strong></td>
    </tr>
  `).join('');

  modalBody.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div>
          <span style="color:var(--text-muted); font-size:12px;">VENDOR EMAIL</span>
          <div>${inv.vendorEmail}</div>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:12px;">INPUT METHOD</span>
          <div><code class="badge-source">${inv.inputType}</code></div>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:12px;">INVOICE DATE</span>
          <div>${inv.date}</div>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:12px;">DUE DATE</span>
          <div>${inv.dueDate}</div>
        </div>
      </div>

      <h4 style="color:#fff; margin:16px 0 8px;">Line Items Breakdown</h4>
      <table style="width:100%; border:1px solid var(--border-color); border-radius:8px;">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>

      <div style="margin-top:16px; padding:12px; background:rgba(255,255,255,0.03); border-radius:8px; display:flex; justify-content:space-between;">
        <div>Subtotal: <strong>$${inv.subtotal.toFixed(2)}</strong> | Tax: <strong>$${inv.tax.toFixed(2)}</strong></div>
        <div style="font-size:16px; color:var(--accent);">Grand Total: <strong>$${inv.total.toFixed(2)}</strong></div>
      </div>
    </div>
  `;

  document.getElementById('invoiceModal').classList.add('active');
}

// Admin Raw JSON Inspector Modal
function inspectJson(id) {
  const inv = currentInvoices.find(i => i.id === id);
  if (!inv) return;

  const modalBody = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent = `MongoDB BSON Document: ${inv.id}`;

  modalBody.innerHTML = `
    <pre style="background:#060911; padding:16px; border-radius:8px; font-family:'JetBrains Mono',monospace; color:#38bdf8; max-height:450px; overflow-y:auto; font-size:12px; line-height:1.5;">
${JSON.stringify(inv, null, 2)}
    </pre>
  `;

  document.getElementById('invoiceModal').classList.add('active');
}

function inspectLogs(id) {
  const inv = currentInvoices.find(i => i.id === id);
  if (!inv) return;

  const modalBody = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent = `Processing Trail: ${inv.invoiceNumber}`;

  modalBody.innerHTML = `
    <pre style="background:#060911; padding:16px; border-radius:8px; font-family:'JetBrains Mono',monospace; color:#10b981; line-height:1.6;">
${inv.processingLogs.join('\n')}
    </pre>
  `;

  document.getElementById('invoiceModal').classList.add('active');
}

function closeModal() {
  document.getElementById('invoiceModal').classList.remove('active');
}
