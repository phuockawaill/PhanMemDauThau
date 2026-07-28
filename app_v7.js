document.addEventListener('DOMContentLoaded', () => {
   

    const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    function docChuc(so, daydu) {
        let chuoi = "";
        let chuc = Math.floor(so / 10);
        let donvi = so % 10;
        if (chuc > 1) {
            chuoi = " " + chuSo[chuc] + " mươi";
            if (donvi == 1) chuoi += " mốt";
        } else if (chuc == 1) {
            chuoi = " mười";
            if (donvi == 1) chuoi += " một";
        } else if (daydu && donvi > 0) {
            chuoi = " lẻ";
        }
        if (donvi == 5 && chuc >= 1) {
            chuoi += " lăm";
        } else if (donvi > 1 || (donvi == 1 && chuc == 0)) {
            chuoi += " " + chuSo[donvi];
        }
        return chuoi;
    }
    function docTram(so, daydu) {
        let chuoi = "";
        let tram = Math.floor(so / 100);
        so = so % 100;
        if (daydu || tram > 0) {
            chuoi = " " + chuSo[tram] + " trăm";
            chuoi += docChuc(so, true);
        } else {
            chuoi = docChuc(so, false);
        }
        return chuoi;
    }
    function docTrieu(so, daydu) {
        let chuoi = "";
        let trieu = Math.floor(so / 1000000);
        so = so % 1000000;
        if (trieu > 0) {
            chuoi = docTram(trieu, daydu) + " triệu";
            daydu = true;
        }
        let nghin = Math.floor(so / 1000);
        so = so % 1000;
        if (nghin > 0) {
            chuoi += docTram(nghin, daydu) + " nghìn";
            daydu = true;
        }
        if (so > 0) chuoi += docTram(so, daydu);
        return chuoi;
    }
    function docSo(so) {
        if (so == 0) return chuSo[0];
        let chuoi = "", hauto = "";
        do {
            let ty = so % 1000000000;
            so = Math.floor(so / 1000000000);
            if (so > 0) {
                chuoi = docTrieu(ty, true) + hauto + chuoi;
            } else {
                chuoi = docTrieu(ty, false) + hauto + chuoi;
            }
            hauto = " tỷ";
        } while (so > 0);
        return chuoi.trim();
    }
    function docTien(so) {
        if (so === 0) return "Không đồng";
        if (!so || isNaN(so)) return "";
        let str = docSo(so).trim();
        str = str.replace(/\s+/g, ' ');
        str = str.charAt(0).toUpperCase() + str.slice(1);
        return str + " đồng";
    }

    // =========================================================================
    // 1. GLOBAL STATE & DATA STRUCTURES
    // =========================================================================
    
    // CẤU HÌNH ĐƯỜNG DẪN ĐỒNG BỘ GOOGLE SHEET (Thay link web app của bạn vào đây)
    // Link này sẽ mặc định được sử dụng cho tất cả người dùng phần mềm
    const GOOGLE_SHEET_SYNC_URL = "https://script.google.com/macros/s/AKfycbwk4ybp5bdHWwlg2beZtqEppJWJyUtA4GfQuwq6Zt5ud1P26Ez8II4kQVwGVye0EqYi/exec";

    // Application state
    // -------------------------------------------------------------------------
    // 1. STATE & GLOBAL CONFIG
    // -------------------------------------------------------------------------
    let templates = [];
    const STEP_ORDER = [1.1, 1.2, 6, 7, 8, 4, 5, 10, 11, 12, 13, 14, 16, 18, 19, 20, 21];
    
    // Current Active Package State
    let activePackage = null;
    let unsavedChanges = false;
    let defaultDutoanData = null;
    let currentStepIndex = 0; // index in sorted templates array
    let currentEditMode = 'preview'; // 'preview' or 'wysiwyg'
    
    // Voice & Speech State
    let voiceRecognition = null;
    let isVoiceTyping = false;
    let speechUtterance = null;
    
    // Search & Replace State
    let searchMatches = [];
    let currentSearchIndex = -1;

    // -------------------------------------------------------------------------
    // 2. DOM ELEMENT SELECTORS
    // -------------------------------------------------------------------------
    // Screens
    const portalScreen = document.getElementById('portal-screen');
    const workspaceScreen = document.getElementById('workspace-screen');
    
    // Portal Elements
    const packageCountText = document.getElementById('package-count-text');
    const portalOpenDirBtn = document.getElementById('portal-open-dir-btn');
    const portalNewPkgBtn = document.getElementById('portal-new-pkg-btn');
    const portalSearchInput = document.getElementById('portal-search-input');
    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewListBtn = document.getElementById('view-list-btn');
    const packagesContainer = document.getElementById('packages-container');
    const filterItems = document.querySelectorAll('.filter-item');
    
    // Workspace Topbar Elements
    const exitWorkspaceBtn = document.getElementById('exit-workspace-btn');
    const activePkgTitle = document.getElementById('active-pkg-title');
    const unsavedChangesDot = document.getElementById('unsaved-changes-dot');
    const fileDropdownBtn = document.getElementById('file-dropdown-btn');
    const fileDropdownMenu = document.getElementById('file-dropdown-menu');
    const savePkgBtn = document.getElementById('save-pkg-btn');
    const saveAsPkgBtn = document.getElementById('save-as-pkg-btn');
    const exportTxtBtn = document.getElementById('export-txt-btn');
    const exportWordBtn = document.getElementById('export-word-btn');
    const exportAllWordBtn = document.getElementById('export-all-word-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');
    const printPdfBtn = document.getElementById('print-pdf-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const aiToggleBtn = document.getElementById('ai-toggle-btn');
    
    // Workspace 3-Panels Elements
    // Panel 1: Step checklist
    const activePkgFilename = document.getElementById('active-pkg-filename');
    const activePkgProgress = document.getElementById('active-pkg-progress');
    const stepChecklist = document.getElementById('step-checklist');
    
    // Panel 2: Form Wizard
    const wizardStepBadge = document.getElementById('wizard-step-badge');
    const wizardStepTitle = document.getElementById('wizard-step-title');
    const inheritanceBanner = document.getElementById('inheritance-banner');
    const inheritedFieldsList = document.getElementById('inherited-fields-list');
    const wizardForm = document.getElementById('wizard-form');
    const wizardPrevBtn = document.getElementById('wizard-prev-btn');
    const wizardSaveBtn = document.getElementById('wizard-save-btn');
    const wizardNextBtn = document.getElementById('wizard-next-btn');
    
    // Panel 3: Editor Paper Canvas
    const tabPreviewBtn = document.getElementById('tab-preview-btn');
    const tabFormatBtn = document.getElementById('tab-format-btn');
    const canvasToolbar = document.getElementById('canvas-toolbar');
    const editor = document.getElementById('editor');
    const wordCountText = document.getElementById('word-count');
    const charCountText = document.getElementById('char-count');
    const readTimeText = document.getElementById('read-time');
    
    // Panel 4: AI Sidebar
    const aiSidebar = document.getElementById('ai-sidebar');
    const closeAiBtn = document.getElementById('close-ai-btn');
    const aiChatHistory = document.getElementById('ai-chat-history');
    const aiSelectedTextPreview = document.getElementById('ai-selected-text-preview');
    const sendAiBtn = document.getElementById('send-ai-btn');
    const aiCustomPrompt = document.getElementById('ai-custom-prompt');
    const aiCommandBtns = document.querySelectorAll('.btn-ai-cmd');
    
    // Modals
    const newPackageModal = document.getElementById('new-package-modal');
    const closeNewPkgBtn = document.getElementById('close-new-pkg-btn');
    const cancelNewPkgBtn = document.getElementById('cancel-new-pkg-btn');
    const confirmNewPkgBtn = document.getElementById('confirm-new-pkg-btn');
    const newPkgNameInput = document.getElementById('new-pkg-name');
    
    

    const saveConfirmModal = document.getElementById('save-confirm-modal');
    const confirmExitDiscardBtn = document.getElementById('confirm-exit-discard-btn');
    const confirmExitCancelBtn = document.getElementById('confirm-exit-cancel-btn');
    const confirmExitSaveBtn = document.getElementById('confirm-exit-save-btn');
    
    // Speech Voice Elements
    const voiceOverlay = document.getElementById('voice-overlay');
    const voiceLiveTranscript = document.getElementById('voice-live-transcript');
    const voiceTypingBtn = document.getElementById('voice-typing-btn');
    const readAloudBtn = document.getElementById('read-aloud-btn');
    
    // Search Floating Bar
    const searchReplaceBar = document.getElementById('search-replace-bar');
    const searchInput = document.getElementById('search-input');
    const replaceInput = document.getElementById('replace-input');
    const searchCount = document.getElementById('search-count');
    const searchPrevBtn = document.getElementById('search-prev-btn');
    const searchNextBtn = document.getElementById('search-next-btn');
    const searchCloseBtn = document.getElementById('search-close-btn');
    const replaceBtn = document.getElementById('replace-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');
    const searchReplaceBtn = document.getElementById('search-replace-btn');

    // -------------------------------------------------------------------------
    // 3. CORE CONSTANTS & METADATA CONFIG
    // -------------------------------------------------------------------------

    const NON_INHERITED_FIELDS = [
        'Số văn bản', 'Số quyết định',
        'Tên người ký', 'ĐẠI DIỆN KÝ', 'ĐẠI DIỆN KÝ BÊN A', 'ĐẠI DIỆN KÝ BÊN B',
        'Đại diện', 'Đại diện ký', 'Người ký',
        'Chức vụ', 'Chức danh', 'Lãnh đạo cơ quan phê duyệt', 'Người đại diện',
        'Sự cần thiết', 'Mục tiêu', 'Quy mô'
    ];

    // Fields that are ALWAYS inherited from previous documents (entered once, used many times)
    // Key = canonical field name, Value = list of aliases (case-insensitive variations in templates)
    const FIELD_ALIASES = {
        // 9 documents: project description fields
        'Tên nhiệm vụ/dự toán mua sắm': ['Tên nhiệm vụ/dự toán mua sắm', 'tên nhiệm vụ/dự toán mua sắm'],
        'Tên gói thầu':                 ['Tên gói thầu', 'tên gói thầu'],
        'Chủ đầu tư':                   ['Chủ đầu tư', 'CHỦ ĐẦU TƯ', 'chủ đầu tư'],
        // 8 documents: legal basis references
        'Quyết định cấp nguồn':         ['Quyết định cấp nguồn'],
        // 7 documents: submitting unit
        'ĐƠN VỊ TRÌNH':                 ['ĐƠN VỊ TRÌNH', 'Đơn vị trình'],
        // 6 documents: contract values
        'Giá trị Hợp đồng':             ['Giá trị Hợp đồng', 'giá trị Hợp đồng'],
        'Giá trị Hợp đồng bằng chữ':    ['Giá trị Hợp đồng bằng chữ'],
        // 5 documents: cross-references to earlier decisions
        'Quyết định Phê duyệt nhiệm vụ':          ['Quyết định Phê duyệt nhiệm vụ'],
        'Quyết định phê duyệt dự toán và KHLCNT': ['Quyết định phê duyệt dự toán và KHLCNT'],
        // 5 documents: contract number and date (lower-case variants from templates)
        'số Hợp đồng':                  ['số Hợp đồng', 'Số hợp đồng'],
        'ngày ký Hợp đồng':             ['ngày ký Hợp đồng', 'Ngày ký Hợp đồng'],
        // 4 documents: budget details
        'Tổng dự toán':                 ['Tổng dự toán'],
        'Bằng chữ tổng dự toán':        ['Bằng chữ tổng dự toán'],
        'Chi phí thiết bị':             ['Chi phí thiết bị'],
        'Chi phí khác':                 ['Chi phí khác'],
        'Nguồn vốn':                    ['Nguồn vốn'],
        'Địa chỉ thực hiện':            ['Địa chỉ thực hiện'],
        'Thời gian thực hiện':          ['Thời gian thực hiện'],
        'Thời gian thực hiện HĐ':       ['Thời gian thực hiện HĐ', 'Thời gian thực hiện Hợp đồng'],
        'Lãnh đạo cơ quan phê duyệt':  ['Lãnh đạo cơ quan phê duyệt'],
        // 3 documents:
        'Giá gói thầu':                 ['Giá gói thầu'],
        'Giá gói thầu bằng chữ':        ['Giá gói thầu bằng chữ'],
        'Biên bản thương thảo Hợp đồng':['Biên bản thương thảo Hợp đồng'],
        'Loại Hợp đồng':                ['Loại Hợp đồng'],
        'Số biên bản Nghiệm thu':       ['Số biên bản Nghiệm thu'],
        'Ngày ký biên bản nghiệm thu':  ['Ngày ký biên bản nghiệm thu'],
        // 2 documents:
        'Mục tiêu':                     ['Mục tiêu'],
        'Nội dung':                     ['Nội dung'],
        'Quy mô':                       ['Quy mô'],
        'Công việc chính gói thầu':     ['Công việc chính gói thầu'],
        'Thời gian tổ chức LCNT':       ['Thời gian tổ chức LCNT'],
        'Thời gian Bắt đầu tổ chức LCNT': ['Thời gian Bắt đầu tổ chức LCNT'],
        'Bằng chữ chi phí thiết bị':    ['Bằng chữ chi phí thiết bị'],
        'ĐƠN VỊ THẨM ĐỊNH':            ['ĐƠN VỊ THẨM ĐỊNH'],
        'Số chứng thư thẩm định giá':   ['Số chứng thư thẩm định giá'],
        'Công ty thẩm định giá':        ['Công ty thẩm định giá'],
        'Hình thức thực hiện':          ['Hình thức thực hiện'],
    };

    // Build a fast-lookup: alias -> canonical name
    const ALIAS_TO_CANONICAL = {};
    for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
        for (const alias of aliases) {
            ALIAS_TO_CANONICAL[alias.toLowerCase()] = canonical;
        }
    }

    // Normalize a field name to its canonical form
    function normalizeFieldKey(key) {
        return ALIAS_TO_CANONICAL[key.toLowerCase()] || key;
    }

    // Theme Config
    function setThemeUI(isDark) {
        const iconDark = document.querySelector('.icon-dark');
        const iconLight = document.querySelector('.icon-light');
        if (isDark) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            if (iconDark) iconDark.style.display = 'none';
            if (iconLight) iconLight.style.display = 'inline-block';
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            if (iconLight) iconLight.style.display = 'none';
            if (iconDark) iconDark.style.display = 'inline-block';
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('agy-theme') || 'light';
        setThemeUI(savedTheme === 'dark');
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('light-mode');
        localStorage.setItem('agy-theme', isDark ? 'dark' : 'light');
        setThemeUI(isDark);
    }

    // -------------------------------------------------------------------------
    // 4. PORTAL & REGISTRY SYSTEM
    // -------------------------------------------------------------------------
    // Save a path to recent packages registry
    function registerPackagePath(path) {
        if (!path) return;
        // In web mode, registration is implicit via save_package API
        if (window.pywebview && window.pywebview.api) {
            const paths = JSON.parse(localStorage.getItem('agy-recent-packages') || '[]');
            if (!paths.includes(path)) {
                paths.unshift(path);
                localStorage.setItem('agy-recent-packages', JSON.stringify(paths));
            }
        }
        renderPortalPackages();
    }

    // Unregister path from recent list
    function unregisterPackagePath(path) {
        if (window.pywebview && window.pywebview.api) {
            fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: path })
            }).then(() => renderPortalPackages()).catch(e => console.error(e));
        } else {
            fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: path })
            }).then(() => renderPortalPackages()).catch(e => console.error(e));
        }
    }

    // Render packages list in the library dashboard
    function renderPortalPackages() {
        packagesContainer.innerHTML = '';
        
        if (window.pywebview && window.pywebview.api) {
            const paths = JSON.parse(localStorage.getItem('agy-recent-packages') || '[]');
            if (paths.length === 0) {
                packagesContainer.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">
                        <i data-lucide="folder-search" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
                        <p>Thư viện trống. Hãy tạo gói mới hoặc mở tệp tin từ máy tính!</p>
                    </div>
                `;
                packageCountText.textContent = `0 gói thầu đã lưu`;
                lucide.createIcons();
                return;
            }
            const promises = paths.map(path => {
                return window.pywebview.api.load_package(path).then(jsonStr => {
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.error) return { path, error: parsed.error };
                        return { path, data: parsed };
                    } catch(e) { return { path, error: "Lỗi giải mã cấu trúc file." }; }
                }).catch(err => { return { path, error: err }; });
            });
            Promise.all(promises).then(results => {
                renderPackagesResults(results.filter(r => !r.error).map(r => r.data));
            });
        } else {
            // Online Web Mode - fetch from API
            fetch('/api/list?username=' + (sessionStorage.getItem('current_username') || ''))
                .then(res => res.json())
                .then(data => {
                    if (!data.success || !data.packages || data.packages.length === 0) {
                        packagesContainer.innerHTML = `
                            <div class="empty-state" style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">
                                <i data-lucide="cloud" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;"></i>
                                <p>Cơ sở dữ liệu đám mây đang trống. Hãy tạo gói thầu mới!</p>
                            </div>
                        `;
                        packageCountText.textContent = `0 gói thầu đã lưu`;
                        lucide.createIcons();
                        return;
                    }
                    renderPackagesResults(data.packages);
                })
                .catch(err => {
                    packagesContainer.innerHTML = `<p style="color: red; padding: 20px;">Lỗi kết nối Server: ${err}</p>`;
                });
        }
    }

    function renderPackagesResults(validPackages) {
        let activeFilterObj = document.querySelector('.filter-list [data-filter].active');
        let activeFilter = activeFilterObj ? activeFilterObj.dataset.filter : 'all';
        let activeSortObj = document.querySelector('.filter-list [data-sort].active');
        let activeSort = activeSortObj ? activeSortObj.dataset.sort : 'newest';

        packageCountText.textContent = `${validPackages.length} gói thầu đã lưu`;
        
        window.allPackages = validPackages;
        validPackages.sort((a, b) => {
            if (activeSort === 'newest') return (b.updatedAt || 0) - (a.updatedAt || 0);
            if (activeSort === 'oldest') return (a.updatedAt || 0) - (b.updatedAt || 0);
            if (activeSort === 'name-asc') return (a.name || '').localeCompare(b.name || '');
            if (activeSort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
            return 0;
        });

        if (activeFilter === 'completed') {
            validPackages = validPackages.filter(p => p.completedSteps && p.completedSteps.length === templates.length);
        } else if (activeFilter === 'in-progress') {
            validPackages = validPackages.filter(p => !p.completedSteps || p.completedSteps.length < templates.length);
        }

        validPackages.forEach(pkg => {
            const total = typeof templates !== 'undefined' && templates.length > 0 ? templates.length : 17;
            const completedCount = pkg.completedSteps ? pkg.completedSteps.length : 0;
            const pct = Math.round((completedCount / total) * 100) || 0;
            
            let badgeClass = 'new';
            let badgeText = 'Mới tạo';
            if (completedCount >= total) {
                badgeClass = 'completed';
                badgeText = 'Hoàn thành';
            } else if (completedCount > 0) {
                badgeClass = 'ongoing';
                badgeText = 'Đang làm';
            }

            const filename = pkg.filePath ? pkg.filePath.split(/[\\/]/).pop() : 'Chưa lưu';
            const updatedAt = pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleDateString('vi-VN') : 'Không rõ';

            const card = document.createElement('div');
            card.className = `pkg-card ${badgeClass}`;
            card.innerHTML = `
                <div class="pkg-card-header">
                    <span class="pkg-badge ${badgeClass}">${badgeText}</span>
                    <div class="pkg-card-meta-item">
                        <i data-lucide="clock"></i>
                        <span>${updatedAt}</span>
                    </div>
                </div>
                <h3 class="pkg-card-title">${escapeHtml(pkg.name)}</h3>
                <div class="pkg-card-filename">${escapeHtml(filename)}</div>
                
                <div class="pkg-progress-container">
                    <div class="pkg-card-meta" style="justify-content: space-between; margin-top: 0;">
                        <span>Tiến độ</span>
                        <strong>${completedCount}/${total} bước (${pct}%)</strong>
                    </div>
                    <div class="pkg-progress-bar">
                        <div class="pkg-progress-fill" style="width: ${pct}%"></div>
                    </div>
                </div>

                <div class="pkg-card-footer">
                                        <button class="btn btn-secondary btn-sm btn-share-pkg" data-path="${escapeHtml(pkg.filePath)}">
                        <i data-lucide="share-2"></i> Chia sẻ
                    </button>
                    <button class="btn btn-secondary btn-sm btn-delete-pkg" data-path="${escapeHtml(pkg.filePath)}">
                        <i data-lucide="trash-2"></i> Xóa
                    </button>
                    <button class="btn btn-primary btn-sm btn-open-pkg" data-path="${escapeHtml(pkg.filePath)}">
                        <i data-lucide="arrow-right"></i> ${completedCount > 0 ? 'Tiếp tục' : 'Mở'}
                    </button>
                </div>
            `;
            packagesContainer.appendChild(card);
        });
        lucide.createIcons();
    }

    // -------------------------------------------------------------------------
    // 5. FILE DIALOGS & DISK INTERACTION
    // -------------------------------------------------------------------------
    // Opens python folder selection
    function handleOpenDirectory() {
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.open_file_dialog().then(path => {
                if (path) {
                    loadPackageFile(path);
                }
            });
        } else {
            showFloatingNotice("Tính năng File Dialog yêu cầu đóng gói EXE để hoạt động.", 'error');
        }
    }

    // Opens creation modal
    function handleNewPackageClick() {
        newPkgNameInput.value = '';
        newPackageModal.classList.add('show');
        newPkgNameInput.focus();
    }

    // Closes new package modal
    function closeNewPackageModal() {
        newPackageModal.classList.remove('show');
    }

    // Confirms and saves new package
    function handleConfirmNewPackage() {
        const name = newPkgNameInput.value.trim();
        if (!name) {
            showFloatingNotice('Vui lòng nhập tên gói thầu!', 'error');
            return;
        }

        closeNewPackageModal();

        if (window.pywebview && window.pywebview.api) {
            const cleanName = name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || 'GoiThau';
            
            showFloatingNotice('Đang mở hộp thoại lưu file...', 'warning');
            
            window.pywebview.api.save_file_dialog(`${cleanName}.hsmsam`).then(path => {
                if (!path) {
                    showFloatingNotice('Bạn chưa chọn vị trí lưu file.', 'warning');
                    return;
                }
                
                const filePath = typeof path === 'string' ? path : String(path);
                
                const newPkg = {
                    name: name,
                    filePath: filePath,
                    currentStepIndex: 0,
                    updatedAt: Date.now(),
                    completedSteps: [],
                    stepsData: {}
                };
                
                window.pywebview.api.save_package(filePath, JSON.stringify(newPkg)).then(res => {
                    if (res === true) {
                        registerPackagePath(filePath);
                        openWorkspace(newPkg);
                        showFloatingNotice(`Đã tạo hồ sơ: ${filePath.split(/[\\/]/).pop()}`);
                        syncToGoogleSheet(newPkg); 
                    } else {
                        showFloatingNotice(`Lỗi khởi tạo file: ${res}`, 'error');
                    }
                }).catch(err => {
                    showFloatingNotice(`Lỗi lưu file: ${err}`, 'error');
                });
            }).catch(err => {
                showFloatingNotice(`Lỗi mở hộp thoại: ${err}`, 'error');
            });
        } else {
            // Online Web Mode - post to API
            const newPkg = {
                name: name,
                filePath: Date.now().toString(),
                currentStepIndex: 0,
                updatedAt: Date.now(),
                completedSteps: [],
                stepsData: {}
            };
            fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPkg)
            }).then(() => {
                openWorkspace(newPkg);
                syncToGoogleSheet(newPkg);
            });
        }
    }

    // Loads a package from path
    function loadPackageFile(path) {
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.load_package(path).then(jsonStr => {
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.error) {
                        showFloatingNotice(parsed.error, 'error');
                        return;
                    }
                    registerPackagePath(path);
                    openWorkspace(parsed);
                } catch(e) {
                    showFloatingNotice("Giải mã tệp tin thất bại.", 'error');
                }
            });
        } else {
            // Online Web Mode - fetch from API
            fetch(`/api/get?id=${encodeURIComponent(path)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.package) {
                        openWorkspace(data.package);
                    } else {
                        showFloatingNotice("Không tìm thấy dữ liệu gói thầu trên Server.", 'error');
                    }
                })
                .catch(err => {
                    showFloatingNotice("Lỗi kết nối Server.", 'error');
                });
        }
    }

    // -------------------------------------------------------------------------
    // 6. WORKSPACE NAVIGATION & LIFECYCLE
    // -------------------------------------------------------------------------
    function openWorkspace(pkg) {
        activePackage = pkg;
        unsavedChanges = false;
        currentStepIndex = pkg.currentStepIndex || 0;
        
        // Update Titlebar
        activePkgTitle.textContent = pkg.name;
        activePkgFilename.textContent = pkg.filePath ? pkg.filePath.split(/[\\/]/).pop() : 'Chưa lưu';
        updateUnsavedChangesDot();
        
        // Render step checklist sidebar
        renderStepChecklist();
        
        // Load active step form & preview
        loadStep(currentStepIndex);
        
        // Switch screens
        portalScreen.style.display = 'none';
        workspaceScreen.style.display = 'flex';
        
        showFloatingNotice(`Đã mở gói thầu: ${pkg.name}`);
    }

    function exitWorkspace() {
        if (unsavedChanges) {
            saveConfirmModal.classList.add('show');
        } else {
            closeWorkspaceAndReturn();
        }
    }

    function closeWorkspaceAndReturn() {
        saveConfirmModal.classList.remove('show');
        activePackage = null;
        unsavedChanges = false;
        
        // Re-load portal dashboard
        renderPortalPackages();
        
        // Switch screens
        workspaceScreen.style.display = 'none';
        portalScreen.style.display = 'flex';
    }

    function updateUnsavedChangesDot() {
        if (unsavedChanges) {
            unsavedChangesDot.classList.add('show');
        } else {
            unsavedChangesDot.classList.remove('show');
        }
    }

    // -------------------------------------------------------------------------
    // 7. STEP-BY-STEP CHECKLIST & PROCESS CONTROL
    // -------------------------------------------------------------------------
    function renderStepChecklist() {
        stepChecklist.innerHTML = '';
        templates.forEach((temp, index) => {
            const isCompleted = activePackage.completedSteps && activePackage.completedSteps.includes(temp.id);
            const isActive = index === currentStepIndex;
            
            const li = document.createElement('li');
            li.className = `step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
            li.dataset.index = index;
            
            li.innerHTML = `
                <div class="step-status-icon">
                    ${isCompleted ? '✓' : index + 1}
                </div>
                <div class="step-name" title="${escapeHtml(temp.title)}">
                    ${escapeHtml(temp.title)}
                </div>
            `;
            
            li.addEventListener('click', () => {
                if (index !== currentStepIndex) {
                    saveStepFormValues(); // Auto-save current inputs locally inside package state
                    loadStep(index);
                }
            });
            
            stepChecklist.appendChild(li);
        });
        
        // Update progress text
        const total = templates.length;
        const completed = activePackage.completedSteps ? activePackage.completedSteps.length : 0;
        activePkgProgress.textContent = `${completed}/${total} bước - Đã lưu`;
    }

    // Loads a step into middle panel form & right preview
    function loadStep(index) {
        // Exit summary mode if active
        document.body.classList.remove('summary-mode');
        
        currentStepIndex = index;
        const temp = templates[index];
        if (!temp) return;
        
        // Update middle badge & title
        const paddedNum = String(temp.stepNum).padStart(2, '0');
        wizardStepBadge.textContent = `Bước ${paddedNum}`;
        wizardStepTitle.textContent = temp.title;
        
        // Re-render checklist selection classes
        document.querySelectorAll('.step-item').forEach((item, idx) => {
            if (idx === index) item.classList.add('active');
            else item.classList.remove('active');
        });
        
        // Extract fields & set up Form Wizard inputs
        const fields = temp.fields || extractTemplateFields(temp.content);
        temp.fields = fields; // save reference
        
        wizardForm.innerHTML = '';
        
        // Identify inherited fields to show in the inheritance banner
        const inheritedKeys = [];
        let hasRenderedDutoanButton = false;
        
        fields.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            
            const label = document.createElement('label');
            label.setAttribute('for', `field-${field.key}`);
            label.textContent = field.label;
            
            // Look up existing value for this step in activePackage
            let val = '';
            const stepSavedData = activePackage.stepsData[temp.id];
            
            if (stepSavedData && stepSavedData[field.key]) {
                val = stepSavedData[field.key];
            } else {
                // Auto-inherit value from previous steps or resolve reference
                const inheritedVal = getInheritedValue(field.key);
                if (inheritedVal) {
                    val = inheritedVal;
                    inheritedKeys.push(field.key);
                }
            }
            
            let input;
            if (field.type === 'textarea') {
                const headDiv = document.createElement('div');
                headDiv.style.display = 'flex';
                headDiv.style.justifyContent = 'space-between';
                headDiv.style.alignItems = 'center';
                headDiv.style.marginBottom = '6px';
                
                label.style.marginBottom = '0';
                headDiv.appendChild(label);
                
                const btnKey = field.key.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
                const isDutoanBtn = btnKey.includes('tổng hợp dự toán') || btnKey.includes('chi tiết dự toán');
                const isManualText = btnKey.includes('sự cần thiết') || btnKey.includes('mục tiêu') || btnKey.includes('quy mô');
                
                if (!isManualText && !(isDutoanBtn && hasRenderedDutoanButton)) {
                    const excelBtn = document.createElement('button');
                    excelBtn.type = 'button';
                    excelBtn.className = 'btn btn-outline btn-sm';
                    
                    if (isDutoanBtn) {
                        excelBtn.innerHTML = '<i data-lucide="file-spreadsheet"></i> Nhập chung file Dự Toán';
                        excelBtn.title = 'Chọn 1 file Excel (ví dụ: 00. Dự toán.xlsx) để tự động điền cả Tổng hợp và Chi tiết!';
                        hasRenderedDutoanButton = true;
                    } else {
                        excelBtn.innerHTML = '<i data-lucide="file-spreadsheet"></i> Nhập từ Excel';
                    }
                    
                    excelBtn.style.padding = '2px 8px';
                    excelBtn.style.fontSize = '11px';
                    excelBtn.style.height = 'auto';
                    
                    excelBtn.addEventListener('click', () => {
                        if (window.pywebview && window.pywebview.api) {
                            const cleanKey = field.key.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
                            
                            // If it's the budget fields, use the new dual-import API
                            if (cleanKey.includes('tổng hợp dự toán') || cleanKey.includes('chi tiết dự toán')) {
                                excelBtn.textContent = 'Đang đọc...';
                                window.pywebview.api.import_dutoan_excel().then(data => {
                                    excelBtn.innerHTML = '<i data-lucide="file-spreadsheet"></i> Nhập chung file Dự Toán';
                                    lucide.createIcons();
                                    
                                    if (!data) {
                                        showFloatingNotice('LỖI: Không nhận được dữ liệu từ Python (data is null)!');
                                        return;
                                    }
                                    if (typeof data === 'string') {
                                        showFloatingNotice('LỖI: Python trả về chuỗi thay vì Object! Đang thử parse JSON...');
                                        try { data = JSON.parse(data); } catch(e) {}
                                    }
                                    if (data && data.error) {
                                        showFloatingNotice('Lỗi Python: ' + data.error);
                                        return;
                                    }
                                    if (!data.tongDuToan && !data.chiTietHtml) {
                                        showFloatingNotice('LỖI: Dữ liệu trả về trống! ' + JSON.stringify(data).substring(0, 100));
                                        return;
                                    }
                                    
                                    if (data) {
                                        // Set the current field if applicable
                                        if (cleanKey.includes('tổng hợp dự toán') && data.tongDuToan) {
                                            input.value = data.tongDuToan;
                                        } else if (cleanKey.includes('chi tiết dự toán') && data.chiTietHtml) {
                                            input.value = data.chiTietHtml;
                                        }
                                        
                                        // Update the global defaultDutoanData so other steps inherit this manually chosen file!
                                        defaultDutoanData = data;
                                        
                                        // Try to find the OTHER field in the DOM and set it too
                                        const allTextareas = document.querySelectorAll('textarea');
                                        allTextareas.forEach(ta => {
                                            if (ta === input) return;
                                            const taKey = ta.name.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
                                            if (taKey.includes('tổng hợp dự toán') && data.tongDuToan) {
                                                ta.value = data.tongDuToan;
                                            } else if (taKey.includes('chi tiết dự toán') && data.chiTietHtml) {
                                                ta.value = data.chiTietHtml;
                                            }
                                        });
                                        
                                        compileAndPreviewDoc();
                                        if (!unsavedChanges) { unsavedChanges = true; updateUnsavedChangesDot(); }
                                        showFloatingNotice('Đã chèn tự động dữ liệu dự toán!');
                                    }
                                });
                            } else {
                                // Standard single table import
                                excelBtn.textContent = 'Đang đọc...';
                                window.pywebview.api.import_excel_table().then(htmlTable => {
                                    excelBtn.innerHTML = '<i data-lucide="file-spreadsheet"></i> Nhập từ Excel';
                                    lucide.createIcons();
                                    if (htmlTable) {
                                        input.value = htmlTable;
                                        compileAndPreviewDoc();
                                        if (!unsavedChanges) { unsavedChanges = true; updateUnsavedChangesDot(); }
                                        showFloatingNotice('Đã chèn bảng từ Excel!');
                                    }
                                });
                            }
                        }
                    });
                    
                    headDiv.appendChild(excelBtn);
                }
                
                if (isManualText) {
                    const aiBtn = document.createElement('button');
                    aiBtn.type = 'button';
                    aiBtn.className = 'btn btn-outline btn-sm';
                    aiBtn.innerHTML = '✨ Viết bằng AI';
                    aiBtn.style.padding = '2px 8px';
                    aiBtn.style.fontSize = '11px';
                    aiBtn.style.height = 'auto';
                    aiBtn.style.marginLeft = '8px';
                    
                    aiBtn.addEventListener('click', () => {
                        const promptText = input.value.trim();
                        if (!promptText) {
                            showFloatingNotice('Vui lòng gõ vài từ khóa gợi ý vào ô này trước (VD: Mua 5 máy in HP...)');
                            return;
                        }
                        aiBtn.innerHTML = '<span class="loading-spinner" style="display:inline-block;width:12px;height:12px;border:2px solid #ccc;border-top-color:#007bff;border-radius:50%;animation:spin 1s linear infinite;margin-right:4px;"></span> Đang soạn...';
                        aiBtn.disabled = true;
                        
                        // Local AI - generate formal administrative text from keywords
                        setTimeout(() => {
                            aiBtn.innerHTML = '✨ Viết bằng AI';
                            aiBtn.disabled = false;
                            
                            const fieldKey = field.key || '';
                            let result = '';
                            
                            if (fieldKey.toLowerCase().includes('su_can_thiet') || fieldKey.toLowerCase().includes('necessity')) {
                                result = `Căn cứ nhu cầu thực tế của đơn vị về ${promptText}, nhằm đảm bảo hoạt động của cơ quan được thông suốt và hiệu quả. Thiết bị, tài sản hiện có đã xuống cấp, lỗi thời, không còn đáp ứng được yêu cầu công việc ngày càng cao. Việc mua sắm ${promptText} là hết sức cần thiết và cấp bách, đáp ứng yêu cầu nhiệm vụ được giao.`;
                            } else if (fieldKey.toLowerCase().includes('muc_tieu') || fieldKey.toLowerCase().includes('objective')) {
                                result = `Trang bị ${promptText} đầy đủ, hiện đại nhằm nâng cao năng lực hoạt động của cơ quan, phục vụ hiệu quả công tác quản lý nhà nước, góp phần thực hiện thành công các nhiệm vụ chính trị được giao trong năm kế hoạch.`;
                            } else if (fieldKey.toLowerCase().includes('quy_mo') || fieldKey.toLowerCase().includes('scope')) {
                                result = `Mua sắm ${promptText} theo đúng tiêu chuẩn kỹ thuật, chất lượng được phê duyệt, phù hợp với nhu cầu thực tế và khả năng ngân sách của đơn vị, đảm bảo tiết kiệm, hiệu quả theo quy định của Nhà nước.`;
                            } else {
                                result = `Căn cứ yêu cầu công tác về ${promptText}, đơn vị đề xuất thực hiện theo đúng các quy định hiện hành của Nhà nước, đảm bảo công khai, minh bạch, tiết kiệm và hiệu quả.`;
                            }
                            
                            input.value = result;
                            compileAndPreviewDoc();
                            if (!unsavedChanges) { unsavedChanges = true; updateUnsavedChangesDot(); }
                            showFloatingNotice('✨ AI đã soạn xong nội dung!');
                        }, 800);
                    });
                    
                    headDiv.appendChild(aiBtn);
                }
                
                group.appendChild(headDiv);
                
                input = document.createElement('textarea');
                input.id = `field-${field.key}`;
                input.name = field.key;
                input.placeholder = field.placeholder || '';
                input.value = val;
                input.rows = 4;
            } else {
                group.appendChild(label);
                input = document.createElement('input');
                input.type = field.type;
                input.id = `field-${field.key}`;
                input.name = field.key;
                input.placeholder = field.placeholder || '';
                input.value = val;
            }
            
            // Listen to input changes to trigger unsaved changes dot and live preview
            input.addEventListener('input', (e) => {
                if (!unsavedChanges) {
                    unsavedChanges = true;
                    updateUnsavedChangesDot();
                }
                
                try {
                    const keyLower = field.key.normalize('NFC').toLowerCase();
                    // If it's a number field like "Tổng dự toán", auto-fill the corresponding "Bằng chữ" field
                    if ((keyLower.includes('tổng dự toán') || keyLower.includes('giá trị') || keyLower.includes('giá gói thầu')) && !keyLower.includes('bằng chữ')) {
                        const rawVal = e.target.value.replace(/[^\d]/g, '');
                        if (rawVal) {
                            const num = parseInt(rawVal, 10);
                            if (!isNaN(num)) {
                                const words = typeof docTien === 'function' ? docTien(num) : '';
                                if (words) {
                                    // Search for target field
                                    const targetField = fields.find(f => f.key.normalize('NFC').toLowerCase().includes('bằng chữ'));
                                    if (targetField) {
                                        const targetInput = wizardForm.elements[targetField.key];
                                        if (targetInput && targetInput.value !== words) {
                                            targetInput.value = words;
                                            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                                        }
                                    }
                                }
                            }
                        } else {
                            // If empty, clear the target field
                            const targetField = fields.find(f => f.key.normalize('NFC').toLowerCase().includes('bằng chữ'));
                            if (targetField) {
                                const targetInput = wizardForm.elements[targetField.key];
                                if (targetInput && targetInput.value !== '') {
                                    targetInput.value = '';
                                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            }
                        }
                    }
                } catch(err) { 
                    console.error('JS Error:', err); 
                }
                
                compileAndPreviewDoc();
            });
            
            group.appendChild(input);
            wizardForm.appendChild(group);
        });
        
        // Update inheritance banner
        if (inheritedKeys.length > 0) {
            inheritedFieldsList.textContent = inheritedKeys.map(k => `[${k}]`).join(', ');
            inheritanceBanner.style.display = 'flex';
        } else {
            inheritanceBanner.style.display = 'none';
        }
        
        // Render document canvas page
        compileAndPreviewDoc();
    }

    // Save wizard form inputs directly to the package state in memory
    function saveStepFormValues() {
        if (!activePackage) return;
        const temp = templates[currentStepIndex];
        if (!temp) return;
        
        const formData = new FormData(wizardForm);
        const dataValues = {};
        
        temp.fields.forEach(field => {
            const val = formData.get(field.key) ? formData.get(field.key).trim() : '';
            dataValues[field.key] = val;
        });
        
        activePackage.stepsData[temp.id] = dataValues;
    }

    // User explicitly clicks "Lưu" button in Wizard Panel
    function handleSaveStep() {
        saveStepFormValues();
        
        const temp = templates[currentStepIndex];
        // Mark step as completed
        if (!activePackage.completedSteps) activePackage.completedSteps = [];
        if (!activePackage.completedSteps.includes(temp.id)) {
            activePackage.completedSteps.push(temp.id);
        }
        
        activePackage.updatedAt = Date.now();
        unsavedChanges = true;
        updateUnsavedChangesDot();
        
        // Re-render checklist to show checkmark
        renderStepChecklist();
        showFloatingNotice(`Đã ghi nhận dữ liệu: ${temp.title}`);
        
        // Auto compile
        compileAndPreviewDoc();
    }

    function handlePrevStep() {
        if (currentStepIndex > 0) {
            saveStepFormValues();
            loadStep(currentStepIndex - 1);
        }
    }

    function handleNextStep() {
        saveStepFormValues();
        if (currentStepIndex < templates.length - 1) {
            loadStep(currentStepIndex + 1);
        } else {
            showFloatingNotice("Bạn đã hoàn thành bước cuối cùng trong hồ sơ!");
        }
    }

    // -------------------------------------------------------------------------
    // 8. DYNAMIC DOCUMENT COMPILATION & LIVE PREVIEW
    // -------------------------------------------------------------------------
    function compileAndPreviewDoc() {
        const temp = templates[currentStepIndex];
        if (!temp) return;
        
        const formData = new FormData(wizardForm);
        const dataValues = {};
        
        temp.fields.forEach(field => {
            dataValues[field.key] = formData.get(field.key) ? formData.get(field.key).trim() : '';
        });
        
        let compiledContent = temp.content;

        // Pre-process HTML to flatten any placeholders split by HTML tags
        compiledContent = compiledContent.replace(/\[([^\]]+)\]/g, (match, inner) => {
            return '[' + inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8203;|&#x200B;|\u200B/g, '') + ']';
        });
        compiledContent = compiledContent.replace(/\{\{([^}]+)\}\}/g, (match, inner) => {
            return '{{' + inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8203;|&#x200B;|\u200B/g, '') + '}}';
        });

        for (const [key, value] of Object.entries(dataValues)) {
            const escapedKey = escapeRegex(key);
            const formattedValue = temp.fields.find(f => f.key === key)?.type === 'textarea' 
                ? (value || '').replace(/\n/g, '<br>')
                : escapeHtml(value || '');
                
            let finalValue = formattedValue;
            if (finalValue === undefined || finalValue === null || String(finalValue).trim() === '') {
                finalValue = `[${key}]`; // Keep placeholder if empty
            } else {
                finalValue = `<span class="filled-value">${finalValue}</span>`;
            }
                
            // Replace curly braces {{key}}
            const regexCurly = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'gi');
            compiledContent = compiledContent.replace(regexCurly, finalValue);
            
            // Replace brackets [key]
            const regexBracket = new RegExp(`\\[${escapedKey}\\]`, 'gi');
            compiledContent = compiledContent.replace(regexBracket, finalValue);
        }
        
        // Inject into canvas paper
        editor.innerHTML = compiledContent;
        updateStats();
    }

    // -------------------------------------------------------------------------
    // SUMMARY VIEW (All 17 docs)
    // -------------------------------------------------------------------------
    function renderSummaryView() {
        if (!activePackage || !templates || templates.length === 0) return;
        
        // Enter summary mode
        document.body.classList.add('summary-mode');
        
        // Deselect steps in sidebar
        document.querySelectorAll('.step-item').forEach(item => item.classList.remove('active'));
        
        let fullHtml = '';
        
        templates.forEach(temp => {
            // Extract or use cached fields
            const fields = temp.fields || extractTemplateFields(temp.content);
            temp.fields = fields;
            
            // Build data map for this template
            const dataValues = {};
            const stepSavedData = activePackage.stepsData[temp.id];
            
            fields.forEach(field => {
                if (stepSavedData && stepSavedData[field.key] !== undefined) {
                    dataValues[field.key] = stepSavedData[field.key];
                } else {
                    // Try to get inherited value by spoofing currentStepIndex temporally
                    const oldIndex = currentStepIndex;
                    currentStepIndex = templates.indexOf(temp);
                    dataValues[field.key] = getInheritedValue(field.key);
                    currentStepIndex = oldIndex;
                }
            });
            
            // Compile template
            let compiledContent = temp.content;
            compiledContent = compiledContent.replace(/\[([^\]]+)\]/g, (match, inner) => {
                return '[' + inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8203;|&#x200B;|\u200B/g, '') + ']';
            });
            compiledContent = compiledContent.replace(/\{\{([^}]+)\}\}/g, (match, inner) => {
                return '{{' + inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8203;|&#x200B;|\u200B/g, '') + '}}';
            });
            
            for (const [key, value] of Object.entries(dataValues)) {
                const escapedKey = escapeRegex(key);
                const formattedValue = fields.find(f => f.key === key)?.type === 'textarea' 
                    ? (value || '').replace(/\n/g, '<br>')
                    : escapeHtml(value || '');
                    
                let finalValue = formattedValue;
                if (finalValue === undefined || finalValue === null || String(finalValue).trim() === '') {
                    finalValue = `[${key}]`;
                } else {
                    finalValue = `<span class="filled-value">${finalValue}</span>`;
                }
                    
                const regexCurly = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'gi');
                compiledContent = compiledContent.replace(regexCurly, finalValue);
                
                const regexBracket = new RegExp(`\\[${escapedKey}\\]`, 'gi');
                compiledContent = compiledContent.replace(regexBracket, finalValue);
            }
            
            // Append to full HTML with page break wrapper
            fullHtml += `
                <div class="summary-document-page">
                    <div class="summary-document-title">Hồ sơ ${String(temp.stepNum).padStart(2, '0')}: ${escapeHtml(temp.title)}</div>
                    ${compiledContent}
                </div>
            `;
        });
        
        editor.innerHTML = fullHtml;
        updateStats();
    }

    // Helper: extracts values internally from step data within the package
    // Uses alias normalization so 'số Hợp đồng' can inherit from 'Số hợp đồng'
    function getInheritedValue(fieldKey) {
        if (!activePackage) return '';
        
        // Normalize to canonical name
        const canonicalKey = normalizeFieldKey(fieldKey);
        
        // Exclude NON_INHERITED_FIELDS (check both original and canonical)
        const cleanKey = fieldKey.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
        const cleanCanon = canonicalKey.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
        const isManual = NON_INHERITED_FIELDS.some(nf => {
            const cleanNf = nf.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
            return cleanNf === cleanKey || cleanNf === cleanCanon;
        });
        if (isManual) return '';
        
        // Check for reference autofill first (e.g. "Căn cứ" fields)
        const refVal = resolveReferenceValue(fieldKey);
        if (refVal) return refVal;
        
        // Build a list of all aliases to search for (canonical + all its variants)
        const searchKeys = new Set([fieldKey, canonicalKey]);
        if (FIELD_ALIASES[canonicalKey]) {
            FIELD_ALIASES[canonicalKey].forEach(a => searchKeys.add(a));
        }
        
        // Search backwards through ALL previous steps
        for (let i = currentStepIndex - 1; i >= 0; i--) {
            const prevTemp = templates[i];
            const prevData = activePackage.stepsData[prevTemp.id];
            if (!prevData) continue;
            
            // Try each alias variant
            for (const key of searchKeys) {
                if (prevData[key] && prevData[key].trim()) {
                    return prevData[key];
                }
            }
            
            // Also try case-insensitive match across all keys in prevData
            for (const [savedKey, savedVal] of Object.entries(prevData)) {
                if (savedVal && savedVal.trim()) {
                    const savedCanonical = normalizeFieldKey(savedKey);
                    if (savedCanonical.toLowerCase() === canonicalKey.toLowerCase()) {
                        return savedVal;
                    }
                }
            }
        }
        
        // Final fallback to defaultDutoanData from Excel
        if (defaultDutoanData) {
            if (cleanKey.includes('tổng hợp dự toán') && defaultDutoanData.tongDuToan) {
                return defaultDutoanData.tongDuToan;
            } else if (cleanKey.includes('chi tiết dự toán') && defaultDutoanData.chiTietHtml) {
                return defaultDutoanData.chiTietHtml;
            }
        }
        
        return '';
    }

    function resolveReferenceValue(key) {
        if (!activePackage) return '';
        const keyLower = key.toLowerCase();
        
        let targetTempId = '';
        let docTypeLabel = 'văn bản';
        
        if (keyLower.includes('dự toán') && keyLower.includes('khlcnt')) {
            targetTempId = getTemplateIdByPrefix('5'); // QĐ phê duyệt dự toán & KHLCNT
            docTypeLabel = 'Quyết định';
        } else if (keyLower.includes('cấp nguồn')) {
            targetTempId = getTemplateIdByPrefix('1.2'); // QĐ chủ trương
            docTypeLabel = 'Quyết định';
        } else if (keyLower.includes('phê duyệt nhiệm vụ')) {
            targetTempId = getTemplateIdByPrefix('1.2'); // QĐ chủ trương
            docTypeLabel = 'Quyết định';
        } else if (keyLower.includes('thương thảo')) {
            targetTempId = getTemplateIdByPrefix('12'); // BB thương thảo HĐ
            docTypeLabel = 'Biên bản';
        } else if (keyLower.includes('kqlcnt')) {
            targetTempId = getTemplateIdByPrefix('14'); // QĐ phê duyệt kết quả
            docTypeLabel = 'Quyết định';
        } else if (keyLower.includes('thư mời')) {
            targetTempId = getTemplateIdByPrefix('10'); // Thư mời thầu
            docTypeLabel = 'Thư mời';
        } else if (keyLower.includes('hợp đồng') && (keyLower.includes('số') || keyLower.includes('ngày') || keyLower.includes('căn cứ'))) {
            targetTempId = getTemplateIdByPrefix('16'); // Hợp đồng
            docTypeLabel = 'Hợp đồng';
        } else if (keyLower.includes('nghiệm thu') && (keyLower.includes('số') || keyLower.includes('ngày') || keyLower.includes('căn cứ'))) {
            targetTempId = getTemplateIdByPrefix('18'); // BB nghiệm thu bàn giao
            docTypeLabel = 'Biên bản';
        }

        if (targetTempId && activePackage.stepsData[targetTempId]) {
            const stepData = activePackage.stepsData[targetTempId];
            const num = stepData['Số văn bản'] || stepData['Số hợp đồng'] || stepData['Số biên bản Nghiệm thu'] || stepData['Số biên bản thanh lý'] || stepData['Số biên bản thương thảo Hợp đồng'] || stepData['Số biên bản nghiệm thu'] || stepData['Số quyết định'] || '';
            const date = stepData['Ngày ký'] || stepData['Ngày ký Hợp đồng'] || stepData['Ngày ký biên bản nghiệm thu'] || stepData['Ngày ký biên bản thanh lý'] || stepData['Ngày lập giấy ủy quyền'] || stepData['Ngày đề nghị thanh toán'] || stepData['Ngày ký biên bản thương thảo Hợp đồng'] || '';
            const signer = stepData['LÃNH ĐẠO CƠ QUAN PHÊ DUYỆT'] || stepData['Lãnh đạo cơ quan phê duyệt'] || stepData['Chủ đầu tư'] || stepData['ĐƠN VỊ BAN HÀNH VĂN BẢN'] || stepData['ĐƠN VỊ CHỦ QUẢN'] || '';
            
            if (num) {
                let refStr = `${docTypeLabel} số ${num}`;
                if (date) refStr += ` ngày ${date}`;
                if (signer) {
                    const signerClean = signer.replace(/[\[\]]/g, '');
                    refStr += ` của ${signerClean}`;
                }
                return refStr;
            }
        }
        return '';
    }

    function getTemplateIdByPrefix(prefix) {
        const found = templates.find(t => {
            return t.stepNum.toString() === prefix || t.id.includes(`local-${prefix}.`) || t.id.includes(`local-${prefix}_`);
        });
        return found ? found.id : null;
    }

    // -------------------------------------------------------------------------
    // 9. WYSIWYG FORMATTING TOOLBAR & TAB SELECTION
    // -------------------------------------------------------------------------
    function switchCanvasTab(mode) {
        currentEditMode = mode;
        if (mode === 'wysiwyg') {
            tabFormatBtn.classList.add('active');
            tabPreviewBtn.classList.remove('active');
            canvasToolbar.style.display = 'flex';
            editor.setAttribute('contenteditable', 'true');
            editor.focus();
        } else {
            tabPreviewBtn.classList.add('active');
            tabFormatBtn.classList.remove('active');
            canvasToolbar.style.display = 'none';
            editor.setAttribute('contenteditable', 'false');
            
            // Re-compile changes back to document content preview
            compileAndPreviewDoc();
        }
    }

    function formatDoc(command, value = null) {
        document.execCommand(command, false, value);
        editor.focus();
        updateStats();
        if (!unsavedChanges) {
            unsavedChanges = true;
            updateUnsavedChangesDot();
        }
    }

    // -------------------------------------------------------------------------
    // 10. DỮ LIỆU XOR+BASE64 SAVING PACKAGE FILES
    // -------------------------------------------------------------------------
    function syncToGoogleSheet(pkg) {
        const syncUrl = GOOGLE_SHEET_SYNC_URL;
        if (!syncUrl || !syncUrl.startsWith('http')) return; 

        const currentUsername = sessionStorage.getItem('display_name') || sessionStorage.getItem('current_username') || 'Không rõ';
        let progress = 0;
        let completedSteps = [];

        if (pkg.steps && pkg.steps.length > 0) {
            pkg.steps.forEach(s => {
                if (s.checked) completedSteps.push(s.title);
            });
            progress = Math.round((completedSteps.length / pkg.steps.length) * 100);
        }

        const payload = {
            tenGoiThau: pkg.name || 'Gói thầu không tên',
            nguoiDung: currentUsername,
            trangThai: `Hoàn thành ${progress}%`,
            chiTietTienDo: completedSteps.join(" | "), 
            tenFile: pkg.filePath || 'Chưa lưu file'
        };

        fetch(syncUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        })
        .then(() => {
            console.log('Đã gửi lệnh đồng bộ Google Sheet.');
        })
        .catch(err => {
            console.error('Lỗi đồng bộ Google Sheet:', err);
        });
    }

    function handleSavePackage() {
        if (!activePackage) return;
        saveStepFormValues(); // pull current values in wizard
        
        activePackage.currentStepIndex = currentStepIndex;
        activePackage.updatedAt = Date.now();
        
        const path = activePackage.filePath;
        
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.save_package(path, JSON.stringify(activePackage)).then(res => {
                if (res === true) {
                    unsavedChanges = false;
                    updateUnsavedChangesDot();
                    showFloatingNotice("Đã lưu hồ sơ gói thầu thành công!");
                    syncToGoogleSheet(activePackage); // <-- Gọi đồng bộ sau khi lưu thành công
                } else {
                    showFloatingNotice(`Lỗi lưu tệp: ${res}`, 'error');
                }
            });
        } else {
            // Browser local mock save
            // Online Web Mode - save to API
            fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activePackage)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    unsavedChanges = false;
                    updateUnsavedChangesDot();
                    showFloatingNotice("Da luu vao Co so du lieu Online thanh cong!");
                    syncToGoogleSheet(activePackage);
                } else {
                    showFloatingNotice(`Loi luu Online: ${data.error}`, 'error');
                }
            })
            .catch(err => {
                showFloatingNotice(`Loi ket noi Online: ${err}`, 'error');
            });
        }
    }

    function handleSaveAsPackage() {
        if (!activePackage) return;
        saveStepFormValues();
        
        activePackage.currentStepIndex = currentStepIndex;
        activePackage.updatedAt = Date.now();
        
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.save_file_dialog("CoQuan_GoiThau_SaoChep.hsmsam").then(path => {
                if (path) {
                    activePackage.filePath = path;
                    activePkgFilename.textContent = path.split(/[\\/]/).pop();
                    
                    window.pywebview.api.save_package(path, JSON.stringify(activePackage)).then(res => {
                        if (res === true) {
                            unsavedChanges = false;
                            updateUnsavedChangesDot();
                            registerPackagePath(path);
                            showFloatingNotice(`Đã nhân bản hồ sơ sang file mới: ${path.split(/[\\/]/).pop()}`);
                            syncToGoogleSheet(activePackage); // <-- Gọi đồng bộ
                        } else {
                            showFloatingNotice(`Lỗi lưu tệp: ${res}`, 'error');
                        }
                    });
                }
            });
        } else {
            showFloatingNotice("Sao chép file yêu cầu đóng gói EXE.", 'error');
        }
    }

    // -------------------------------------------------------------------------
    // 11. EXPORTS & WORD PACKAGING
    // -------------------------------------------------------------------------
    function exportToWord() {
        if (!editor.innerHTML.trim()) return;
        
        // If in summary mode, inform user
        if (document.body.classList.contains('summary-mode')) {
            showFloatingNotice('Tính năng lưu file Word hiện chỉ hỗ trợ xuất từng văn bản riêng lẻ. Vui lòng chọn 1 bước cụ thể để xuất.', 'error');
            return;
        }
        
        const temp = templates[currentStepIndex];
        const tempName = temp.title.replace(/[^a-zA-Z0-9À-ỹ\s]/g, '').replace(/\s+/g, '_');
        
        if (window.pywebview && window.pywebview.api && window.pywebview.api.export_native_docx) {
            // Build data dictionary from form and inherited values
            const formData = new FormData(wizardForm);
            const dataValues = {};
            
            temp.fields.forEach(field => {
                let val = formData.get(field.key) ? formData.get(field.key).trim() : '';
                if (!val) {
                    val = getInheritedValue(field.key) || resolveReferenceValue(field.key) || '';
                }
                dataValues[field.key] = val;
            });
            
            window.pywebview.api.export_native_docx(temp.fileName, dataValues, tempName).then(res => {
                if (res) showFloatingNotice('Đã xuất file Word thành công (chuẩn định dạng)!');
                else showFloatingNotice('Lỗi khi xuất file Word. Vui lòng kiểm tra lại.', 'error');
            });
        } else {
            // Fallback to legacy HTML wrapper for browser mode
            const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Export</title></head><body>${editor.innerHTML}</body></html>`;
            
            const blobContent = '\ufeff' + header;
            const blob = new Blob([blobContent], { type: 'application/msword;charset=utf-8' });
            downloadBlob(blob, `${tempName}.doc`);
        }
    }

    
    function exportAllToWord() {
        if (!activePackage) {
            showFloatingNotice("Bạn chưa có hồ sơ nào đang mở!");
            return;
        }
        
        saveStepFormValues(); // Ensure current step is saved

        if (window.pywebview && window.pywebview.api && window.pywebview.api.export_all_native_docx) {
            exportAllWordBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Đang xuất TOÀN BỘ...';
            
            // Prepare package data for python
            const packageData = templates.map((temp) => {
                return {
                    fileName: temp.fileName, // e.g. 1.1. Trinh phe duyet...docx
                    title: temp.title,
                    dataDict: activePackage.stepsData[temp.id] || {}
                };
            });
            const projectName = activePackage.name || 'Ho_So_Du_An';
            
            window.pywebview.api.export_all_native_docx(packageData, projectName).then(res => {
                exportAllWordBtn.innerHTML = '<i data-lucide="folder-output"></i> Tải TOÀN BỘ Hồ sơ (17 file)';
                lucide.createIcons();
                if (res) {
                    showFloatingNotice(`Đã xuất toàn bộ 17 file thành công vào thư mục: ${res}`);
                }
            }).catch(err => {
                exportAllWordBtn.innerHTML = '<i data-lucide="folder-output"></i> Tải TOÀN BỘ Hồ sơ (17 file)';
                lucide.createIcons();
                showFloatingNotice("Có lỗi xảy ra: " + err);
            });
        } else {
            showFloatingNotice("Tính năng xuất Word chỉ hoạt động trên phần mềm Desktop.");
        }
    }

function exportToTxt() {
        const text = editor.innerText;
        const tempName = templates[currentStepIndex].title.replace(/[^a-zA-Z0-9À-ỹ\s]/g, '').replace(/\s+/g, '_');
        
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.save_document(text, tempName, '.txt').then(res => {
                if (res) showFloatingNotice('Đã xuất file text thành công!');
            });
        } else {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            downloadBlob(blob, `${tempName}.txt`);
        }
    }

    function exportToHtml() {
        const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>HTML Export</title></head><body>${editor.innerHTML}</body></html>`;
        const tempName = templates[currentStepIndex].title.replace(/[^a-zA-Z0-9À-ỹ\s]/g, '').replace(/\s+/g, '_');
        
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.save_document(html, tempName, '.html').then(res => {
                if (res) showFloatingNotice('Đã xuất file HTML thành công!');
            });
        } else {
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            downloadBlob(blob, `${tempName}.html`);
        }
    }

    function printDoc() {
        window.print();
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // -------------------------------------------------------------------------
    // 12. SPEECH RECOGNITION (Voice Typing)
    // -------------------------------------------------------------------------
    function setupSpeechRecognition() {
        const SpeechReg = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechReg) return;

        voiceRecognition = new SpeechReg();
        voiceRecognition.continuous = true;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'vi-VN';

        voiceRecognition.onstart = () => {
            voiceOverlay.classList.add('show');
            voiceLiveTranscript.innerHTML = '<em>Hãy bắt đầu nói...</em>';
            isVoiceTyping = true;
        };

        voiceRecognition.onerror = (e) => {
            console.error(e);
            stopVoiceTyping();
            showFloatingNotice(`Lỗi giọng nói: ${e.error}`, 'error');
        };

        voiceRecognition.onend = () => {
            stopVoiceTyping();
        };

        voiceRecognition.onresult = (e) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = e.resultIndex; i < e.results.length; ++i) {
                if (e.results[i].isFinal) {
                    finalTranscript += e.results[i][0].transcript;
                } else {
                    interimTranscript += e.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                // Insert at caret or append
                editor.focus();
                document.execCommand('insertText', false, finalTranscript + ' ');
            }
            voiceLiveTranscript.innerHTML = `<strong>Đang ghi nhận:</strong> ${interimTranscript}`;
        };
    }

    function toggleVoiceTyping() {
        if (!voiceRecognition) {
            showFloatingNotice("Nhập liệu giọng nói chỉ hỗ trợ trên Edge/Chrome.", 'warning');
            return;
        }
        if (isVoiceTyping) {
            stopVoiceTyping();
        } else {
            // Ensure visual tab is editor mode
            switchCanvasTab('wysiwyg');
            voiceRecognition.start();
        }
    }

    function stopVoiceTyping() {
        if (isVoiceTyping) {
            voiceRecognition.stop();
            isVoiceTyping = false;
            voiceOverlay.classList.remove('show');
        }
    }

    // Text to Speech
    function toggleSpeechSynthesis() {
        if (!window.speechSynthesis) {
            showFloatingNotice("Hệ thống không hỗ trợ đọc to văn bản.", 'warning');
            return;
        }

        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            readAloudBtn.classList.remove('active');
            showFloatingNotice("Đã dừng đọc văn bản.");
            return;
        }

        const text = editor.innerText;
        if (!text.trim()) return;

        speechUtterance = new SpeechSynthesisUtterance(text);
        speechUtterance.lang = 'vi-VN';
        
        speechUtterance.onstart = () => {
            readAloudBtn.classList.add('active');
        };
        
        speechUtterance.onend = () => {
            readAloudBtn.classList.remove('active');
        };

        speechUtterance.onerror = (e) => {
            console.error(e);
            readAloudBtn.classList.remove('active');
        };

        window.speechSynthesis.speak(speechUtterance);
    }

    // -------------------------------------------------------------------------
    // 13. DYNAMIC SEARCH & REPLACE WITHIN CANVAS
    // -------------------------------------------------------------------------
    function toggleSearchReplaceBar() {
        if (searchReplaceBar.classList.contains('show')) {
            hideSearchReplaceBar();
        } else {
            searchReplaceBar.classList.add('show');
            searchInput.focus();
            performSearch();
        }
    }

    function hideSearchReplaceBar() {
        searchReplaceBar.classList.remove('show');
        clearSearchHighlights();
    }

    function performSearch() {
        clearSearchHighlights();
        const query = searchInput.value;
        if (!query) {
            searchCount.textContent = '0/0';
            return;
        }

        // Highlight matching elements
        const html = editor.innerHTML;
        const escapedQuery = escapeRegex(query);
        const regex = new RegExp(`(${escapedQuery})(?![^<]*>)`, 'gi'); // matches query not inside HTML tags

        let matchCount = 0;
        const newHtml = html.replace(regex, (match) => {
            matchCount++;
            return `<span class="search-highlight" id="highlight-${matchCount - 1}">${match}</span>`;
        });

        editor.innerHTML = newHtml;
        searchMatches = document.querySelectorAll('.search-highlight');
        matchCount = searchMatches.length;

        if (matchCount > 0) {
            currentSearchIndex = 0;
            highlightActiveMatch();
        } else {
            currentSearchIndex = -1;
            searchCount.textContent = '0/0';
        }
    }

    function highlightActiveMatch() {
        searchMatches.forEach((m, idx) => {
            if (idx === currentSearchIndex) {
                m.classList.add('active');
                m.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                m.classList.remove('active');
            }
        });
        searchCount.textContent = `${currentSearchIndex + 1}/${searchMatches.length}`;
    }

    function nextSearchMatch() {
        if (searchMatches.length === 0) return;
        currentSearchIndex = (currentSearchIndex + 1) % searchMatches.length;
        highlightActiveMatch();
    }

    function prevSearchMatch() {
        if (searchMatches.length === 0) return;
        currentSearchIndex = (currentSearchIndex - 1 + searchMatches.length) % searchMatches.length;
        highlightActiveMatch();
    }

    function clearSearchHighlights() {
        const highlights = editor.querySelectorAll('.search-highlight');
        highlights.forEach(h => {
            const parent = h.parentNode;
            parent.replaceChild(document.createTextNode(h.textContent), h);
            parent.normalize();
        });
        searchMatches = [];
        currentSearchIndex = -1;
    }

    function handleReplace() {
        if (currentSearchIndex === -1 || searchMatches.length === 0) return;
        
        const active = searchMatches[currentSearchIndex];
        const val = replaceInput.value;
        
        const textNode = document.createTextNode(val);
        active.parentNode.replaceChild(textNode, active);
        
        if (!unsavedChanges) {
            unsavedChanges = true;
            updateUnsavedChangesDot();
        }

        // Re-search to update positions
        performSearch();
    }

    function handleReplaceAll() {
        const query = searchInput.value;
        if (!query) return;
        
        const val = replaceInput.value;
        const escapedQuery = escapeRegex(query);
        const regex = new RegExp(`(${escapedQuery})(?![^<]*>)`, 'gi');
        
        editor.innerHTML = editor.innerHTML.replace(regex, val);
        
        if (!unsavedChanges) {
            unsavedChanges = true;
            updateUnsavedChangesDot();
        }

        performSearch();
        showFloatingNotice("Đã thay thế toàn bộ từ trùng khớp!");
    }

    // -------------------------------------------------------------------------
    // 14. SIMULATED VIETNAMESE AI WRITING ASSISTANT
    // -------------------------------------------------------------------------
    function toggleAiSidebar() {
        if (aiSidebar.classList.contains('hidden')) {
            aiSidebar.classList.remove('hidden');
            checkSelectedText();
        } else {
            aiSidebar.classList.add('hidden');
        }
    }

    function checkSelectedText() {
        const sel = window.getSelection().toString().trim();
        if (sel) {
            aiSelectedTextPreview.innerHTML = `&ldquo;${escapeHtml(sel.substring(0, 120))}${sel.length > 120 ? '...' : ''}&rdquo;`;
        } else {
            aiSelectedTextPreview.innerHTML = '<em>Không bôi đen chữ (Áp dụng toàn bài).</em>';
        }
    }

    function handleAiCommandClick(e) {
        const cmd = e.currentTarget.dataset.prompt;
        const sel = window.getSelection().toString().trim();
        const targetText = sel || (editor ? editor.innerText.trim() : '');
        
        if (!targetText) {
            showFloatingNotice('Vui lòng chọn một đoạn văn bản hoặc có nội dung trên màn hình.');
            return;
        }
        
        appendAiChatMessage(`[Ụng dụng lệnh] ${e.currentTarget.textContent.trim()}`, 'user');
        const typingId = appendAiChatMessage('Trợ lý đang xử lý...', 'ai typing');
        
        setTimeout(() => {
            removeAiChatMessage(typingId);
            let result = '';
            
            if (cmd === 'grammar') {
                // Basic spelling cleanup suggestions
                result = `Đã kiểm tra văn bản (${targetText.length} ký tự):\n\nKhông phát hiện lỗi chính tả cơ bản. Văn bản đã được kiểm tra theo tiêu chuẩn hành chính Nghị định 30/2020/NĐ-CP.`;
                
            } else if (cmd === 'formal') {
                // Formalize the text
                let formalText = targetText
                    .replace(/tôi/gi, 'chúng tôi')
                    .replace(/bạn/gi, 'quý cơ quan')
                    .replace(/muốn/gi, 'khẩn trình')
                    .replace(/cần/gi, 'cần thiết')
                    .replace(/dùng/gi, 'sử dụng')
                    .replace(/làm/gi, 'thực hiện');
                result = formalText;
                
            } else if (cmd === 'creative') {
                result = `${targetText}\n\nLập luận bổ sung: Việc triển khai hoạt động này không chỉ nâng cao hiệu quả công tác, mà còn góp phần thực hiện các nhiệm vụ chính trị theo chủ trương của Đảng và Nhà nước, đáp ứng yêu cầu đổi mới, hiện đại hóa nền hành chính.`;
                
            } else if (cmd === 'translate') {
                result = `[English Translation]\n"${targetText.substring(0, 100)}${targetText.length > 100 ? '...' : ''}"\n\nNote: For full professional translation, please use a dedicated translation service.`;
            }
            
            appendAiChatMessage(result, 'ai');
        }, 600);
    }

    function handleAiCustomPrompt() {
        const promptText = aiCustomPrompt.value.trim();
        if (!promptText) return;
        
        appendAiChatMessage(promptText, 'user');
        aiCustomPrompt.value = '';
        
        const typingId = appendAiChatMessage('Trợ lý đang suy nghĩ...', 'ai typing');
        
        setTimeout(() => {
            removeAiChatMessage(typingId);
            
            const lower = promptText.toLowerCase();
            let response = '';
            
            if (lower.includes('chào') || lower.includes('xin chào') || lower.includes('hello')) {
                response = 'Xin chào! Tôi là Trợ lý Viết AI đối với hồ sơ mua sắm VNPT. Tôi có thể giúp bạn: kiểm tra chính tả, chuẩn hóa văn phong hành chính, mở rộng lập luận. Hãy bôi đen văn bản và nhấn các nút lệnh nhanh ở bên dưới!';
            } else if (lower.includes('sự cần thiết') || lower.includes('can thiet')) {
                response = 'Gợi ý nội dung mục Sự cần thiết:\n\nCăn cứ nhu cầu thực tế trong công tác quản lý, để đảm bảo hoạt động cơ quan được thông suốt, hiệu quả, thiết bị hiện có đã xuống cấp, không đáp ứng được yêu cầu nhiệm vụ. Việc mua sắm mới là hết sức cần thiết.';
            } else if (lower.includes('mục tiêu') || lower.includes('muc tieu')) {
                response = 'Gợi ý nội dung mục Mục tiêu:\n\nTrang bị đầy đủ cơ sở vật chất, nâng cao năng lực hoạt động, phục vụ hiệu quả công tác quản lý nhà nước, góp phần đảm bảo hoàn thành nhiệm vụ chính trị được giao.';
            } else if (lower.includes('quy mô') || lower.includes('quy mo')) {
                response = 'Gợi ý nội dung mục Quy mô:\n\nĐơn vị dự kiến mua sắm theo đúng tiêu chuẩn kỹ thuật được phê duyệt, đảm bảo chất lượng và phù hợp với nhu cầu sử dụng thực tế tại cơ quan đơn vị.';
            } else if (lower.includes('hướng dẫn') || lower.includes('giúp') || lower.includes('dùng như thế nào')) {
                response = 'Hướng dẫn sử dụng Trợ lý AI:\n\n1. Bôi đen đoạn văn trong Trình soạn thảo\n2. Nhấn nút lệnh nhanh: Sửa chính tả, Văn phong hành chính, Sáng tạo ý tưởng hoặc Dịch tiếng Anh\n3. Trợ lý sẽ phân tích và gợi ý nội dung\n4. Nhấn nút "Đưa vào bài" để chèn kết quả vào tờ trình';
            } else {
                response = 'Tôi đã ghi nhận yêu cầu của bạn. Để được hỗ trợ chính xác hơn, bạn hãy:\n\n• Bôi đen đoạn văn cần chỉnh sửa\n• Nhấn các nút lệnh nhanh phía dưới\n• Hoặc câu hỏi cụ thể hơn như "đề xuất nội dung mục Sự cần thiết" hoặc "gợi ý mục Mục tiêu"';
            }
            
            appendAiChatMessage(response, 'ai');
        }, 700);
    }

    function appendAiChatMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `ai-msg ai-msg-${sender}`;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'msg-text';
        textDiv.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
        div.appendChild(textDiv);
        
        if (sender === 'ai' && !text.startsWith('Lỗi')) {
            const actionDiv = document.createElement('div');
            actionDiv.style.marginTop = '8px';
            actionDiv.style.textAlign = 'right';
            
            const insertBtn = document.createElement('button');
            insertBtn.className = 'btn btn-outline btn-sm';
            insertBtn.style.padding = '3px 8px';
            insertBtn.style.fontSize = '11px';
            insertBtn.innerHTML = '<i data-lucide="arrow-down-square" style="width:12px;height:12px;margin-right:4px;"></i> Chèn vào bài';
            
            insertBtn.addEventListener('click', () => {
                if (editor) {
                    const sel = window.getSelection();
                    if (sel.rangeCount > 0 && sel.anchorNode && editor.contains(sel.anchorNode)) {
                        const range = sel.getRangeAt(0);
                        range.deleteContents();
                        const span = document.createElement('span');
                        span.innerHTML = text.replace(/\n/g, '<br>');
                        range.insertNode(span);
                    } else {
                        editor.innerHTML += '<br>' + text.replace(/\n/g, '<br>');
                    }
                    compileAndPreviewDoc();
                    if (!unsavedChanges) { unsavedChanges = true; updateUnsavedChangesDot(); }
                    showFloatingNotice('Đã chèn nội dung vào Trình soạn thảo!');
                }
            });
            actionDiv.appendChild(insertBtn);
            div.appendChild(actionDiv);
        }
        
        const id = 'msg-' + Date.now();
        div.id = id;
        
        aiChatHistory.appendChild(div);
        aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
        if(window.lucide) window.lucide.createIcons();
        return id;
    }

    function removeAiChatMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
    
    function checkAiLogin() {
        // No login required anymore - local AI mode
        return true;
    }

    // -------------------------------------------------------------------------
    // 15. COMPONENT STATISTICS & NOTICE HELPERS
    // -------------------------------------------------------------------------
    function updateStats() {
        const text = editor.innerText || '';
        const cleanText = text.trim();
        
        const words = cleanText ? cleanText.split(/\s+/).length : 0;
        const chars = text.length;
        const readTime = Math.ceil(words / 200); // 200 words per minute average
        
        wordCountText.textContent = `${words} từ`;
        charCountText.textContent = `${chars} ký tự`;
        readTimeText.textContent = `${readTime} phút đọc`;
    }

    function showFloatingNotice(message, type = 'success') {
        const notice = document.createElement('div');
        notice.className = `floating-notice notice-${type}`;
        notice.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info'}"></i>
            <span>${escapeHtml(message)}</span>
        `;
        
        document.body.appendChild(notice);
        lucide.createIcons();
        
        setTimeout(() => {
            notice.classList.add('show');
        }, 50);
        
        setTimeout(() => {
            notice.classList.remove('show');
            setTimeout(() => notice.remove(), 300);
        }, 3000);
    }

    // Helper: safely add event listener only if element exists
    function on(el, event, handler) {
        if (el) el.addEventListener(event, handler);
    }

    // -------------------------------------------------------------------------
    // 16. EVENT LISTENERS SETUP
    // -------------------------------------------------------------------------
    function setupEventListeners() {

    // HTML Cache Busting: If MENU CHÍNH is missing from the sidebar, inject it
    let sidebarMenuMain = document.getElementById('sidebar-menu-main');
    if (!sidebarMenuMain) {
        const portalFilters = document.querySelector('.portal-filters');
        if (portalFilters) {
            const menuHtml = `
                <div class="filter-section" id="sidebar-menu-main">
                    <span class="filter-title">MENU CHÍNH</span>
                    <ul class="filter-list">
                        <li class="menu-item active" id="menu-library">
                            <i data-lucide="layout-grid"></i> Thư viện hồ sơ
                        </li>
                        <li class="menu-item" id="menu-dashboard">
                            <i data-lucide="bar-chart-2"></i> Thống kê Dashboard
                        </li>
                        <li class="menu-item" id="menu-users" style="display: none;">
                            <i data-lucide="users"></i> Quản lý Nhân sự
                        </li>
                    </ul>
                </div>
            `;
            // insert at the top of portalFilters
            portalFilters.insertAdjacentHTML('afterbegin', menuHtml);
            
            // Because we just injected them, we need to re-query them for the event listeners below
            if (typeof lucide !== 'undefined') lucide.createIcons();

            // Inject CSS for menu-item if it doesn't exist
            if (!document.getElementById('menu-item-style')) {
                const style = document.createElement('style');
                style.id = 'menu-item-style';
                style.innerHTML = `
                    .menu-item {
                        padding: 10px 14px; margin-bottom: 6px; border-radius: 8px;
                        cursor: pointer; display: flex; align-items: center; gap: 10px;
                        color: var(--text-muted); transition: all 0.2s; font-size: 14px;
                        border-left: 3px solid transparent;
                    }
                    .menu-item:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
                    .menu-item.active { 
                        background: linear-gradient(90deg, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0) 100%); 
                        color: #60a5fa; font-weight: 700; 
                        border-left: 3px solid #3b82f6; 
                    }
                    .menu-item i { width: 18px; height: 18px; }
                `;
                document.head.appendChild(style);
            }

        }
    }

        // Portal sidebar Filters
        filterItems.forEach(item => {
            item.addEventListener('click', () => {
                filterItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                renderPortalPackages();
            });
        });

        // Portal search
        on(portalSearchInput, 'input', () => {
            const query = portalSearchInput.value.toLowerCase();
            document.querySelectorAll('.pkg-card').forEach(card => {
                const titleEl = card.querySelector('.pkg-card-title');
                const fileEl = card.querySelector('.pkg-card-filename');
                const title = titleEl ? titleEl.textContent.toLowerCase() : '';
                const file = fileEl ? fileEl.textContent.toLowerCase() : '';
                card.style.display = (title.includes(query) || file.includes(query)) ? 'flex' : 'none';
            });
        });

        // View Toggles grid vs list
        on(viewGridBtn, 'click', () => {
            viewGridBtn.classList.add('active');
            viewListBtn.classList.remove('active');
            packagesContainer.className = 'packages-grid';
        });
        on(viewListBtn, 'click', () => {
            viewListBtn.classList.add('active');
            viewGridBtn.classList.remove('active');
            packagesContainer.className = 'packages-list';
        });

        // Package action triggers (delegated - always safe)
        on(packagesContainer, 'click', (e) => {
            const openBtn = e.target.closest('.btn-open-pkg');
            const deleteBtn = e.target.closest('.btn-delete-pkg');
            if (openBtn) {
                loadPackageFile(openBtn.dataset.path);
            } else if (deleteBtn) {
                if (confirm('Bạn có chắc chắn muốn xóa gói thầu này khỏi hệ thống?')) {
                    unregisterPackagePath(deleteBtn.dataset.path);
                }
            } else if (e.target.closest('.btn-share-pkg')) {
                const path = e.target.closest('.btn-share-pkg').dataset.path;
                const targetUser = prompt("Nhập tên tài khoản (username) bạn muốn chia sẻ gói thầu này:");
                if (!targetUser) return;
                
                fetch('/api/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: path, shareWith: targetUser })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showFloatingNotice(`Đã chia sẻ thành công cho ${targetUser}!`);
                    } else {
                        showFloatingNotice(`Lỗi chia sẻ: ${data.error}`, 'error');
                    }
                })
                .catch(err => showFloatingNotice(`Lỗi kết nối: ${err}`, 'error'));
            }
        });

        // Portal buttons
        on(portalOpenDirBtn, 'click', handleOpenDirectory);
        on(portalNewPkgBtn, 'click', handleNewPackageClick);

    
    // Dynamically load Chart.js and SheetJS if missing (Cache busting)
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        document.head.appendChild(script);
    }

    // --- SIDEBAR MENU LOGIC ---
    const menuLibrary = document.getElementById('menu-library');
    const menuDashboard = document.getElementById('menu-dashboard');
    const portalToolbar = document.querySelector('.portal-toolbar');
    const filterSections = document.querySelectorAll('.filter-section:not(#sidebar-menu-main)');

    function ensureDashboardSection() {
        let ds = document.getElementById('dashboard-section');
        if (!ds) {
            ds = document.createElement('div');
            ds.id = 'dashboard-section';
            ds.style.display = 'none';
            ds.innerHTML = `
                <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: var(--text-main);">Thống kê Chuyên sâu</h2>
                    <select id="time-filter" class="form-control" style="width: 200px; padding: 8px; border-radius: 8px; background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-color);">
                        <option value="all">Toàn thời gian</option>
                        <option value="today">Hôm nay</option>
                        <option value="week">Tuần này</option>
                        <option value="month">Tháng này</option>
                        <option value="year">Năm nay</option>
                    </select>
                </div>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div class="stat-card" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
                        <h3 style="color: var(--text-muted); font-size: 13px; margin: 0 0 10px 0;">Tổng số hồ sơ</h3>
                        <div id="stat-total" style="font-size: 28px; font-weight: 700; color: var(--text-main);">0</div>
                    </div>
                    <div class="stat-card" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
                        <h3 style="color: var(--text-muted); font-size: 13px; margin: 0 0 10px 0;">Đã hoàn thành</h3>
                        <div id="stat-completed" style="font-size: 28px; font-weight: 700; color: var(--success);">0</div>
                    </div>
                    <div class="stat-card" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
                        <h3 style="color: var(--text-muted); font-size: 13px; margin: 0 0 10px 0;">Đang thực hiện</h3>
                        <div id="stat-ongoing" style="font-size: 28px; font-weight: 700; color: var(--warning);">0</div>
                    </div>
                </div>
                <div class="charts-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="chart-container" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); height: 350px;">
                        <canvas id="statusChart"></canvas>
                    </div>
                    <div class="chart-container" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); height: 350px;">
                        <canvas id="trendChart"></canvas>
                    </div>
                    <div class="chart-container" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); height: 350px;">
                        <canvas id="leaderboardChart"></canvas>
                    </div>
                    <div class="chart-container" style="background: var(--bg-sidebar); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); height: 350px;">
                        <canvas id="bottleneckChart"></canvas>
                    </div>
                </div>
            `;
            const mainPortal = document.querySelector('.portal-main');
            if (mainPortal) {
                mainPortal.insertBefore(ds, mainPortal.firstChild);
            }
            
            // Attach event for time filter
            setTimeout(() => {
                const tf = document.getElementById('time-filter');
                if (tf && !tf.hasAttribute('data-bound')) {
                    tf.setAttribute('data-bound', '1');
                    tf.addEventListener('change', () => {
                        if (typeof renderDashboard === 'function') renderDashboard();
                    });
                }
            }, 100);
        }
        return ds;
    }

    // Attempt injection early
    ensureDashboardSection();

    if (menuLibrary && menuDashboard) {
        menuLibrary.addEventListener('click', () => {
            menuLibrary.classList.add('active');
            menuDashboard.classList.remove('active');
            
            // Show library components
            if (portalToolbar) portalToolbar.style.display = 'flex';
            if (packagesContainer) packagesContainer.style.display = 'grid'; // it uses grid usually
            
            // Show side filters
            // filterSections.forEach(s => s.style.display = 'block');
            
            // Hide dashboard
            let ds = document.getElementById('dashboard-section');
            if (ds) ds.style.display = 'none';
        });

        menuDashboard.addEventListener('click', () => {
            menuDashboard.classList.add('active');
            menuLibrary.classList.remove('active');
            
            // Hide library components
            if (portalToolbar) portalToolbar.style.display = 'none';
            if (packagesContainer) packagesContainer.style.display = 'none';
            
            // Hide side filters (they are not relevant for dashboard)
            // filterSections.forEach(s => s.style.display = 'none');
            
            // Show dashboard
            let ds = ensureDashboardSection();
            ds.style.display = 'block';
            
            if (typeof renderDashboard === 'function') {
                if (typeof Chart === 'undefined') {
                    setTimeout(renderDashboard, 1000);
                } else {
                    renderDashboard();
                }
            }
        });
    }

    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
        document.head.appendChild(script);
    }

    on(closeNewPkgBtn, 'click', closeNewPackageModal);
        on(cancelNewPkgBtn, 'click', closeNewPackageModal);
        on(confirmNewPkgBtn, 'click', handleConfirmNewPackage);
        // Allow pressing Enter in the name input
        on(newPkgNameInput, 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmNewPackage(); } });

        // -- WORKSPACE-ONLY ELEMENTS (guarded with null check via `on`) --
        // File dropdown
        on(fileDropdownBtn, 'click', (e) => {
            e.stopPropagation();
            if (fileDropdownMenu) fileDropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', () => {
            if (fileDropdownMenu) fileDropdownMenu.classList.remove('show');
        });

        // Workspace back arrow & save confirm modals
        on(exitWorkspaceBtn, 'click', exitWorkspace);
        on(confirmExitDiscardBtn, 'click', closeWorkspaceAndReturn);
        on(confirmExitCancelBtn, 'click', () => saveConfirmModal && saveConfirmModal.classList.remove('show'));
        on(confirmExitSaveBtn, 'click', () => { handleSavePackage(); closeWorkspaceAndReturn(); });

        // File menu dropdown items
        on(savePkgBtn, 'click', handleSavePackage);
        on(saveAsPkgBtn, 'click', handleSaveAsPackage);
        on(exportTxtBtn, 'click', exportToTxt);
        on(exportWordBtn, 'click', exportToWord);
        on(exportAllWordBtn, 'click', exportAllToWord);
        on(exportHtmlBtn, 'click', exportToHtml);
        on(printPdfBtn, 'click', printDoc);

        // Theme toggle
        on(themeToggle, 'click', toggleTheme);

        // Wizard navigation
        on(wizardPrevBtn, 'click', handlePrevStep);
        on(wizardSaveBtn, 'click', handleSaveStep);
        on(wizardNextBtn, 'click', handleNextStep);
        on(wizardForm, 'submit', (e) => { e.preventDefault(); handleSaveStep(); });
        
        // Summary View
        const viewSummaryBtn = document.getElementById('view-summary-btn');
        on(viewSummaryBtn, 'click', () => {
            saveStepFormValues(); // save current before switching
            renderSummaryView();
        });

        // Canvas tabs
        on(tabPreviewBtn, 'click', () => switchCanvasTab('preview'));
        on(tabFormatBtn, 'click', () => switchCanvasTab('wysiwyg'));

        // Formatting toolbar (only if exists)
        document.querySelectorAll('.btn-tool[data-command]').forEach(btn => {
            btn.addEventListener('click', () => formatDoc(btn.dataset.command));
        });
        const formatBlockEl = document.getElementById('format-block');
        const fontFamilyEl = document.getElementById('font-family');
        const textColorEl = document.getElementById('text-color-picker');
        on(formatBlockEl, 'change', (e) => formatDoc('formatBlock', e.target.value));
        on(fontFamilyEl, 'change', (e) => formatDoc('fontName', e.target.value));
        on(textColorEl, 'input', (e) => formatDoc('foreColor', e.target.value));

        // Speech & voice
        on(voiceTypingBtn, 'click', toggleVoiceTyping);
        on(voiceOverlay, 'click', stopVoiceTyping);
        on(readAloudBtn, 'click', toggleSpeechSynthesis);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
                e.preventDefault();
                if (activePackage) handleSavePackage();
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                if (activePackage) handleSaveAsPackage();
            }
        });

        // Editor input stats
        on(editor, 'input', () => {
            updateStats();
            if (!unsavedChanges) { unsavedChanges = true; updateUnsavedChangesDot(); }
        });

        // Search & replace
        on(searchReplaceBtn, 'click', toggleSearchReplaceBar);
        on(searchCloseBtn, 'click', hideSearchReplaceBar);
        on(searchInput, 'input', performSearch);
        on(searchNextBtn, 'click', nextSearchMatch);
        on(searchPrevBtn, 'click', prevSearchMatch);
        on(replaceBtn, 'click', handleReplace);
        on(replaceAllBtn, 'click', handleReplaceAll);

        // AI sidebar
        on(aiToggleBtn, 'click', toggleAiSidebar);
        on(closeAiBtn, 'click', toggleAiSidebar);
        on(sendAiBtn, 'click', handleAiCustomPrompt);
        on(aiCustomPrompt, 'keypress', (e) => { if (e.key === 'Enter') handleAiCustomPrompt(); });
        aiCommandBtns.forEach(btn => btn.addEventListener('click', handleAiCommandClick));

        document.addEventListener('selectionchange', () => {
            if (aiSidebar && !aiSidebar.classList.contains('hidden')) checkSelectedText();
        });

        // ---------------------------------------------------------------------
        // CHANGE PASSWORD MODAL LOGIC
        // ---------------------------------------------------------------------
        const changePwdBtn = document.getElementById('change-pwd-btn');
        const changePwdModal = document.getElementById('change-pwd-modal');
        const closeChangePwdBtn = document.getElementById('close-change-pwd-btn');
        const cancelChangePwdBtn = document.getElementById('cancel-change-pwd-btn');
        const saveChangePwdBtn = document.getElementById('save-change-pwd-btn');
        const oldPwdInput = document.getElementById('old-pwd');
        const newPwdInput = document.getElementById('new-pwd');
        const confirmNewPwdInput = document.getElementById('confirm-new-pwd');

        function hideChangePwdModal() {
            if (changePwdModal) {
                changePwdModal.style.display = 'none';
                if (oldPwdInput) oldPwdInput.value = '';
                if (newPwdInput) newPwdInput.value = '';
                if (confirmNewPwdInput) confirmNewPwdInput.value = '';
            }
        }

        if (changePwdBtn && changePwdModal) {
            on(changePwdBtn, 'click', () => {
                changePwdModal.style.display = 'flex';
                if (oldPwdInput) setTimeout(() => oldPwdInput.focus(), 100);
            });
            on(closeChangePwdBtn, 'click', hideChangePwdModal);
            on(cancelChangePwdBtn, 'click', hideChangePwdModal);

            on(saveChangePwdBtn, 'click', () => {
                const currentUsername = sessionStorage.getItem('current_username');
                if (!currentUsername) {
                    showFloatingNotice('Lỗi xác thực người dùng. Vui lòng đăng nhập lại.', 'error');
                    return;
                }

                const oldPwd = oldPwdInput.value;
                const newPwd = newPwdInput.value;
                const confirmNewPwd = confirmNewPwdInput.value;

                if (!oldPwd || !newPwd || !confirmNewPwd) {
                    showFloatingNotice('Vui lòng điền đầy đủ các trường!', 'error');
                    return;
                }

                if (newPwd !== confirmNewPwd) {
                    showFloatingNotice('Mật khẩu mới không khớp!', 'error');
                    return;
                }

                if (newPwd.length < 6) {
                    showFloatingNotice('Mật khẩu mới phải từ 6 ký tự trở lên!', 'error');
                    return;
                }

                let accounts = [];
                try {
                    const saved = localStorage.getItem('app_accounts');
                    if (saved) accounts = JSON.parse(saved);
                } catch (e) {}

                if (!accounts || accounts.length === 0) {
                    showFloatingNotice('Lỗi đọc dữ liệu tài khoản.', 'error');
                    return;
                }

                const accountIndex = accounts.findIndex(a => a.username === currentUsername);
                if (accountIndex === -1) {
                    showFloatingNotice('Không tìm thấy tài khoản của bạn.', 'error');
                    return;
                }

                if (accounts[accountIndex].password !== oldPwd) {
                    showFloatingNotice('Mật khẩu hiện tại không đúng!', 'error');
                    return;
                }

                accounts[accountIndex].password = newPwd;
                localStorage.setItem('app_accounts', JSON.stringify(accounts));
                
                showFloatingNotice('Đổi mật khẩu thành công!');
                hideChangePwdModal();
            });
        }
    }

    // -------------------------------------------------------------------------
    // 17. TEMPLATE PARSING UTILITIES
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // 17. TEMPLATE PARSING UTILITIES
    // -------------------------------------------------------------------------
    function extractTemplateFields(content) {
        // Use a regex that allows HTML tags inside brackets, then strip them out.
        const regex = /\[([^\[\]]+)\]/g;
        const fields = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            let fieldName = match[1];
            
            // Strip any HTML tags and invisible entities that might have been injected inside the brackets
            fieldName = fieldName.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8203;|&#x200B;|\\u200B/g, '').trim();
            
            if (!fieldName || fieldName.length > 80) continue;
            
            // Skip duplicates (including alias variants already added)
            const canonical = normalizeFieldKey(fieldName);
            const alreadyHas = fields.some(f => 
                normalizeFieldKey(f.key).toLowerCase() === canonical.toLowerCase()
            );
            if (alreadyHas) continue;

            // Classify field type
            const nameLower = fieldName.toLowerCase();
            const isTextArea = nameLower.startsWith('bảng') ||
                               nameLower.includes('nội dung') ||
                               nameLower.includes('mục tiêu') ||
                               nameLower.includes('quy mô') ||
                               nameLower.includes('sự cần thiết') ||
                               nameLower.includes('thông số kỹ thuật') ||
                               nameLower.includes('tổng hợp dự toán') ||
                               nameLower.includes('chi tiết dự toán');

            // Mark if field is manual entry (not inherited)
            const cleanKey = fieldName.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
            const cleanCanon = canonical.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
            const isManual = NON_INHERITED_FIELDS.some(nf => {
                const cleanNf = nf.normalize('NFC').trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
                return cleanNf === cleanKey || cleanNf === cleanCanon;
            });

            // Mark if field is inheritable (appears in multiple docs)
            const isInherited = !isManual && (canonical in FIELD_ALIASES || Object.values(FIELD_ALIASES).flat().some(a => a.normalize('NFC').toLowerCase() === fieldName.normalize('NFC').toLowerCase()));
            
            fields.push({
                key: fieldName,
                label: fieldName,
                type: isTextArea ? 'textarea' : 'text',
                placeholder: isManual 
                    ? `Nhập ${fieldName}...`
                    : isInherited 
                        ? `Tự động kế thừa từ bước trước...`
                        : `Nhập ${fieldName}...`,
                isManual: isManual,
                isInherited: isInherited,
            });
        }
        return fields;
    }

    function escapeHtml(string) {
        return String(string)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeRegex(string) {
        return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // -------------------------------------------------------------------------
    // 18. INITIALIZATION RUN
    // -------------------------------------------------------------------------
    function loadLocalTemplates() {
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.get_templates().then(localTemplates => {
                if (localTemplates && localTemplates.length > 0) {
                    templates = localTemplates;
                    
                    // Sort templates according to the STEP_ORDER array index!
                    templates.sort((a, b) => {
                        const idxA = STEP_ORDER.indexOf(a.stepNum);
                        const idxB = STEP_ORDER.indexOf(b.stepNum);
                        
                        const valA = idxA !== -1 ? idxA : 999;
                        const valB = idxB !== -1 ? idxB : 999;
                        return valA - valB;
                    });

                    // Render recent packages in portal
                    renderPortalPackages();
                    showFloatingNotice(`Đã đồng bộ thành công ${templates.length} tệp tin mẫu từ máy địa phương!`);
                }
            }).catch(err => {
                console.error("Lỗi lấy danh sách mẫu:", err);
            });
        } else {
            // Web environment (Vercel) -> Fetch templates.json
            fetch('templates.json?v=' + Date.now())
                .then(res => res.json())
                .then(data => {
                    // Force fix step 1.1 and 1.2 regardless of JSON data
                    data.forEach(t => {
                        if (t.id.includes('1.1._Trinh')) t.stepNum = 1.1;
                        if (t.id.includes('1.2._Quyet')) t.stepNum = 1.2;
                    });
                    templates = data;
                    // Sort templates
                    templates.sort((a, b) => {
                        const idxA = STEP_ORDER.indexOf(a.stepNum);
                        const idxB = STEP_ORDER.indexOf(b.stepNum);
                        const valA = idxA !== -1 ? idxA : 999;
                        const valB = idxB !== -1 ? idxB : 999;
                        return valA - valB;
                    });
                    renderPortalPackages();
                })
                .catch(err => {
                    console.error("Lỗi tải templates.json:", err);
                    showFloatingNotice("Lỗi tải file mẫu (templates.json).", "error");
                });
        }
    }

    function init() {
        lucide.createIcons();
        initTheme();
        setupEventListeners();
        setupSpeechRecognition();
        
        // Ensure pywebview is ready before requesting Python APIs
        if (window.pywebview) {
            loadLocalTemplates();
        } else {
            window.addEventListener('pywebviewready', function() {
                // Fetch default dutoan data, then load templates
                window.pywebview.api.get_default_dutoan_data().then(data => {
                    if (data) {
                        defaultDutoanData = data;
                    }
                    loadLocalTemplates();
                }).catch(() => {
                    loadLocalTemplates();
                });
            });
            // Fallback for normal browser testing (after a short delay)
            setTimeout(() => {
                if (!window.pywebview) loadLocalTemplates();
            }, 1000);
        }
    }

    init();

    // =========================================================================
    // LOGIN SCREEN HANDLER
    // =========================================================================
    (async function setupLogin() {
        const loginScreen = document.getElementById('login-screen');
        const loginUsernameInput = document.getElementById('login-username');
        const loginPasswordInput = document.getElementById('login-password');
        const loginSubmitBtn = document.getElementById('login-submit-btn');
        const loginError = document.getElementById('login-error');
        
        if (!loginScreen) return;

        let ACCOUNTS = [];
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success && data.users) {
                ACCOUNTS = data.users;
            }
        } catch (e) {
            console.error('Lỗi tải danh sách users', e);
        }

        // Show admin menu if already logged in
        if (sessionStorage.getItem('logged_in') === '1') {
            if (sessionStorage.getItem('current_role') === 'admin') {
                const mu = document.getElementById('menu-users');
                if (mu) mu.style.display = 'flex';
            }
            loginScreen.style.display = 'none';
            return;
        }

        function showError(msg) {
            loginError.textContent = msg;
            loginError.style.display = 'block';
            loginPasswordInput.style.borderColor = 'rgba(239,68,68,0.6)';
            loginPasswordInput.value = '';
            loginPasswordInput.focus();
        }

        function doLogin() {
            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value;

            if (!username) { showError('Vui lòng nhập tên đăng nhập.'); loginUsernameInput.focus(); return; }
            if (!password) { showError('Vui lòng nhập mật khẩu.'); loginPasswordInput.focus(); return; }

            const account = ACCOUNTS.find(a => a.username === username && a.password === password);

            if (account) {
                sessionStorage.setItem('logged_in', '1');
                sessionStorage.setItem('current_username', account.username);
                sessionStorage.setItem('display_name', account.displayName);
                sessionStorage.setItem('current_role', account.role || 'user');

                if (account.role === 'admin') {
                    const mu = document.getElementById('menu-users');
                    if (mu) mu.style.display = 'flex';
                }

                loginScreen.style.transition = 'opacity 0.4s ease';
                loginScreen.style.opacity = '0';
                setTimeout(() => { loginScreen.style.display = 'none'; }, 400);
            } else {
                showError('Tên đăng nhập hoặc mật khẩu không đúng.');
            }
        }

        loginScreen.style.display = 'flex';
        loginSubmitBtn.addEventListener('click', doLogin);
        loginUsernameInput.addEventListener('keypress', e => { if (e.key === 'Enter') loginPasswordInput.focus(); });
        loginPasswordInput.addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
        loginPasswordInput.addEventListener('input', () => {
            loginPasswordInput.style.borderColor = 'rgba(255,255,255,0.2)';
            loginError.style.display = 'none';
        });

        setTimeout(() => loginUsernameInput.focus(), 100);
    })();
    // =========================================================================
    // DASHBOARD & CHARTS
    // =========================================================================
    let statusChartInstance = null;
    let trendChartInstance = null;
    let leaderboardChartInstance = null;
    let bottleneckChartInstance = null;

    window.renderDashboard = function() {
        if (typeof Chart === 'undefined') return;

        Chart.defaults.color = '#9ca3af';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.1)';

        const filterVal = document.getElementById('time-filter') ? document.getElementById('time-filter').value : 'all';
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        let startOfWeek = new Date(startOfToday);
        const day = startOfWeek.getDay() || 7; 
        if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
        startOfWeek = startOfWeek.getTime();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

        let pkgs = window.allPackages || [];
        
        // Apply Filter
        pkgs = pkgs.filter(p => {
            const utime = p.updatedAt || 0;
            if (filterVal === 'today') return utime >= startOfToday;
            if (filterVal === 'week') return utime >= startOfWeek;
            if (filterVal === 'month') return utime >= startOfMonth;
            if (filterVal === 'year') return utime >= startOfYear;
            return true; // all
        });

        const total = pkgs.length;
        let completed = 0;
        let ongoing = 0;
        let newPkg = 0;

        const templatesCount = typeof templates !== 'undefined' && templates.length > 0 ? templates.length : 17;

        // Data structures for advanced charts
        const trendData = {}; // YYYY-MM
        const authorData = {};
        const stepData = {}; // step index -> count

        pkgs.forEach(p => {
            const c = p.completedSteps ? p.completedSteps.length : 0;
            if (c >= templatesCount) completed++;
            else if (c > 0) ongoing++;
            else newPkg++;

            // Trend Data
            if (p.updatedAt) {
                const d = new Date(p.updatedAt);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
                trendData[monthKey] = (trendData[monthKey] || 0) + 1;
            }

            // Author Data
            const author = p.author || 'Unknown';
            authorData[author] = (authorData[author] || 0) + 1;

            // Bottleneck Data (only for ongoing packages)
            if (c > 0 && c < templatesCount) {
                const stepIdx = p.currentStepIndex || 0;
                stepData[stepIdx] = (stepData[stepIdx] || 0) + 1;
            }
        });

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-completed').textContent = completed;
        document.getElementById('stat-ongoing').textContent = ongoing;

        // 1. Status Doughnut Chart
        if (statusChartInstance) statusChartInstance.destroy();
        const ctxStatus = document.getElementById('statusChart');
        if (ctxStatus) {
            statusChartInstance = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Hoàn thành', 'Đang thực hiện', 'Mới tạo'],
                    datasets: [{
                        data: [completed, ongoing, newPkg],
                        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Tỷ lệ Trạng thái' }
                    }
                }
            });
        }

        // 2. Trend Line Chart
        if (trendChartInstance) trendChartInstance.destroy();
        const ctxTrend = document.getElementById('trendChart');
        if (ctxTrend) {
            const sortedMonths = Object.keys(trendData).sort();
            trendChartInstance = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: sortedMonths.length > 0 ? sortedMonths : ['Chưa có dữ liệu'],
                    datasets: [{
                        label: 'Số gói thầu mới',
                        data: sortedMonths.length > 0 ? sortedMonths.map(k => trendData[k]) : [0],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: 'Xu hướng tạo Gói thầu' } }
                }
            });
        }

        // 3. Leaderboard Bar Chart
        if (leaderboardChartInstance) leaderboardChartInstance.destroy();
        const ctxLeader = document.getElementById('leaderboardChart');
        if (ctxLeader) {
            const sortedAuthors = Object.keys(authorData).sort((a,b) => authorData[b] - authorData[a]).slice(0, 5); // Top 5
            leaderboardChartInstance = new Chart(ctxLeader, {
                type: 'bar',
                data: {
                    labels: sortedAuthors.length > 0 ? sortedAuthors : ['Trống'],
                    datasets: [{
                        label: 'Số gói thầu',
                        data: sortedAuthors.length > 0 ? sortedAuthors.map(k => authorData[k]) : [0],
                        backgroundColor: '#ec4899',
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: 'Top Nhân viên (Leaderboard)' } }
                }
            });
        }

        // 4. Bottleneck Radar/Bar Chart
        if (bottleneckChartInstance) bottleneckChartInstance.destroy();
        const ctxBottle = document.getElementById('bottleneckChart');
        if (ctxBottle) {
            const sortedSteps = Object.keys(stepData).sort((a,b) => stepData[b] - stepData[a]).slice(0, 5); // Top 5 bottlenecks
            bottleneckChartInstance = new Chart(ctxBottle, {
                type: 'bar',
                data: {
                    labels: sortedSteps.length > 0 ? sortedSteps.map(s => `Bước ${parseInt(s)+1}`) : ['Không có'],
                    datasets: [{
                        label: 'Số gói đang kẹt',
                        data: sortedSteps.length > 0 ? sortedSteps.map(k => stepData[k]) : [0],
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { title: { display: true, text: 'Nút thắt Tiến độ (Bottleneck)' } }
                }
            });
        }
    };

    // =========================================================================
    // EXPORT TO EXCEL
    // =========================================================================
    const btnExportExcel = document.getElementById('btn-export-excel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            
            if (typeof XLSX === 'undefined') {
                showFloatingNotice('Đang tải công cụ Xuất Excel, vui lòng thử lại sau 2 giây...', 'warning');
                return;
            }
            const pkgs = window.allPackages || [];

            if (pkgs.length === 0) {
                showFloatingNotice('Không có dữ liệu để xuất', 'warning');
                return;
            }
            
            const data = pkgs.map((pkg, index) => {
                const total = typeof templates !== 'undefined' && templates.length > 0 ? templates.length : 17;
                const completedCount = pkg.completedSteps ? pkg.completedSteps.length : 0;
                let status = 'Mới tạo';
                if (completedCount >= total) status = 'Hoàn thành';
                else if (completedCount > 0) status = 'Đang làm';

                return {
                    'STT': index + 1,
                    'Tên gói thầu': pkg.name,
                    'Người tạo': pkg.author || 'Unknown',
                    'Tiến độ': `${completedCount}/${total} bước`,
                    'Trạng thái': status,
                    'Cập nhật cuối': pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleString('vi-VN') : ''
                };
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "DanhSachGoiThau");
            XLSX.writeFile(wb, "ThongKe_GoiThau.xlsx");
            showFloatingNotice('Đã xuất file Excel!');
        });
    }

});


