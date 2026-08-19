let currentInvoices = [];
let currentUsersList = [];
let currentFilter = 'PENDING';
let currentRole = 'AP_CLERK'; // AP_CLERK (USER), FINANCE_MANAGER (MANAGEMENT), ADMIN
let currentUser = null;
let selectedAdminUserEmail = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDragAndDrop();
});

// ============================================================================
// 1. AUTHENTICATION & DASHBOARD ROLE SWITCHING
// ============================================================================

function initAuth() {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      currentUser = null;
    }
  }

  if (currentUser && currentUser.email && currentUser.email !== 'guest@invoice.com') {
    showDashboardView();
  } else {
    showAuthView();
  }
}

function showAuthView() {
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  if (authContainer) authContainer.style.display = 'flex';
  if (appContainer) appContainer.style.display = 'none';
}

function showDashboardView() {
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  if (authContainer) authContainer.style.display = 'none';
  if (appContainer) appContainer.style.display = 'grid';
  
  updateAuthUserUI();
  fetchInvoices();
}

function updateAuthUserUI() {
  if (!currentUser) return;

  currentRole = currentUser.role || 'AP_CLERK';
  
  const userNameLabel = document.getElementById('userNameLabel');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const roleSubtext = document.getElementById('roleSubtext');

  if (userNameLabel) userNameLabel.textContent = currentUser.name;
  
  const roleDisplayNames = {
    'AP_CLERK': 'USER Dashboard (AP Clerk)',
    'FINANCE_MANAGER': 'MANAGEMENT Dashboard (Approver)',
    'ADMIN': 'ADMIN Dashboard (System & Flow)'
  };

  if (userRoleBadge) {
    userRoleBadge.textContent = roleDisplayNames[currentRole] || currentRole;
  }
  if (roleSubtext) {
    roleSubtext.textContent = `${currentRole} Portal`;
  }

  // Render Sidebar Navigation menu specific to role
  renderSidebarNav(currentRole);

  // Activate dedicated dashboard view
  switchDashboardRole(currentRole);
}

let currentUserSubTab = 'all';
let currentMgrSubTab = 'all';
let currentAdminSubTab = 'all';

let API_BASE_URL = '';
if (window.location.port && window.location.port !== '3000' && window.location.protocol.startsWith('http')) {
  API_BASE_URL = 'http://localhost:3000';
}

async function apiFetch(endpoint, options = {}) {
  const url = (API_BASE_URL ? API_BASE_URL : '') + endpoint;
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    }
    return { ok: false, status: res.status, data: null };
  } catch (err) {
    return { ok: false, status: 0, error: err };
  }
}

function renderSidebarNav(role) {
  const navMenu = document.getElementById('navMenu');
  if (!navMenu) return;

  if (role === 'AP_CLERK') {
    navMenu.innerHTML = `
      <button class="nav-item ${currentUserSubTab === 'all' ? 'active' : ''}" onclick="switchUserSubTab('all')">
        <span class="icon">🌐</span> All Overview
      </button>
      <button class="nav-item ${currentUserSubTab === 'instructions' ? 'active' : ''}" onclick="switchUserSubTab('instructions')">
        <span class="icon">📘</span> Instructions & Guide
      </button>
      <button class="nav-item ${currentUserSubTab === 'upload' ? 'active' : ''}" onclick="switchUserSubTab('upload')">
        <span class="icon">📥</span> Submit Invoices
      </button>
      <button class="nav-item ${currentUserSubTab === 'history' ? 'active' : ''}" onclick="switchUserSubTab('history')">
        <span class="icon">📜</span> My Submission History
      </button>
    `;
  } else if (role === 'FINANCE_MANAGER') {
    navMenu.innerHTML = `
      <button class="nav-item ${currentMgrSubTab === 'all' ? 'active' : ''}" onclick="switchMgrSubTab('all')">
        <span class="icon">🌐</span> All Overview
      </button>
      <button class="nav-item ${currentMgrSubTab === 'desk' ? 'active' : ''}" onclick="switchMgrSubTab('desk')">
        <span class="icon">📊</span> Approval Workflow Desk
      </button>
      <button class="nav-item ${currentMgrSubTab === 'analysis' ? 'active' : ''}" onclick="switchMgrSubTab('analysis')">
        <span class="icon">📈</span> Management Analysis
      </button>
    `;
  } else {
    // ADMIN
    navMenu.innerHTML = `
      <button class="nav-item ${currentAdminSubTab === 'all' ? 'active' : ''}" onclick="switchAdminSubTab('all')">
        <span class="icon">🌐</span> All Overview
      </button>
      <button class="nav-item ${currentAdminSubTab === 'users' ? 'active' : ''}" onclick="switchAdminSubTab('users')">
        <span class="icon">👥</span> Users Box Inspector
      </button>
      <button class="nav-item ${currentAdminSubTab === 'engine' ? 'active' : ''}" onclick="switchAdminSubTab('engine')">
        <span class="icon">⚙️</span> Engine & System Flow
      </button>
      <button class="nav-item ${currentAdminSubTab === 'mongo' ? 'active' : ''}" onclick="switchAdminSubTab('mongo')">
        <span class="icon">🍃</span> Raw MongoDB Inspector
      </button>
    `;
  }
}

function switchUserSubTab(tab) {
  currentUserSubTab = tab;
  
  const secInstructions = document.getElementById('userSubSectionInstructions');
  const secUpload = document.getElementById('userSubSectionUpload');
  const secHistory = document.getElementById('userSubSectionHistory');

  if (tab === 'instructions') {
    if (secInstructions) secInstructions.style.display = 'block';
    if (secUpload) secUpload.style.display = 'none';
    if (secHistory) secHistory.style.display = 'none';
  } else if (tab === 'upload') {
    if (secInstructions) secInstructions.style.display = 'none';
    if (secUpload) secUpload.style.display = 'block';
    if (secHistory) secHistory.style.display = 'none';
  } else if (tab === 'history') {
    if (secInstructions) secInstructions.style.display = 'none';
    if (secUpload) secUpload.style.display = 'none';
    if (secHistory) secHistory.style.display = 'block';
  } else {
    // 'all'
    if (secInstructions) secInstructions.style.display = 'block';
    if (secUpload) secUpload.style.display = 'block';
    if (secHistory) secHistory.style.display = 'block';
  }

  // Update sidebar active highlights
  renderSidebarNav('AP_CLERK');

  // Scroll to top of main content smoothly
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;
}

function switchMgrSubTab(tab) {
  currentMgrSubTab = tab;

  const secSummary = document.getElementById('mgrSubSectionSummary');
  const secDesk = document.getElementById('mgrSubSectionDesk');
  const secAnalysis = document.getElementById('mgrSubSectionAnalysis');

  if (tab === 'desk') {
    if (secSummary) secSummary.style.display = 'grid';
    if (secDesk) secDesk.style.display = 'block';
    if (secAnalysis) secAnalysis.style.display = 'none';
  } else if (tab === 'analysis') {
    if (secSummary) secSummary.style.display = 'none';
    if (secDesk) secDesk.style.display = 'none';
    if (secAnalysis) secAnalysis.style.display = 'block';
  } else {
    // 'all'
    if (secSummary) secSummary.style.display = 'grid';
    if (secDesk) secDesk.style.display = 'block';
    if (secAnalysis) secAnalysis.style.display = 'block';
  }

  // Update sidebar active highlights
  renderSidebarNav('FINANCE_MANAGER');

  // Scroll to top of main content smoothly
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;
}

