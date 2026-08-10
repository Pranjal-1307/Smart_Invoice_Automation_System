let currentInvoices = [];
let currentFilter = 'PENDING';
let currentRole = 'FINANCE_MANAGER'; // Default role: FINANCE_MANAGER, AP_CLERK, ADMIN
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNav();
  initDragAndDrop();
  fetchInvoices();
});

// AUTHENTICATION SYSTEM MANAGEMENT

function initAuth() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      currentUser = null;
    }
  }

  if (!currentUser) {
    // Default Guest Session
    currentUser = {
      name: 'Guest User',
      email: 'guest@invoice.com',
      role: 'AP_CLERK'
    };
  }

  updateAuthUserUI();
}

function updateAuthUserUI() {
  const userNameLabel = document.getElementById('userNameLabel');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const btnAuthAction = document.getElementById('btnAuthAction');

  if (userNameLabel) userNameLabel.textContent = currentUser.name;
  
  const roleDisplayNames = {
    'AP_CLERK': 'Accounts Payable (AP Clerk)',
    'FINANCE_MANAGER': 'Finance Manager',
    'ADMIN': 'System Admin'
  };

  if (userRoleBadge) {
    userRoleBadge.textContent = roleDisplayNames[currentUser.role] || currentUser.role;
  }

  if (btnAuthAction) {
    if (currentUser.email === 'guest@invoice.com') {
      btnAuthAction.textContent = '🔑 Sign In / Sign Up';
      btnAuthAction.className = 'btn sm primary auth-action-btn';
    } else {
      btnAuthAction.textContent = '🚪 Sign Out';
      btnAuthAction.className = 'btn sm ghost auth-action-btn';
    }
  }

  // Sync role with logged-in user
  switchRole(currentUser.role, false);
}

function handleAuthButtonClick() {
  if (currentUser && currentUser.email !== 'guest@invoice.com') {
    const confirmLogout = confirm(`Log out from account ${currentUser.email}?`);
    if (confirmLogout) {
      localStorage.removeItem('currentUser');
      currentUser = {
        name: 'Guest User',
        email: 'guest@invoice.com',
        role: 'AP_CLERK'
      };
      updateAuthUserUI();
      appendLog(`[AUTH] User logged out.`);
    }
  } else {
    openAuthModal();
  }
}

function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('active');
    hideAuthAlert();
  }
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

function switchAuthTab(tab) {
  const tabSignIn = document.getElementById('tabBtnSignIn');
  const tabSignUp = document.getElementById('tabBtnSignUp');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const modalHeading = document.getElementById('authModalHeading');
  const modalSubheading = document.getElementById('authModalSubheading');

  hideAuthAlert();

  if (tab === 'login') {
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
    modalHeading.textContent = 'MongoDB User Sign In';
    modalSubheading.textContent = 'Enter credentials stored in MongoDB database';
  } else {
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    signupForm.style.display = 'flex';
    loginForm.style.display = 'none';
    modalHeading.textContent = 'Register MongoDB Account';
    modalSubheading.textContent = 'Create a new user or management account in MongoDB';
  }
}

function fillQuickCredentials(email, password) {
  switchAuthTab('login');
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
  showAuthAlert(`Filled credentials for ${email}. Click "Sign In" to connect.`, 'success');
}

function showAuthAlert(msg, type = 'error') {
  const alertBox = document.getElementById('authAlert');
  if (alertBox) {
    alertBox.style.display = 'block';
    alertBox.className = `auth-alert ${type}`;
    alertBox.textContent = msg;
  }
}