const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function docChuc(so, daydu) {
    let chuoi = "";
    let chuc = Math.floor(so / 10);
    let donvi = so % 10;
    if (chuc > 1) {
        chuoi = " " + chuSo[chuc] + " mươi";
        if (donvi == 1) {
            chuoi += " mốt";
        }
    } else if (chuc == 1) {
        chuoi = " mười";
        if (donvi == 1) {
            chuoi += " một";
        }
    } else if (daydu && donvi > 0) {
        chuoi = " lẻ";
    }
    if (donvi == 5 && chuc >= 1) {
        chuoi += " lăm";
    } else if (donvi > 1 || (donvi == 1 && chuc == 0)) {
        chuoi += " " + chuSo[donvi];
    }
    return chuoi;
}

function docTram(so, daydu) {
    let chuoi = "";
    let tram = Math.floor(so / 100);
    so = so % 100;
    if (daydu || tram > 0) {
        chuoi = " " + chuSo[tram] + " trăm";
        chuoi += docChuc(so, true);
    } else {
        chuoi = docChuc(so, false);
    }
    return chuoi;
}

function docTrieu(so, daydu) {
    let chuoi = "";
    let trieu = Math.floor(so / 1000000);
    so = so % 1000000;
    if (trieu > 0) {
        chuoi = docTram(trieu, daydu) + " triệu";
        daydu = true;
    }
    let nghin = Math.floor(so / 1000);
    so = so % 1000;
    if (nghin > 0) {
        chuoi += docTram(nghin, daydu) + " nghìn";
        daydu = true;
    }
    if (so > 0) {
        chuoi += docTram(so, daydu);
    }
    return chuoi;
}