function switchAdminSubTab(tab) {
  currentAdminSubTab = tab;

  const secUsers = document.getElementById('adminSubSectionUsers');
  const secEngine = document.getElementById('adminSubSectionEngine');
  const secMongo = document.getElementById('adminSubSectionMongo');

  if (tab === 'users') {
    if (secUsers) secUsers.style.display = 'block';
    if (secEngine) secEngine.style.display = 'none';
    if (secMongo) secMongo.style.display = 'none';
  } else if (tab === 'engine') {
    if (secUsers) secUsers.style.display = 'none';
    if (secEngine) secEngine.style.display = 'block';
    if (secMongo) secMongo.style.display = 'none';
  } else if (tab === 'mongo') {
    if (secUsers) secUsers.style.display = 'none';
    if (secEngine) secEngine.style.display = 'none';
    if (secMongo) secMongo.style.display = 'block';
  } else {
    // 'all'
    if (secUsers) secUsers.style.display = 'block';
    if (secEngine) secEngine.style.display = 'block';
    if (secMongo) secMongo.style.display = 'block';
  }

  // Update sidebar active highlights
  renderSidebarNav('ADMIN');

  // Scroll to top of main content smoothly
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;
}

function switchDashboardRole(roleId) {
  const roleBanner = document.getElementById('roleBanner');
  const roleIcon = document.getElementById('roleBannerIcon');
  const roleTitle = document.getElementById('roleBannerTitle');
  const roleDesc = document.getElementById('roleBannerDesc');

  const userView = document.getElementById('userDashboardView');
  const mgrView = document.getElementById('mgrDashboardView');
  const adminView = document.getElementById('adminDashboardView');

  // Hide all views first
  if (userView) userView.style.display = 'none';
  if (mgrView) mgrView.style.display = 'none';
  if (adminView) adminView.style.display = 'none';

  if (roleId === 'AP_CLERK') {
    if (userView) userView.style.display = 'block';
    if (roleBanner) {
      roleBanner.className = 'role-banner banner-user';
      if (roleIcon) roleIcon.textContent = '👤';
      if (roleTitle) roleTitle.textContent = '1: USER Dashboard Active';
      if (roleDesc) roleDesc.textContent = 'Upload invoice documents and track your personal submission history (No management or admin tools shown).';
    }
    renderUserDashboard();
    switchUserSubTab(currentUserSubTab);

  } else if (roleId === 'FINANCE_MANAGER') {
    if (mgrView) mgrView.style.display = 'block';
    if (roleBanner) {
      roleBanner.className = 'role-banner banner-manager';
      if (roleIcon) roleIcon.textContent = '👑';
      if (roleTitle) roleTitle.textContent = '2: MANAGEMENT Dashboard Active';
      if (roleDesc) roleDesc.textContent = 'Review pending invoices for approval/recline sign-off and monitor analytics overview.';
    }
    renderManagerDashboard();
    switchMgrSubTab(currentMgrSubTab);

  } else {
    // ADMIN
    if (adminView) adminView.style.display = 'block';
    if (roleBanner) {
      roleBanner.className = 'role-banner banner-admin';
      if (roleIcon) roleIcon.textContent = '⚙️';
      if (roleTitle) roleTitle.textContent = '3: ADMIN Dashboard Active';
      if (roleDesc) roleDesc.textContent = 'System flow monitor, engine diagnostics, raw MongoDB inspector, and interactive Users Box inspector.';
    }
    renderAdminDashboard();
    switchAdminSubTab(currentAdminSubTab);
  }
}

function showDashboardSection(viewId) {
  switchDashboardRole(currentRole);
}

function handleLogout() {
  if (confirm(`Log out from account ${currentUser ? currentUser.email : ''}?`)) {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showAuthView();
    showAuthAlert('Logged out successfully.', 'success');
  }
}

function switchAuthTab(tab) {
  const tabSignIn = document.getElementById('tabBtnSignIn');
  const tabSignUp = document.getElementById('tabBtnSignUp');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const heading = document.getElementById('authCardHeading');

  hideAuthAlert();

  if (tab === 'login') {
    if (tabSignIn) tabSignIn.classList.add('active');
    if (tabSignUp) tabSignUp.classList.remove('active');
    if (loginForm) loginForm.style.display = 'flex';
    if (signupForm) signupForm.style.display = 'none';
    if (heading) heading.textContent = 'Welcome Back';
  } else {
    if (tabSignUp) tabSignUp.classList.add('active');
    if (tabSignIn) tabSignIn.classList.remove('active');
    if (signupForm) signupForm.style.display = 'flex';
    if (loginForm) loginForm.style.display = 'none';
    if (heading) heading.textContent = 'Create Account';
  }
}

function fillQuickCredentials(email, password) {
  switchAuthTab('login');
  const loginEmail = document.getElementById('loginEmail');
  const loginPass = document.getElementById('loginPassword');
  if (loginEmail) loginEmail.value = email;
  if (loginPass) loginPass.value = password;
  showAuthAlert(`Filled demo credentials for ${email}. Click "Log In to Role Dashboard".`, 'success');
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const eyeOpen = btn.querySelector('.eye-open');
  const eyeClosed = btn.querySelector('.eye-closed');

  if (input.type === 'password') {
    input.type = 'text';
    if (eyeClosed) eyeClosed.style.display = 'none';
    if (eyeOpen) eyeOpen.style.display = 'inline-block';
  } else {
    input.type = 'password';
    if (eyeClosed) eyeClosed.style.display = 'inline-block';
    if (eyeOpen) eyeOpen.style.display = 'none';
  }
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
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    showAuthAlert('Authenticating user account...', 'success');
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok && res.data && res.data.success) {
      currentUser = res.data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showDashboardView();
      return;
    }

    if (res.data && res.data.message) {
      showAuthAlert(res.data.message, 'error');
      return;
    }

    // Client-side fallback if server API is offline or disconnected
    console.warn("API login endpoint unavailable, applying local fallback login...");
    const demoAccounts = {
      'user@invoice.com': { id: 'u_user', name: 'John AP Clerk', email: 'user@invoice.com', role: 'AP_CLERK' },
      'manager@invoice.com': { id: 'u_mgr', name: 'Finance Management Head', email: 'manager@invoice.com', role: 'FINANCE_MANAGER' },
      'admin@invoice.com': { id: 'u_admin', name: 'System Admin', email: 'admin@invoice.com', role: 'ADMIN' }
    };

    const lowerEmail = email.toLowerCase();
    if (demoAccounts[lowerEmail]) {
      currentUser = demoAccounts[lowerEmail];
    } else {
      currentUser = {
        id: 'u_' + Date.now(),
        name: email.split('@')[0],
        email: email,
        role: 'AP_CLERK'
      };
    }
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showDashboardView();
  } catch (err) {
    showAuthAlert('Login error: ' + err.message, 'error');
  }
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const role = document.getElementById('signupRole').value;

  try {
    showAuthAlert('Registering account credentials...', 'success');
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    if (res.ok && res.data && res.data.success) {
      currentUser = res.data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showDashboardView();
      return;
    }

    if (res.data && res.data.message) {
      showAuthAlert(res.data.message, 'error');
      return;
    }

    // Client-side fallback if server API is offline
    console.warn("API signup endpoint unavailable, registering user locally...");
    currentUser = {
      id: 'u_' + Date.now(),
      name: name || email.split('@')[0],
      email: email,
      role: role || 'AP_CLERK'
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showDashboardView();
  } catch (err) {
    showAuthAlert('Signup error: ' + err.message, 'error');
  }
}