function hideAuthAlert() {
  const alertBox = document.getElementById('authAlert');
  if (alertBox) alertBox.style.display = 'none';
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    showAuthAlert('Authenticating credentials with MongoDB...', 'success');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateAuthUserUI();
      closeAuthModal();
      appendLog(`[AUTH_SUCCESS] Logged in as ${currentUser.name} (${currentUser.role})`);
    } else {
      showAuthAlert(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showAuthAlert('Connection error: ' + err.message, 'error');
  }
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;

  try {
    showAuthAlert('Saving account into MongoDB collection...', 'success');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      updateAuthUserUI();
      closeAuthModal();
      appendLog(`[SIGNUP_SUCCESS] Account registered in MongoDB for ${currentUser.email} (${currentUser.role})`);
    } else {
      showAuthAlert(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    showAuthAlert('Connection error: ' + err.message, 'error');
  }
}

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
    roleDesc.textContent = 'Primary Duty: Ingest & upload invoice documents, batch files, and datasets into MongoDB. Financial approval sign-offs are reserved for Finance Management.';

    if (inputNotice) inputNotice.style.display = 'none';
    if (approvalNotice) {
      approvalNotice.style.display = 'block';
      approvalNotice.innerHTML = `<span>🔒 <strong>AP Clerk View:</strong> Approval actions are restricted. Switch to Finance Manager role to authorize invoices.</span>`;
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
    roleDesc.textContent = 'Primary Duty: Pipeline log diagnostics, engine OCR threshold tuning, raw JSON document inspection, and Database Purge operations.';

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
    roleDesc.textContent = 'Primary Duty: Review pending invoices in MongoDB, inspect line items & tax breakdowns, and execute single or bulk Approve/Reject sign-offs.';

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

  const titles = {
    workflow: { title: "Workflow Overview", sub: "Real-time tracking from Invoice Input to MongoDB & Approval" },
    input: { title: "Invoice Input Stage (AP Clerk)", sub: "Submit Single PDF/IMG, Multiple PDF/IMG, or Dataset CSV/XLSX into MongoDB" },
    engine: { title: "Processing Engine & Diagnostics (Admin)", sub: "OCR field extraction, rule validation & log inspection" },
    mongodb: { title: "MongoDB Document Store (Admin & Audit)", sub: "Direct document collection viewer for smart_invoice_db" },
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
        alert("🔒 Permission Notice: Invoice uploading is restricted to AP Clerk role.");
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
  appendLog(`[FILE_INGEST] Processing ${files.length} file(s) for ${inputType} by ${currentUser ? currentUser.email : currentRole}...`);

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
        ⚡ Upload & Store in MongoDB (${files.length})
      </button>
    `;
  }

  window.pendingUploadFiles = window.pendingUploadFiles || {};
  window.pendingUploadFiles[inputType] = files;
}

async function uploadAndExtractFiles(inputType) {
  if (currentRole !== 'AP_CLERK') {
    alert("🔒 Role Notice: Upload operations are restricted to Accounts Payable (AP Clerk).");
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
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    }
  });
}

// Fetch invoices from backend Express server (Real MongoDB)
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

      const mongoInd = document.getElementById('mongoDbIndicator');
      const mongoSub = document.getElementById('mongoDbSub');
      if (statsData.mongoConnected) {
        if (mongoInd) mongoInd.className = 'status-indicator online';
        if (mongoSub) mongoSub.innerHTML = 'Connected to <code>smart_invoice_db</code>';
      }
    }
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

// Trigger Processing Engine Pipeline
async function triggerProcess(inputType, fileName, fileData = null) {
  try {
    appendLog(`[PROCESSING_TRIGGER] Ingestion by ${currentUser ? currentUser.email : currentRole}: ${inputType} for file "${fileName}"...`);
    switchTab('engine');

    const payload = {
      inputType,
      fileName,
      fileData,
      role: currentRole
    };

    const userEmailHeader = currentUser ? currentUser.email : 'user@invoice.com';

    const res = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole,
        'X-User-Email': userEmailHeader
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      data.processed.forEach(item => {
        appendLog(`[MONGO_SAVED] Invoice: ${item.invoiceNumber} | Vendor: ${item.vendor} | Total: $${item.total.toFixed(2)} | Saved into MongoDB 'invoices' collection`);
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
  appendLog(`[ADMIN_DIAGNOSTIC] MongoDB Collection index state: HEALTHY (Verified with smart_invoice_db)`);
}

function updateLogsConsole() {
  const consoleEl = document.getElementById('consoleLogs');
  if (!consoleEl.textContent.trim()) {
    consoleEl.textContent = `[ENGINE_STANDBY] Active monitoring enabled. Pipeline ready for MongoDB sync.`;
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
      <td>
        <div class="confidence-bar-container">
          <div class="confidence-fill ${inv.confidenceScore >= 0.95 ? 'high' : 'med'}" style="width: ${inv.confidenceScore * 100}%"></div>
        </div>
        <small style="font-size:11px;">${(inv.confidenceScore * 100).toFixed(0)}%</small>
      </td>
      <td><span class="badge-status ${inv.status}">${inv.status}</span></td>
      <td>
        <button class="btn xs ghost" onclick="inspectLogs('${inv.id}')">📜 Logs (${inv.processingLogs.length})</button>
      </td>
      <td>
        <div class="action-buttons-cell">
          <button class="btn xs secondary" onclick="inspectInvoice('${inv.id}')">👁️ Inspect</button>
          ${currentRole === 'ADMIN' ? `<button class="btn xs accent" onclick="inspectJson('${inv.id}')">JSON</button>` : ''}
          ${currentRole === 'FINANCE_MANAGER' && inv.status === 'PENDING' ? `
            <button class="btn xs primary" onclick="approveInvoice('${inv.id}')">Approve</button>
            <button class="btn xs danger" onclick="rejectInvoice('${inv.id}')">Reject</button>
          ` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Approval Desk Grid
function renderApprovalDesk() {
  const grid = document.getElementById('approvalCardsGrid');
  grid.innerHTML = '';

  const filtered = currentInvoices.filter(i => i.status === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 48px; background:var(--bg-panel); border-radius:var(--radius-lg); border:1px dashed var(--border-color);">
        <p style="color:var(--text-muted); font-size:16px;">No invoices found matching status: <strong>${currentFilter}</strong></p>
      </div>
    `;
    return;
  }

  filtered.forEach(inv => {
    const card = document.createElement('div');
    card.className = `approval-card status-${inv.status.toLowerCase()}`;

    const isHighConf = inv.confidenceScore >= 0.95;

    card.innerHTML = `
      <div class="card-top">
        <span class="inv-badge">${inv.id}</span>
        <span class="badge-status ${inv.status}">${inv.status}</span>
      </div>
      <div class="vendor-title">${inv.vendor}</div>
      <div class="inv-amount">$${inv.total.toFixed(2)}</div>
      
      <div class="inv-meta-grid">
        <div>
          <span class="lbl">Invoice Number</span>
          <span class="val">${inv.invoiceNumber}</span>
        </div>
        <div>
          <span class="lbl">DueDate</span>
          <span class="val">${inv.dueDate}</span>
        </div>
      </div>

      <div class="confidence-section">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
          <span>Confidence Score</span>
          <strong style="color:${isHighConf ? 'var(--accent)' : 'var(--warning)'}">${(inv.confidenceScore * 100).toFixed(0)}%</strong>
        </div>
        <div class="confidence-bar-container">
          <div class="confidence-fill ${isHighConf ? 'high' : 'med'}" style="width: ${inv.confidenceScore * 100}%"></div>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn sm secondary" onclick="inspectInvoice('${inv.id}')">Inspect Document</button>
        ${currentRole === 'FINANCE_MANAGER' && inv.status === 'PENDING' ? `
          <button class="btn sm primary" onclick="approveInvoice('${inv.id}')">Approve</button>
          <button class="btn sm danger" onclick="rejectInvoice('${inv.id}')">Reject</button>
        ` : ''}
      </div>
    `;

    grid.appendChild(card);
  });
}

function filterApproval(status, btnEl) {
  currentFilter = status;
  document.querySelectorAll('.desk-filters .tab-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderApprovalDesk();
}

// Single Invoice Approval (Finance Manager Duty)
async function approveInvoice(id) {
  if (currentRole === 'AP_CLERK') {
    alert("🔒 Role Restriction: Accounts Payable (AP Clerk) is restricted from approving invoices. Switch active role to Finance Manager.");
    return;
  }

  const userEmailHeader = currentUser ? currentUser.email : 'manager@invoice.com';

  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole,
        'X-User-Email': userEmailHeader
      },
      body: JSON.stringify({ id, notes: `Approved via Approval Desk by ${userEmailHeader} (${currentRole})`, role: currentRole })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[APPROVAL] Invoice ${id} approved in MongoDB by ${userEmailHeader}.`);
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

  const confirmBulk = confirm(`⚡ Confirm Bulk Approval in MongoDB:\n\nApprove ${pendingCount} pending invoice(s) with confidence score ≥ 95%?`);
  if (!confirmBulk) return;

  const userEmailHeader = currentUser ? currentUser.email : 'manager@invoice.com';

  try {
    const res = await fetch('/api/approve-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole,
        'X-User-Email': userEmailHeader
      },
      body: JSON.stringify({ role: currentRole, minConfidence: 0.95 })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[BULK_APPROVAL] ${data.approvedCount} invoice(s) bulk approved in MongoDB by ${userEmailHeader}.`);
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

  const userEmailHeader = currentUser ? currentUser.email : 'manager@invoice.com';

  try {
    const res = await fetch('/api/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole,
        'X-User-Email': userEmailHeader
      },
      body: JSON.stringify({ id, reason, role: currentRole })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[REJECTION] Invoice ${id} rejected in MongoDB by ${userEmailHeader}. Reason: ${reason}`);
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

  const firstWarning = confirm("⚠️ ADMIN WARNING:\n\nAre you sure you want to purge and reset all invoice records in MongoDB database 'smart_invoice_db'?");
  if (!firstWarning) return;

  const userEmailHeader = currentUser ? currentUser.email : 'admin@invoice.com';

  try {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole,
        'X-User-Email': userEmailHeader
      },
      body: JSON.stringify({ role: currentRole })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[ADMIN_ACTION] MongoDB invoices collection purged by System Admin (${userEmailHeader}).`);
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