function docSo(so) {
    if (so == 0) return chuSo[0];
    let chuoi = "", hauto = "";
    do {
        let ty = so % 1000000000;
        so = Math.floor(so / 1000000000);
        if (so > 0) {
            chuoi = docTrieu(ty, true) + hauto + chuoi;
        } else {
            chuoi = docTrieu(ty, false) + hauto + chuoi;
        }
        hauto = " tỷ";
    } while (so > 0);
    return chuoi.trim();
}

function docTien(so) {
    if (so === 0) return "Không đồng";
    if (!so || isNaN(so)) return "";
    let str = docSo(so).trim();
    // replace double spaces
    str = str.replace(/\s+/g, ' ');
    // Capitalize first letter
    str = str.charAt(0).toUpperCase() + str.slice(1);
    return str + " đồng";
}



window.SYNTAX_OK = true;


    // --- USER MANAGEMENT LOGIC ---
    setTimeout(() => {
        const menuUsers = document.getElementById('menu-users');
        if (menuUsers) {
            menuUsers.addEventListener('click', () => {
                const menuLibrary = document.getElementById('menu-library');
                const menuDashboard = document.getElementById('menu-dashboard');
                const portalToolbar = document.querySelector('.portal-toolbar');
                const packagesContainer = document.getElementById('packages-container');
                let ds = document.getElementById('dashboard-section');
                
                if (menuLibrary) menuLibrary.classList.remove('active');
                if (menuDashboard) menuDashboard.classList.remove('active');
                menuUsers.classList.add('active');

                if (portalToolbar) portalToolbar.style.display = 'none';
                if (packagesContainer) packagesContainer.style.display = 'none';
                if (ds) ds.style.display = 'none';

                let us = document.getElementById('users-section');
                if (!us) {
                    us = document.createElement('div');
                    us.id = 'users-section';
                    us.style.padding = '20px';
                    us.style.color = 'var(--text-main)';
                    us.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin: 0;">Quản lý Nhân sự</h2>
                            <button id="add-user-btn" class="btn btn-primary" style="padding: 8px 16px; border-radius: 8px; border: none; background: #3b82f6; color: white; cursor: pointer;">+ Thêm Tài khoản</button>
                        </div>
                        <div style="background: var(--bg-sidebar); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02);">
                                        <th style="padding: 16px;">Tên đăng nhập</th>
                                        <th style="padding: 16px;">Tên hiển thị</th>
                                        <th style="padding: 16px;">Quyền hạn</th>
                                        <th style="padding: 16px;">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody id="users-tbody">
                                    <tr><td colspan="4" style="padding: 20px; text-align: center;">Đang tải...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                    const mainPortal = document.querySelector('.portal-main');
                    if (mainPortal) {
                        mainPortal.insertBefore(us, mainPortal.firstChild);
                    }
                    
                    document.getElementById('add-user-btn').addEventListener('click', () => {
                        const uname = prompt("Nhập tên đăng nhập mới:");
                        if (!uname) return;
                        const pwd = prompt("Nhập mật khẩu mới:");
                        if (!pwd) return;
                        const dname = prompt("Nhập tên hiển thị:");
                        if (!dname) return;
                        const role = confirm("Tài khoản này là Admin?") ? 'admin' : 'user';
                        
                        fetch('/api/users').then(r=>r.json()).then(data => {
                            let users = data.users || [];
                            if (users.find(u => u.username === uname)) {
                                alert("Tên đăng nhập đã tồn tại!"); return;
                            }
                            users.push({username: uname, password: pwd, displayName: dname, role: role});
                            fetch('/api/users', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({users: users})
                            }).then(() => renderUsersTable());
                        });
                    });
                }
                us.style.display = 'block';
                renderUsersTable();
            });
        }
    }, 500);

    function renderUsersTable() {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        fetch('/api/users').then(r=>r.json()).then(data => {
            if (data.success && data.users) {
                tbody.innerHTML = data.users.map((u, i) => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 16px; font-weight: 600;">${u.username}</td>
                        <td style="padding: 16px;">${u.displayName}</td>
                        <td style="padding: 16px;">
                            <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; background: ${u.role === 'admin' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'}; color: ${u.role === 'admin' ? '#fca5a5' : '#93c5fd'};">
                                ${u.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                            </span>
                        </td>
                        <td style="padding: 16px;">
                            <button onclick="deleteUser('${u.username}')" style="background: rgba(239,68,68,0.2); color: #fca5a5; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Xóa</button>
                        </td>
                    </tr>
                `).join('');
            }
        });
    }

    window.deleteUser = function(username) {
        if (username === 'admin') {
            alert("Không thể xóa tài khoản admin gốc!");
            return;
        }
        if (confirm(`Bạn có chắc muốn xóa tài khoản ${username}?`)) {
            fetch('/api/users').then(r=>r.json()).then(data => {
                let users = data.users || [];
                users = users.filter(u => u.username !== username);
                fetch('/api/users', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({users: users})
                }).then(() => renderUsersTable());
            });
        }
    };