// ============================================================================
// 2. DATA FETCHING & DASHBOARD RENDERING
// ============================================================================

async function fetchInvoices() {
  try {
    const [invRes, statsRes] = await Promise.all([
      apiFetch('/api/invoices'),
      apiFetch('/api/stats')
    ]);

    if (invRes.ok && invRes.data && invRes.data.success) {
      currentInvoices = invRes.data.invoices;
    }

    if (statsRes.ok && statsRes.data && statsRes.data.success) {
      const stats = statsRes.data.stats;
      document.getElementById('statTotalVal').textContent = `$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      document.getElementById('statAccuracy').textContent = `${stats.avgConfidence.toFixed(1)}%`;
      document.getElementById('statPendingCount').textContent = stats.pending;

      const mongoInd = document.getElementById('mongoDbIndicator');
      const mongoSub = document.getElementById('mongoDbSub');
      if (statsRes.data.mongoConnected) {
        if (mongoInd) mongoInd.className = 'status-indicator online';
        if (mongoSub) mongoSub.innerHTML = 'Connected to <code>smart_invoice_db</code>';
      }
    }

    // Refresh current role dashboard
    if (currentRole === 'AP_CLERK') {
      renderUserDashboard();
    } else if (currentRole === 'FINANCE_MANAGER') {
      renderManagerDashboard();
    } else if (currentRole === 'ADMIN') {
      renderAdminDashboard();
    }
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

// ----------------------------------------------------------------------------
// DASHBOARD 1: USER DASHBOARD (AP_CLERK)
// ----------------------------------------------------------------------------
function renderUserDashboard() {
  filterUserHistory();
}

function filterUserHistory() {
  const tbody = document.getElementById('userHistoryTableBody');
  const ownerTag = document.getElementById('userHistoryOwnerTag');
  const countLabel = document.getElementById('userHistoryCountLabel');
  if (!tbody) return;

  const userEmail = currentUser ? currentUser.email : 'user@invoice.com';
  if (ownerTag) ownerTag.textContent = `Showing invoices for: ${userEmail}`;

  const userInvoices = currentInvoices.filter(i => i.createdBy === userEmail || !i.createdBy || i.createdBy === 'AP Clerk');

  const searchTerm = (document.getElementById('userHistorySearchInput')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('userHistoryTypeFilter')?.value || 'ALL';
  const statusFilter = document.getElementById('userHistoryStatusFilter')?.value || 'ALL';

  const filtered = userInvoices.filter(inv => {
    // Search filter
    const matchesSearch = !searchTerm || 
      (inv.id && inv.id.toLowerCase().includes(searchTerm)) ||
      (inv.vendor && inv.vendor.toLowerCase().includes(searchTerm)) ||
      (inv.filename && inv.filename.toLowerCase().includes(searchTerm)) ||
      (inv.notes && inv.notes.toLowerCase().includes(searchTerm)) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm));

    // Type filter
    const isExcel = inv.fileType === 'xlsx' || inv.fileType === 'xls' || inv.fileType === 'csv' || inv.inputType === 'DATASET_CSV' || (inv.filename && (inv.filename.endsWith('.xlsx') || inv.filename.endsWith('.xls') || inv.filename.endsWith('.csv')));
    const isPdf = !isExcel;

    const matchesType = typeFilter === 'ALL' || (typeFilter === 'PDF' && isPdf) || (typeFilter === 'EXCEL' && isExcel);

    // Status filter
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (countLabel) countLabel.textContent = `${filtered.length} of ${userInvoices.length} records`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);">No invoice records found matching your search. Upload a PDF or Excel invoice above!</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(inv => {
    const isExcel = inv.fileType === 'xlsx' || inv.fileType === 'xls' || inv.fileType === 'csv' || inv.inputType === 'DATASET_CSV' || (inv.filename && (inv.filename.endsWith('.xlsx') || inv.filename.endsWith('.xls') || inv.filename.endsWith('.csv')));
    const formatBadge = isExcel ? '<span class="badge-source badge-excel">📊 EXCEL</span>' : '<span class="badge-source badge-pdf">📄 PDF</span>';
    const formattedSize = inv.fileSize ? ` (${(inv.fileSize / 1024).toFixed(1)} KB)` : '';

    return `
      <tr>
        <td>
          <div style="font-weight:700;"><code>${inv.id}</code></div>
          <div style="font-size:11px; margin-top:2px;">${formatBadge}</div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--text-main); font-size:13px;" title="${inv.filename || ''}">${inv.filename || 'Document'}</div>
          <span style="font-size:11px; color:var(--text-muted);">${inv.invoiceNumber}${formattedSize}</span>
        </td>
        <td><strong>${inv.vendor}</strong></td>
        <td><strong style="color:#10b981;">$${(inv.total || 0).toFixed(2)}</strong></td>
        <td><span class="confidence-badge" style="color:${inv.confidenceScore >= 0.94 ? '#10b981' : '#f59e0b'}; font-weight:700;">${((inv.confidenceScore || 0) * 100).toFixed(0)}%</span></td>
        <td><span class="status-badge status-${inv.status.toLowerCase()}">${inv.status}</span></td>
        <td>
          <div>${inv.date || new Date(inv.createdAt).toLocaleDateString()}</div>
          ${inv.notes ? `<div style="font-size:11px; color:#a5b4fc; margin-top:2px;">📝 "${inv.notes}"</div>` : ''}
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:nowrap;">
            <button class="btn xs ghost" onclick="inspectInvoice('${inv.id}')" title="View details and document preview">👁️ View</button>
            <button class="btn xs secondary" onclick="downloadInvoiceFile('${inv.id}')" title="Download original file">📥 Download</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function downloadInvoiceFile(id) {
  const inv = currentInvoices.find(i => i.id === id);
  if (!inv) return;

  if (inv.fileDataUrl) {
    const a = document.createElement('a');
    a.href = inv.fileDataUrl;
    a.download = inv.filename || `invoice_${inv.id}.${inv.fileType || 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    window.open(`/api/invoices/${id}/download`, '_blank');
  }
}

// ----------------------------------------------------------------------------
// DASHBOARD 2: MANAGEMENT DASHBOARD (FINANCE_MANAGER)
// ----------------------------------------------------------------------------
function renderManagerDashboard() {
  const pendingInvoices = currentInvoices.filter(i => i.status === 'PENDING');
  const approvedInvoices = currentInvoices.filter(i => i.status === 'APPROVED');
  const rejectedInvoices = currentInvoices.filter(i => i.status === 'REJECTED');

  const pendingCountEl = document.getElementById('mgrPendingCount');
  const approvedValEl = document.getElementById('mgrApprovedVal');
  const approvedCountEl = document.getElementById('mgrApprovedCount');
  const rejectedValEl = document.getElementById('mgrRejectedVal');
  const rejectedCountEl = document.getElementById('mgrRejectedCount');
  const avgConfidenceEl = document.getElementById('mgrAvgConfidence');

  if (pendingCountEl) pendingCountEl.textContent = `${pendingInvoices.length} Invoices`;

  const totalApprovedVal = approvedInvoices.reduce((acc, i) => acc + (i.total || 0), 0);
  if (approvedValEl) approvedValEl.textContent = `$${totalApprovedVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (approvedCountEl) approvedCountEl.textContent = `${approvedInvoices.length} approved`;

  const totalRejectedVal = rejectedInvoices.reduce((acc, i) => acc + (i.total || 0), 0);
  if (rejectedValEl) rejectedValEl.textContent = `$${totalRejectedVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (rejectedCountEl) rejectedCountEl.textContent = `${rejectedInvoices.length} rejected`;

  const avgConfidence = currentInvoices.length > 0 
    ? (currentInvoices.reduce((acc, i) => acc + (i.confidenceScore || 0), 0) / currentInvoices.length) * 100 
    : 0;
  if (avgConfidenceEl) avgConfidenceEl.textContent = `${avgConfidence.toFixed(1)}%`;

  // Render Approval Desk Cards
  renderApprovalDesk();

  // Render Analysis Metrics Progress Bars & Vendors Table
  renderManagementAnalysis(approvedInvoices.length, pendingInvoices.length, rejectedInvoices.length);
}

function renderApprovalDesk() {
  const grid = document.getElementById('approvalCardsGrid');
  if (!grid) return;

  const filtered = currentInvoices.filter(i => i.status === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:48px; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; color:#64748b;">
      No ${currentFilter.toLowerCase()} invoices found in database.
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(inv => `
    <div class="approval-card">
      <div class="card-top flex-between">
        <div class="inv-badge"><code>${inv.invoiceNumber}</code></div>
        <span class="status-badge status-${inv.status.toLowerCase()}">${inv.status}</span>
      </div>

      <div class="vendor-info" style="margin: 12px 0;">
        <h4 style="font-size:16px; font-weight:700; color:#0f172a;">${inv.vendor}</h4>
        <p style="font-size:12px; color:#64748b;">Submitted by: ${inv.createdBy || 'AP Clerk'}</p>
      </div>

      <div class="inv-metrics-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#f8fafc; padding:10px; border-radius:8px; margin-bottom:14px;">
        <div>
          <span style="font-size:11px; color:#64748b;">TOTAL AMOUNT</span>
          <div style="font-size:16px; font-weight:800; color:#0f172a;">$${(inv.total || 0).toFixed(2)}</div>
        </div>
        <div>
          <span style="font-size:11px; color:#64748b;">OCR CONFIDENCE</span>
          <div style="font-size:16px; font-weight:800; color:${inv.confidenceScore >= 0.95 ? '#059669' : '#d97706'};">${((inv.confidenceScore || 0) * 100).toFixed(0)}%</div>
        </div>
      </div>

      <div class="card-actions flex-gap">
        ${inv.status === 'PENDING' ? `
          <button class="btn sm accent flex-1" onclick="approveInvoice('${inv.id}')">✅ Approve</button>
          <button class="btn sm danger flex-1" onclick="rejectInvoice('${inv.id}')">🚫 Reject</button>
        ` : `
          <button class="btn sm ghost flex-1" onclick="inspectInvoice('${inv.id}')">👁️ View Details</button>
        `}
      </div>
    </div>
  `).join('');
}

function filterApproval(status, btnEl) {
  currentFilter = status;
  if (btnEl) {
    document.querySelectorAll('.desk-filters .tab-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  renderApprovalDesk();
}

function renderManagementAnalysis(appCount, pendCount, rejCount) {
  const total = appCount + pendCount + rejCount;
  const appPerc = total > 0 ? Math.round((appCount / total) * 100) : 0;
  const pendPerc = total > 0 ? Math.round((pendCount / total) * 100) : 0;
  const rejPerc = total > 0 ? Math.round((rejCount / total) * 100) : 0;

  const barApp = document.getElementById('barApproved');
  const barPend = document.getElementById('barPending');
  const barRej = document.getElementById('barRejected');

  if (barApp) barApp.style.width = `${appPerc}%`;
  if (barPend) barPend.style.width = `${pendPerc}%`;
  if (barRej) barRej.style.width = `${rejPerc}%`;

  const valApp = document.getElementById('valApprovedPerc');
  const valPend = document.getElementById('valPendingPerc');
  const valRej = document.getElementById('valRejectedPerc');

  if (valApp) valApp.textContent = `${appPerc}%`;
  if (valPend) valPend.textContent = `${pendPerc}%`;
  if (valRej) valRej.textContent = `${rejPerc}%`;

  // Vendor Breakdown
  const vendorMap = {};
  currentInvoices.forEach(i => {
    if (!vendorMap[i.vendor]) {
      vendorMap[i.vendor] = { count: 0, total: 0 };
    }
    vendorMap[i.vendor].count += 1;
    vendorMap[i.vendor].total += (i.total || 0);
  });

  const tbody = document.getElementById('vendorBreakdownBody');
  if (tbody) {
    const sortedVendors = Object.keys(vendorMap).slice(0, 5);
    tbody.innerHTML = sortedVendors.map(v => `
      <tr>
        <td><strong>${v}</strong></td>
        <td>${vendorMap[v].count} invoices</td>
        <td><strong>$${vendorMap[v].total.toFixed(2)}</strong></td>
      </tr>
    `).join('');
  }
}

// ----------------------------------------------------------------------------
// DASHBOARD 3: ADMIN DASHBOARD (ADMIN)
// ----------------------------------------------------------------------------
function renderAdminDashboard() {
  loadAdminUsers();
  renderMongoDBTable();
}

async function loadAdminUsers() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success) {
      currentUsersList = data.users;
      renderUserBoxesGrid(data.users);
    }
  } catch (err) {
    console.error("Error loading admin users:", err);
  }
}

function renderUserBoxesGrid(users) {
  const grid = document.getElementById('userBoxesGrid');
  if (!grid) return;

  grid.innerHTML = users.map(u => `
    <div class="user-card-box ${selectedAdminUserEmail === u.email ? 'active' : ''}" onclick="selectAdminUserCard('${u.email}', '${u.name.replace(/'/g, "\\'")}', '${u.role}')">
      <div class="user-card-head">
        <div class="user-avatar-badge">${u.role === 'ADMIN' ? '⚙️' : u.role === 'FINANCE_MANAGER' ? '👑' : '👤'}</div>
        <div class="user-card-meta">
          <h4>${u.name}</h4>
          <span>${u.email}</span>
        </div>
      </div>
      <div class="user-card-stats">
        <span class="stat-chip-sm active-count">Total: ${u.totalSubmitted}</span>
        <span class="stat-chip-sm" style="color:#059669;">Approved: ${u.approvedCount}</span>
        <span class="stat-chip-sm" style="color:#d97706;">Pending: ${u.pendingCount}</span>
      </div>
    </div>
  `).join('');
}

function selectAdminUserCard(email, name, role) {
  selectedAdminUserEmail = email;
  renderUserBoxesGrid(currentUsersList);

  const panel = document.getElementById('selectedUserDetailPanel');
  if (panel) panel.style.display = 'block';

  document.getElementById('inspectUserName').textContent = name;
  document.getElementById('inspectUserEmail').textContent = email;
  document.getElementById('inspectUserRole').textContent = role;

  const userInvoices = currentInvoices.filter(i => i.createdBy === email || (role === 'AP_CLERK' && !i.createdBy));

  document.getElementById('inspectTotalSubmitted').textContent = userInvoices.length;
  document.getElementById('inspectApprovedCount').textContent = userInvoices.filter(i => i.status === 'APPROVED').length;
  document.getElementById('inspectPendingCount').textContent = userInvoices.filter(i => i.status === 'PENDING').length;

  const tbody = document.getElementById('inspectUserTableBody');
  if (!tbody) return;

  if (userInvoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No invoice records submitted by user ${email}.</td></tr>`;
    return;
  }

  tbody.innerHTML = userInvoices.map(inv => `
    <tr>
      <td><code>${inv.id}</code></td>
      <td><strong>${inv.vendor}</strong></td>
      <td><span class="badge-source">${inv.inputType}</span></td>
      <td><strong>$${(inv.total || 0).toFixed(2)}</strong></td>
      <td>${((inv.confidenceScore || 0) * 100).toFixed(0)}%</td>
      <td><span class="status-badge status-${inv.status.toLowerCase()}">${inv.status}</span></td>
      <td>${inv.date || new Date(inv.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn xs ghost" onclick="inspectInvoice('${inv.id}')">👁️ Inspect</button>
      </td>
    </tr>
  `).join('');
}

function renderMongoDBTable() {
  const tbody = document.getElementById('mongoTableBody');
  if (!tbody) return;

  const filterSelect = document.getElementById('dbStatusFilter');
  const selectedStatus = filterSelect ? filterSelect.value : 'ALL';

  const docs = selectedStatus === 'ALL' 
    ? currentInvoices 
    : currentInvoices.filter(i => i.status === selectedStatus);

  if (docs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#64748b;">No documents found in MongoDB collection 'invoices'.</td></tr>`;
    return;
  }

  tbody.innerHTML = docs.map(inv => `
    <tr>
      <td><code>${inv.id}</code></td>
      <td><strong>${inv.createdBy || 'AP Clerk'}</strong></td>
      <td><strong>${inv.vendor}</strong></td>
      <td><strong>$${(inv.total || 0).toFixed(2)}</strong></td>
      <td>${((inv.confidenceScore || 0) * 100).toFixed(0)}%</td>
      <td><span class="status-badge status-${inv.status.toLowerCase()}">${inv.status}</span></td>
      <td><button class="btn xs ghost" onclick="inspectLogs('${inv.id}')">📜 Trail (${inv.processingLogs ? inv.processingLogs.length : 0})</button></td>
      <td>
        <button class="btn xs ghost" onclick="inspectJson('${inv.id}')">🍃 BSON JSON</button>
      </td>
    </tr>
  `).join('');
}

// ============================================================================
// 3. FILE UPLOAD & PROCESSING TRIGGER LOGIC
// ============================================================================

function triggerFileInput(inputId) {
  const inputEl = document.getElementById(inputId);
  if (inputEl) inputEl.click();
}

function initDragAndDrop() {
  const setupZone = (zoneId, inputType) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      zone.addEventListener(eventName, (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
      }, false);
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processUploadedFiles(Array.from(files), inputType);
      }
    });
  };

  setupZone('dropZoneSingle', 'SINGLE_PDF');
  setupZone('dropZoneMulti', 'MULTIPLE_PDF');
  setupZone('dropZoneDataset', 'DATASET_CSV');
}

function handleFileSelect(event, inputType) {
  const files = Array.from(event.target.files);
  if (files.length > 0) {
    processUploadedFiles(files, inputType);
  }
}

async function processUploadedFiles(files, inputType) {
  const previewIdMap = {
    'SINGLE_PDF': 'singleFilePreview',
    'MULTIPLE_PDF': 'multiFilePreview',
    'DATASET_CSV': 'datasetFilePreview'
  };
  const previewArea = document.getElementById(previewIdMap[inputType]);

  const fileTypeLabel = inputType === 'SINGLE_PDF' ? 'PDF / Image' : inputType === 'DATASET_CSV' ? 'Excel / CSV' : 'Mixed Batch';

  if (previewArea) {
    previewArea.style.display = 'block';
    previewArea.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:#64748b; margin-bottom:8px;">Selected ${fileTypeLabel} Files:</div>
      ${files.map(f => `
        <div class="file-item-chip">
          <span class="file-name">${f.name.endsWith('.pdf') ? '📄' : '📊'} ${f.name}</span>
          <span class="file-size">${(f.size / 1024).toFixed(1)} KB</span>
        </div>
      `).join('')}
      <button class="btn sm primary" style="width:100%; margin-top:8px;" onclick="uploadAndExtractFiles('${inputType}')">
        ⚡ Upload & Process ${files.length} Document(s) in MongoDB
      </button>
    `;
  }

  window.pendingUploadFiles = window.pendingUploadFiles || {};
  window.pendingUploadFiles[inputType] = files;
}

function showNotificationAlert(message, type = 'info', title = '') {
  let toastContainer = document.getElementById('globalToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'globalToastContainer';
    toastContainer.className = 'toast-notification-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const iconMap = {
    'success': '✅',
    'error': '🚫',
    'warning': '⚠️',
    'info': 'ℹ️'
  };

  const icon = iconMap[type] || '🔔';

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      <div class="toast-message">${message.replace(/\n/g, '<br>')}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'fadeOutToast 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }
  }, 6000);
}

async function uploadAndExtractFiles(inputType) {
  const files = window.pendingUploadFiles ? window.pendingUploadFiles[inputType] : null;
  if (!files || files.length === 0) return;

  // Extract optional custom metadata fields filled by the user
  let customVendor = '';
  let customDate = '';
  let notes = '';

  if (inputType === 'SINGLE_PDF') {
    customVendor = document.getElementById('pdfVendorInput')?.value || '';
    customDate = document.getElementById('pdfDateInput')?.value || '';
    notes = document.getElementById('pdfNotesInput')?.value || '';
  } else if (inputType === 'DATASET_CSV') {
    customVendor = document.getElementById('excelVendorInput')?.value || '';
    notes = document.getElementById('excelNotesInput')?.value || '';
  } else if (inputType === 'MULTIPLE_PDF') {
    notes = document.getElementById('batchNotesInput')?.value || '';
  }

  let uploadSuccessCount = 0;

  for (const file of files) {
    const dataUrl = await readFileAsDataURL(file);
    let rawTextContent = null;
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.type.includes('text')) {
      rawTextContent = await readFileAsText(file);
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const fileType = ext === 'pdf' ? 'pdf' : (ext === 'xlsx' || ext === 'xls') ? 'xlsx' : ext === 'csv' ? 'csv' : 'pdf';

    const isSuccess = await triggerProcess(inputType, file.name, {
      fileSize: file.size,
      fileType: fileType,
      fileDataUrl: dataUrl,
      rawContent: rawTextContent || dataUrl,
      customVendor,
      customDate,
      notes
    });

    if (isSuccess) {
      uploadSuccessCount++;
    }
  }

  // Clear preview and input fields
  const previewIdMap = {
    'SINGLE_PDF': 'singleFilePreview',
    'MULTIPLE_PDF': 'multiFilePreview',
    'DATASET_CSV': 'datasetFilePreview'
  };
  const previewArea = document.getElementById(previewIdMap[inputType]);
  if (previewArea) previewArea.style.display = 'none';

  if (document.getElementById('pdfVendorInput')) document.getElementById('pdfVendorInput').value = '';
  if (document.getElementById('pdfNotesInput')) document.getElementById('pdfNotesInput').value = '';
  if (document.getElementById('excelVendorInput')) document.getElementById('excelVendorInput').value = '';
  if (document.getElementById('excelNotesInput')) document.getElementById('excelNotesInput').value = '';

  // Show notification alert box when data is uploaded by user
  if (uploadSuccessCount > 0) {
    const successMsg = `Data Uploaded Successfully!\n${uploadSuccessCount} file(s) processed and stored in database.`;
    showNotificationAlert(successMsg, "success", "Data Uploaded Successfully");
    alert(`✅ Data Uploaded Successfully!\n\n${uploadSuccessCount} file(s) processed and stored into system database.`);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsText(file);
  });
}

async function triggerProcess(inputType, fileName, extraData = null) {
  try {
    const userEmailHeader = currentUser ? currentUser.email : 'user@invoice.com';

    let fileData = null;
    let fileDataUrl = null;
    let fileSize = null;
    let fileType = null;
    let customVendor = '';
    let customDate = '';
    let notes = '';

    if (extraData && typeof extraData === 'object') {
      fileData = extraData;
      fileDataUrl = extraData.fileDataUrl || null;
      fileSize = extraData.fileSize || null;
      fileType = extraData.fileType || null;
      customVendor = extraData.customVendor || '';
      customDate = extraData.customDate || '';
      notes = extraData.notes || '';
    }

    const payload = {
      inputType,
      fileName,
      fileData,
      fileDataUrl,
      fileSize,
      fileType,
      customVendor,
      customDate,
      notes,
      role: currentRole
    };

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
      appendLog(`[MONGODB_STORE] Ingested ${data.processed ? data.processed.length : 1} invoice document(s) by ${userEmailHeader}`);
      fetchInvoices();
      return true;
    } else {
      showNotificationAlert(`Upload Error: ${data.message || 'Processing failed'}`, "error", "Upload Error");
      alert(`Upload Error: ${data.message || 'Processing failed'}`);
      return false;
    }
  } catch (err) {
    console.error("Processing error:", err);
    showNotificationAlert(`Upload Error: ${err.message}`, "error", "Upload Error");
    alert(`Upload Error: ${err.message}`);
    return false;
  }
}

// ============================================================================
// 4. MANAGEMENT & ADMIN ACTIONS
// ============================================================================

async function approveInvoice(id) {
  const userEmailHeader = currentUser ? currentUser.email : 'manager@invoice.com';

  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': currentRole,
        'X-User-Email': userEmailHeader
      },
      body: JSON.stringify({ id, notes: `Approved by Management (${userEmailHeader})`, role: currentRole })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`[APPROVAL] Invoice ${id} approved by ${userEmailHeader}`);
      showNotificationAlert(`Invoice ${id} Approved Successfully!`, "success", "Approval Successful");
      fetchInvoices();
    } else {
      alert(`Approval error: ${data.message}`);
    }
  } catch (err) {
    alert("Approval error: " + err.message);
  }
}

async function executeBulkApproval() {
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
      appendLog(`[BULK_APPROVAL] ${data.approvedCount} invoice(s) approved by ${userEmailHeader}`);
      showNotificationAlert(`${data.approvedCount} invoice(s) Approved Successfully!`, "success", "Bulk Approval Successful");
      fetchInvoices();
    }
  } catch (err) {
    alert("Bulk approval error: " + err.message);
  }
}

let currentRejectInvoiceId = null;

function rejectInvoice(id) {
  const inv = currentInvoices.find(i => i.id === id || i._id === id);
  currentRejectInvoiceId = id;

  const infoEl = document.getElementById('rejectModalInvoiceInfo');
  const inputEl = document.getElementById('rejectReasonInput');
  const errEl = document.getElementById('rejectModalError');

  if (infoEl) {
    infoEl.innerHTML = `
      <div><strong>Invoice #:</strong> <code>${inv ? inv.invoiceNumber || inv.id : id}</code></div>
      <div><strong>Vendor:</strong> <strong>${inv ? inv.vendor : 'Unknown Vendor'}</strong></div>
      <div><strong>Total Amount:</strong> <strong style="color:#059669;">$${(inv ? inv.total || 0 : 0).toFixed(2)}</strong></div>
    `;
  }

  if (inputEl) inputEl.value = '';
  if (errEl) errEl.style.display = 'none';

  const modal = document.getElementById('rejectModal');
  if (modal) modal.classList.add('active');
}

function closeRejectModal() {
  const modal = document.getElementById('rejectModal');
  if (modal) modal.classList.remove('active');
  currentRejectInvoiceId = null;
}

async function submitRejectInvoice() {
  if (!currentRejectInvoiceId) return;

  const inputEl = document.getElementById('rejectReasonInput');
  const errEl = document.getElementById('rejectModalError');
  const reason = inputEl ? inputEl.value.trim() : '';

  if (!reason) {
    if (errEl) errEl.style.display = 'block';
    showNotificationAlert("⚠️ Rejection Reason Required: Please enter a reason in the pop-up field.", "warning", "Reason Required");
    return;
  }

  if (errEl) errEl.style.display = 'none';

  const id = currentRejectInvoiceId;
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
      closeRejectModal();

      appendLog(`[REJECTION] Invoice ${id} rejected by ${userEmailHeader}: ${reason}`);
      const rejectMsg = `Data Rejected Successfully!\nReason: "${reason}"`;
      showNotificationAlert(rejectMsg, "error", "Data Rejected by Management");

      // Alert box showing Data Rejected Successfully!
      alert(`🚫 Data Rejected Successfully!\n\nReason: "${reason}"\nInvoice ID: ${id}`);
      fetchInvoices();
    } else {
      showNotificationAlert(`Rejection error: ${data.message}`, "error", "Rejection Error");
      alert(`Rejection error: ${data.message}`);
    }
  } catch (err) {
    showNotificationAlert("Rejection error: " + err.message, "error", "Rejection Error");
    alert("Rejection error: " + err.message);
  }
}

async function confirmResetDatabase() {
  if (currentRole !== 'ADMIN') {
    alert("🔒 Permission Denied: Purging database requires System Admin role.");
    return;
  }

  if (!confirm("⚠️ ADMIN CONFIRMATION: Purge all invoice records in MongoDB?")) return;

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
      appendLog(`[ADMIN_ACTION] MongoDB collection purged by ${userEmailHeader}`);
      fetchInvoices();
    }
  } catch (err) {
    alert("Reset error: " + err.message);
  }
}

// Diagnostic runner simulation
function simulateEngineDiagnostic() {
  appendLog("[DIAGNOSTIC] Executing system health check...");
  appendLog("[DIAGNOSTIC] Mongo Driver: Connected | Memory Usage: Normal | OCR Accuracy Target: 90%");
}

function clearLogsConsole() {
  const logsEl = document.getElementById('consoleLogs');
  if (logsEl) logsEl.textContent = '[ENGINE_LOGS] Console reset by user.\n';
}

function appendLog(msg) {
  const logsEl = document.getElementById('consoleLogs');
  if (logsEl) {
    const timestamp = new Date().toLocaleTimeString();
    logsEl.textContent += `[${timestamp}] ${msg}\n`;
    logsEl.scrollTop = logsEl.scrollHeight;
  }
}

// Modal Inspection functions
function inspectInvoice(id) {
  const inv = currentInvoices.find(i => i.id === id || i._id === id);
  if (!inv) return;

  const modalBody = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent = `Invoice Inspection: ${inv.invoiceNumber || inv.id} (${inv.vendor || 'Unknown Vendor'})`;

  const isPdf = inv.fileType === 'pdf' || (inv.filename && inv.filename.endsWith('.pdf')) || (inv.fileDataUrl && inv.fileDataUrl.includes('application/pdf'));
  const isExcel = inv.fileType === 'xlsx' || inv.fileType === 'xls' || inv.fileType === 'csv' || inv.inputType === 'DATASET_CSV' || (inv.filename && (inv.filename.endsWith('.xlsx') || inv.filename.endsWith('.xls') || inv.filename.endsWith('.csv')));

  let documentPreviewHtml = '';

  if (inv.fileDataUrl && isPdf) {
    documentPreviewHtml = `
      <div style="margin-bottom: 16px;">
        <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>📄 UPLOADED PDF PREVIEW (${inv.filename || 'Document.pdf'})</span>
          <button class="btn xs secondary" onclick="downloadInvoiceFile('${inv.id}')">📥 Download PDF</button>
        </div>
        <iframe src="${inv.fileDataUrl}" style="width:100%; height:260px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc;"></iframe>
      </div>
    `;
  } else if (isExcel) {
    documentPreviewHtml = `
      <div style="margin-bottom: 16px; background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:#166534; font-size:13px;">📊 EXCEL SPREADSHEET DOCUMENT</strong>
            <p style="font-size:12px; color:#15803d; margin-top:2px;">File: ${inv.filename || 'Dataset'} ${inv.fileSize ? `(${(inv.fileSize/1024).toFixed(1)} KB)` : ''}</p>
          </div>
          <button class="btn xs accent" onclick="downloadInvoiceFile('${inv.id}')">📥 Download Excel File</button>
        </div>
      </div>
    `;
  }

  // Line items rendering
  const itemsList = inv.lineItems || [];
  let lineItemsHtml = itemsList.map((item, index) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:6px 8px; text-align:center; color:#64748b; font-weight:600;">${item.lineNumber || index + 1}</td>
      <td style="padding:6px 8px; font-weight:500; color:#0f172a;">${item.description || 'N/A'}</td>
      <td style="padding:6px 8px; text-align:center;">${item.quantity || 1}</td>
      <td style="padding:6px 8px; text-align:right;">$${(item.unitPrice || 0).toFixed(2)}</td>
      <td style="padding:6px 8px; text-align:center; color:#64748b;">${item.discountPercent || 0}%</td>
      <td style="padding:6px 8px; text-align:right; font-weight:700; color:#0f172a;">$${(item.amount || item.total || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  if (itemsList.length === 0) {
    lineItemsHtml = `<tr><td colspan="6" style="text-align:center; padding:12px; color:#94a3b8;">No line items extracted.</td></tr>`;
  }

  // Validation Info
  const val = inv.validation || { status: 'VALID', errors: [], warnings: [] };
  const valBadgeColor = val.status === 'VALID' ? '#10b981' : val.status === 'WARNING' ? '#f59e0b' : '#ef4444';
  const valBadgeBg = val.status === 'VALID' ? '#ecfdf5' : val.status === 'WARNING' ? '#fffbeb' : '#fef2f2';

  // Extraction Info
  const ext = inv.extraction || { method: 'PDF_TEXT', ocrUsed: false, pageCount: 1, lineItemCount: itemsList.length };
  const fieldConf = inv.fieldConfidence || {};

  modalBody.innerHTML = `
    <div style="margin-bottom: 20px; color:#0f172a; font-family:'Plus Jakarta Sans', sans-serif;">
      ${documentPreviewHtml}

      <!-- HEADER FIELDS GRID -->
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:16px; background:#f8fafc; padding:14px; border-radius:10px; border:1px solid #e2e8f0;">
        <div>
          <span style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase;">VENDOR NAME</span>
          <div style="font-weight:700; font-size:14px; color:#0f172a;">${inv.vendor || 'N/A'}</div>
          <div style="font-size:12px; color:#64748b;">${inv.vendorEmail || 'N/A'}</div>
        </div>
        <div>
          <span style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase;">INVOICE NUMBER</span>
          <div style="font-weight:700; font-size:14px; color:#4338ca;">${inv.invoiceNumber || 'N/A'}</div>
          <div style="font-size:11px; color:#94a3b8;">System ID: ${inv.id}</div>
        </div>
        <div>
          <span style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase;">INVOICE & DUE DATE</span>
          <div style="font-weight:600; font-size:13px;">Date: ${inv.date || 'N/A'}</div>
          <div style="font-size:12px; color:#64748b;">Due: ${inv.dueDate || 'N/A'}</div>
        </div>
        <div>
          <span style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase;">PO & CURRENCY</span>
          <div style="font-weight:600; font-size:13px;">PO: <strong>${inv.poNumber || 'N/A'}</strong></div>
          <div style="font-size:12px; color:#64748b;">Currency: <strong>${inv.currency || 'USD'}</strong> ${inv.paymentTerms ? `(${inv.paymentTerms})` : ''}</div>
        </div>
      </div>

      <!-- ARITHMETIC VALIDATION CARD -->
      <div style="margin-bottom:16px; padding:12px 16px; background:${valBadgeBg}; border:1px solid ${valBadgeColor}; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="font-size:11px; font-weight:800; color:${valBadgeColor}; text-transform:uppercase; letter-spacing:0.5px;">ARITHMETIC VALIDATION RESULT</span>
          <div style="font-size:13px; font-weight:700; color:#0f172a; margin-top:2px;">
            Status: <span style="color:${valBadgeColor}; font-weight:800;">${val.status || 'VALID'}</span> 
            ${val.errors && val.errors.length > 0 ? `– ${val.errors[0]}` : '– Extracted line items and totals match invoice arithmetic.'}
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11px; color:#64748b; font-weight:700;">CONFIDENCE SCORE</span>
          <div style="font-size:20px; font-weight:800; color:${inv.confidenceScore >= 0.9 ? '#10b981' : '#f59e0b'};">
            ${((inv.confidenceScore || 0) * (inv.confidenceScore <= 1 ? 100 : 1)).toFixed(0)}%
          </div>
        </div>
      </div>

      ${inv.rejectionReason ? `
        <div style="margin-bottom:14px; padding:12px 14px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px;">
          <span style="font-size:11px; font-weight:800; color:#dc2626; text-transform:uppercase; letter-spacing:0.5px;">🚫 MONGODB STORED REJECTION REASON:</span>
          <div style="font-size:13px; color:#991b1b; font-weight:700; margin-top:3px;">"${inv.rejectionReason}"</div>
        </div>
      ` : inv.approvalReason ? `
        <div style="margin-bottom:14px; padding:12px 14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;">
          <span style="font-size:11px; font-weight:800; color:#166534; text-transform:uppercase; letter-spacing:0.5px;">✅ MONGODB STORED APPROVAL REMARK:</span>
          <div style="font-size:13px; color:#14532d; font-weight:700; margin-top:3px;">"${inv.approvalReason}"</div>
        </div>
      ` : inv.notes ? `
        <div style="margin-bottom:14px; padding:10px 14px; background:#eef2ff; border:1px solid #c7d2fe; border-radius:8px;">
          <span style="font-size:11px; font-weight:700; color:#3730a3; text-transform:uppercase;">USER REMARKS / NOTES:</span>
          <div style="font-size:13px; color:#1e1b4b; font-weight:600; margin-top:2px;">📝 "${inv.notes}"</div>
        </div>
      ` : ''}

      <!-- EXTRACTED LINE ITEMS TABLE -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin:16px 0 8px;">
        <h4 style="color:#0f172a; margin:0; font-size:15px; font-weight:700;">Extracted Line Items (${itemsList.length} items)</h4>
        <span style="font-size:12px; color:#64748b;">Table layout extracted across ${ext.pageCount || 1} page(s)</span>
      </div>

      <div style="max-height: 280px; overflow-y: auto; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:16px;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead style="position:sticky; top:0; background:#f1f5f9; color:#475569; text-transform:uppercase; font-size:10px; font-weight:700;">
            <tr>
              <th style="padding:8px; text-align:center; width:35px;">#</th>
              <th style="padding:8px; text-align:left;">Description</th>
              <th style="padding:8px; text-align:center; width:50px;">Qty</th>
              <th style="padding:8px; text-align:right; width:90px;">Unit Price</th>
              <th style="padding:8px; text-align:center; width:65px;">Discount</th>
              <th style="padding:8px; text-align:right; width:100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
      </div>

      <!-- FINANCIAL TOTALS SUMMARY -->
      <div style="padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; display:grid; grid-template-columns: 1fr 1fr; gap:16px; align-items:center;">
        <div style="font-size:12px; color:#64748b; line-height:1.6;">
          <div>Extraction Method: <strong>${ext.method || 'PDF_TEXT'}</strong> (OCR Used: <strong>${ext.ocrUsed ? 'Yes' : 'No'}</strong>)</div>
          <div>Raw Text Length: <strong>${ext.rawTextLength || (inv.rawText ? inv.rawText.length : 'N/A')} chars</strong> | Pages: <strong>${ext.pageCount || 1}</strong></div>
        </div>
        <div style="text-align:right; font-size:13px; line-height:1.8;">
          <div>Subtotal: <strong>$${(inv.subtotal || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
          <div>Sales Tax: <strong>$${(inv.tax || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
          <div>Shipping & Handling: <strong>$${(inv.shipping || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
          <div style="font-size:18px; font-weight:800; color:#059669; margin-top:4px; border-top:1px solid #cbd5e1; padding-top:4px;">
            Total Due: <strong>$${(inv.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${inv.currency || 'USD'}</strong>
          </div>
        </div>
      </div>

      <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:center;">
        <button class="btn sm ghost" onclick="inspectLogs('${inv.id}')">📜 View Audit & Engine Logs</button>
        <button class="btn sm secondary" onclick="downloadInvoiceFile('${inv.id}')">📥 Download Original PDF</button>
      </div>
    </div>
  `;

  document.getElementById('invoiceModal').classList.add('active');
}

function inspectJson(id) {
  const inv = currentInvoices.find(i => i.id === id);
  if (!inv) return;

  const modalBody = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent = `MongoDB BSON Document: ${inv.id}`;

  modalBody.innerHTML = `
    <pre style="background:#0f172a; padding:16px; border-radius:8px; font-family:'JetBrains Mono',monospace; color:#38bdf8; max-height:450px; overflow-y:auto; font-size:12px; line-height:1.5;">
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
    <pre style="background:#0f172a; padding:16px; border-radius:8px; font-family:'JetBrains Mono',monospace; color:#10b981; line-height:1.6;">
${(inv.processingLogs || []).join('\n')}
    </pre>
  `;

  document.getElementById('invoiceModal').classList.add('active');
}

function closeModal() {
  document.getElementById('invoiceModal').classList.remove('active');
}

async function triggerModelTraining() {
  const btn = document.getElementById('btnTrainModel');
  const badge = document.getElementById('modelStatusBadge');
  
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Training ML Model...';
    }
    appendLog('[MODEL_TRAINER] Initiating high-accuracy AI pattern weight calibration & corpus training...');

    const userEmail = currentUser ? currentUser.email : 'admin@invoice.com';
    const res = await fetch('/api/train', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail
      }
    });

    const data = await res.json();
    if (data.success && data.model) {
      if (badge) {
        badge.textContent = `Model v${data.model.version} Active (${(data.model.accuracyScore * 100).toFixed(1)}% Accuracy)`;
      }
      appendLog(`[MODEL_TRAINER] Retraining successful! High-Accuracy Model v${data.model.version} calibrated.`);
      alert(`AI Extraction Model retrained successfully!\n\nVersion: v${data.model.version}\nAccuracy Score: ${(data.model.accuracyScore * 100).toFixed(1)}%\nCorpus Samples: ${data.model.sampleCount}`);
    } else {
      alert(`Model training error: ${data.message || 'Server error'}`);
    }
  } catch (err) {
    console.error("Training request failed:", err);
    alert(`Model training error: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ Retrain AI Model Now';
    }
  }
}

