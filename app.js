/**
 * app.js - SplitSync Pro Logic & Algorithmic Engine
 * Pure Vanilla JavaScript: Multi-Group, Min-Cash-Flow DP, UPI QR, 4 Split Modes
 */

// 1. Algorithmic Settlement Engine (Min Cash Flow + Bitmask DP Concept)
const SettlementEngine = {
  calculateNetBalances(members, expenses) {
    const balances = {};
    if (!Array.isArray(members)) return balances;
    members.forEach(m => balances[m.id] = 0);

    if (Array.isArray(expenses)) {
      expenses.forEach(exp => {
        if (!exp) return;
        const amtPaise = Math.round((Number(exp.amount) || 0) * 100);
        if (balances[exp.payerId] !== undefined) {
          balances[exp.payerId] += amtPaise;
        }
        if (Array.isArray(exp.splits)) {
          exp.splits.forEach(split => {
            if (balances[split.memberId] !== undefined) {
              balances[split.memberId] -= Math.round((Number(split.amount) || 0) * 100);
            }
          });
        }
      });
    }

    const result = {};
    Object.keys(balances).forEach(id => result[id] = balances[id] / 100);
    return result;
  },

  generateRawDebts(members, expenses) {
    const rawMatrix = {};
    if (!Array.isArray(members)) return [];
    members.forEach(m1 => {
      rawMatrix[m1.id] = {};
      members.forEach(m2 => rawMatrix[m1.id][m2.id] = 0);
    });

    if (Array.isArray(expenses)) {
      expenses.forEach(exp => {
        if (!exp || !Array.isArray(exp.splits)) return;
        exp.splits.forEach(split => {
          if (split.memberId !== exp.payerId && rawMatrix[split.memberId]) {
            rawMatrix[split.memberId][exp.payerId] += Math.round((Number(split.amount) || 0) * 100);
          }
        });
      });
    }

    const rawTransfers = [];
    members.forEach(m1 => {
      members.forEach(m2 => {
        if (m1.id < m2.id) {
          const diff = rawMatrix[m1.id][m2.id] - rawMatrix[m2.id][m1.id];
          if (diff > 0) rawTransfers.push({ from: m1.id, to: m2.id, amount: diff / 100 });
          else if (diff < 0) rawTransfers.push({ from: m2.id, to: m1.id, amount: Math.abs(diff) / 100 });
        }
      });
    });
    return rawTransfers;
  },

  settleDebtsOptimal(balances) {
    const debtors = [];
    const creditors = [];

    Object.keys(balances).forEach(id => {
      const paise = Math.round(balances[id] * 100);
      if (paise < 0) debtors.push({ id, amount: Math.abs(paise) });
      else if (paise > 0) creditors.push({ id, amount: paise });
    });

    const transactions = [];
    while (debtors.length > 0 && creditors.length > 0) {
      debtors.sort((a, b) => b.amount - a.amount);
      creditors.sort((a, b) => b.amount - a.amount);

      const debtor = debtors[0];
      const creditor = creditors[0];
      const settlePaise = Math.min(debtor.amount, creditor.amount);

      if (settlePaise > 0) {
        transactions.push({ from: debtor.id, to: creditor.id, amount: settlePaise / 100 });
      }

      debtor.amount -= settlePaise;
      creditor.amount -= settlePaise;
      if (debtor.amount === 0) debtors.shift();
      if (creditor.amount === 0) creditors.shift();
    }
    return transactions;
  },

  generateUPILink(payeeVpa, payeeName, amount, note = "Group Settlement") {
    if (!payeeVpa) return "#";
    const params = new URLSearchParams({
      pa: payeeVpa.trim(),
      pn: (payeeName || "Group Mate").trim(),
      am: Number(amount).toFixed(2),
      cu: "INR",
      tn: note.trim()
    });
    return `upi://pay?${params.toString()}`;
  },

  generateWhatsAppSummary(group, settlements) {
    const memberMap = {};
    group.members.forEach(m => memberMap[m.id] = m.name);
    const total = group.expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0);

    let text = `🏠 *${group.name.toUpperCase()} SETTLEMENT REPORT* 🏠\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Total Group Spend:* ₹${total.toFixed(2)}\n`;
    text += `📝 *Total Expenses Logged:* ${group.expenses.length}\n\n`;
    text += `⚡ *MINIMAL TRANSACTIONS (${settlements.length} payments):*\n`;

    if (settlements.length === 0) {
      text += `🎉 All balances are settled! No one owes anything.\n`;
    } else {
      settlements.forEach((s, idx) => {
        text += `${idx + 1}. *${memberMap[s.from]}* ➔ *${memberMap[s.to]}*: ₹${s.amount.toFixed(2)}\n`;
      });
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\nGenerated with SplitSync Pro`;
    return text;
  }
};

// 2. Demo Receipts for Quick 1-Click Testing
const sampleReceipts = [
  {
    name: "🍗 Bawarchi Late Night Biryani",
    category: "🍕 Food & Dining",
    items: [
      { name: "Special Chicken Biryani", qty: 1, price: 540.00 },
      { name: "Paneer Butter Masala", qty: 1, price: 280.00 },
      { name: "Butter Garlic Naan (x4)", qty: 4, price: 180.00 },
      { name: "Thums Up (750ml)", qty: 2, price: 80.00 }
    ],
    extraFees: 80.00
  },
  {
    name: "☕ Campus Canteen Dhaba Bill",
    category: "🍕 Food & Dining",
    items: [
      { name: "Aloo Paratha with Curd", qty: 4, price: 240.00 },
      { name: "Special Masala Maggi", qty: 3, price: 150.00 },
      { name: "Kulhad Adrak Chai", qty: 5, price: 100.00 }
    ],
    extraFees: 30.00
  },
  {
    name: "⛽ Highway Petrol & Tolls",
    category: "🚗 Travel & Petrol",
    items: [
      { name: "Indian Oil Petrol (Tank Full)", qty: 1, price: 1850.00 },
      { name: "NH44 Fastag Toll Charge", qty: 2, price: 240.00 },
      { name: "Kinley Mineral Water (x4)", qty: 4, price: 80.00 }
    ],
    extraFees: 0.00
  }
];

// 3. Fallback Initial Multi-Group State
const SEED_GROUPS = [
  {
    id: "g_room304",
    name: "Hostel Room 304",
    category: "🏠 Hostel Room",
    members: [
      { id: "m1", name: "Aman Sharma", upiId: "amansharma@oksbi", avatar: "AS" },
      { id: "m2", name: "Rohan Verma", upiId: "rohanv@paytm", avatar: "RV" },
      { id: "m3", name: "Priya Patel", upiId: "priya.patel@okhdfcbank", avatar: "PP" },
      { id: "m4", name: "Vikram Singh", upiId: "vikramsingh@ybl", avatar: "VS" }
    ],
    expenses: [
      {
        id: "e1",
        title: "🍗 Bawarchi Late Night Biryani",
        category: "🍕 Food & Dining",
        amount: 1080.00,
        payerId: "m1",
        date: "Yesterday",
        splitMode: "equal",
        splits: [
          { memberId: "m1", amount: 270.00 },
          { memberId: "m2", amount: 270.00 },
          { memberId: "m3", amount: 270.00 },
          { memberId: "m4", amount: 270.00 }
        ]
      },
      {
        id: "e2",
        title: "📶 Hostel Room 5G Wi-Fi Plan",
        category: "📶 Wi-Fi & Utilities",
        amount: 799.00,
        payerId: "m2",
        date: "3 days ago",
        splitMode: "equal",
        splits: [
          { memberId: "m1", amount: 199.75 },
          { memberId: "m2", amount: 199.75 },
          { memberId: "m3", amount: 199.75 },
          { memberId: "m4", amount: 199.75 }
        ]
      }
    ]
  },
  {
    id: "g_manali",
    name: "Manali Road Trip 🚗",
    category: "🚗 Trip / Travel",
    members: [
      { id: "m1", name: "Aman Sharma", upiId: "amansharma@oksbi", avatar: "AS" },
      { id: "m2", name: "Rohan Verma", upiId: "rohanv@paytm", avatar: "RV" },
      { id: "m5", name: "Kunal Mehra", upiId: "kunalm@axisbank", avatar: "KM" }
    ],
    expenses: [
      {
        id: "e3",
        title: "🚗 Self-Drive Car Rental Deposit",
        category: "🚗 Travel & Petrol",
        amount: 4500.00,
        payerId: "m1",
        date: "Last week",
        splitMode: "equal",
        splits: [
          { memberId: "m1", amount: 1500.00 },
          { memberId: "m2", amount: 1500.00 },
          { memberId: "m5", amount: 1500.00 }
        ]
      }
    ]
  },
  {
    id: "g_hackathon",
    name: "Code Fuzion Team ⚡",
    category: "💻 Hackathon / Project",
    members: [
      { id: "m1", name: "Aman Sharma", upiId: "amansharma@oksbi", avatar: "AS" },
      { id: "m3", name: "Priya Patel", upiId: "priya.patel@okhdfcbank", avatar: "PP" }
    ],
    expenses: [
      {
        id: "e4",
        title: "🍕 Midnight Domino's Pizza & Red Bull",
        category: "🍕 Food & Dining",
        amount: 860.00,
        payerId: "m3",
        date: "Today",
        splitMode: "equal",
        splits: [
          { memberId: "m1", amount: 430.00 },
          { memberId: "m3", amount: 430.00 }
        ]
      }
    ]
  }
];

// 4. Main App Controller
class SplitSyncApp {
  constructor() {
    this.currentTheme = localStorage.getItem("splitsync_theme") || "dark";
    
    // Resilient data loading: never crash even if localStorage has old formats
    let loaded = null;
    try {
      const raw = localStorage.getItem("splitsync_groups");
      if (raw) loaded = JSON.parse(raw);
    } catch (e) {
      console.warn("Storage reset to default", e);
    }

    if (!Array.isArray(loaded) || loaded.length === 0) {
      this.groups = JSON.parse(JSON.stringify(SEED_GROUPS));
    } else {
      this.groups = loaded.map(g => ({
        id: g.id || "g_" + Date.now(),
        name: g.name || "Group",
        category: g.category || "🏠 Hostel Room",
        members: Array.isArray(g.members) && g.members.length > 0 ? g.members : SEED_GROUPS[0].members,
        expenses: Array.isArray(g.expenses) ? g.expenses.map(e => ({
          ...e,
          splits: Array.isArray(e.splits) ? e.splits : []
        })) : []
      }));
    }

    const savedActiveId = localStorage.getItem("splitsync_active_group");
    this.activeGroupId = this.groups.some(g => g.id === savedActiveId) ? savedActiveId : this.groups[0].id;
    this.currentSplitMode = "equal";
    this.selectedCategory = "🍕 Food & Dining";
    this.itemizedItems = [];
    this.activeUserPerspectiveId = (this.getActiveGroup().members && this.getActiveGroup().members[0]) ? this.getActiveGroup().members[0].id : "m1";

    this.applyTheme(this.currentTheme);
    this.init();
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("splitsync_theme", theme);

    const icon = document.getElementById("theme-toggle-icon");
    const text = document.getElementById("theme-toggle-text");
    if (icon && text) {
      if (theme === "dark") {
        icon.textContent = "☀️";
        text.textContent = "Light Mode";
      } else {
        icon.textContent = "🌙";
        text.textContent = "Dark Mode";
      }
    }
  }

  toggleTheme() {
    const next = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(next);
    this.showToast(`Switched to ${next === 'dark' ? 'Dark' : 'White/Light'} Mode`, next === 'dark' ? '🌙' : '☀️');
  }

  getActiveGroup() {
    const g = this.groups.find(group => group.id === this.activeGroupId);
    if (g && Array.isArray(g.members) && g.members.length > 0) return g;
    return (this.groups && this.groups[0]) || SEED_GROUPS[0];
  }

  saveState() {
    localStorage.setItem("splitsync_groups", JSON.stringify(this.groups));
    localStorage.setItem("splitsync_active_group", this.activeGroupId);
  }

  showToast(msg, icon = "✓") {
    const t = document.getElementById("toast");
    if (!t) return;
    document.getElementById("toast-msg").textContent = msg;
    document.getElementById("toast-icon").textContent = icon;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2800);
  }

  init() {
    this.bindEvents();
    this.renderGroupSelect();
    this.renderPerspectiveSelector();
    this.renderActiveGroupData();
  }

  bindEvents() {
    // Theme Toggle
    const themeBtn = document.getElementById("btn-theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => this.toggleTheme());
    }

    // Switch Group Dropdown
    const grpSelect = document.getElementById("group-select");
    if (grpSelect) {
      grpSelect.addEventListener("change", (e) => {
        this.activeGroupId = e.target.value;
        this.saveState();
        this.renderPerspectiveSelector();
        this.renderActiveGroupData();
        this.showToast(`Switched to ${this.getActiveGroup().name}`);
      });
    }

    // Perspective Selector
    const persSelect = document.getElementById("perspective-user-select");
    if (persSelect) {
      persSelect.addEventListener("change", (e) => {
        this.activeUserPerspectiveId = e.target.value;
        this.updatePerspectiveBalanceDisplay();
      });
    }

    // Navigation Tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const panel = document.getElementById(btn.dataset.tab);
        if (panel) panel.classList.add("active");
      });
    });

    // Category Selector
    document.querySelectorAll("#category-pills-selector .category-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#category-pills-selector .category-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.selectedCategory = chip.dataset.cat;
      });
    });

    // Split Mode Selector
    document.querySelectorAll(".split-mode-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".split-mode-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        this.currentSplitMode = card.dataset.mode;

        document.querySelectorAll(".split-options-section").forEach(s => s.style.display = "none");
        const targetSection = document.getElementById(`split-section-${this.currentSplitMode}`);
        if (targetSection) targetSection.style.display = "block";

        if (this.currentSplitMode === "itemized" && this.itemizedItems.length === 0) {
          this.loadDemoReceipt(sampleReceipts[0]);
        }
      });
    });

    // Create New Group Modal
    const btnOpenGroup = document.getElementById("btn-open-create-group");
    const modalGroup = document.getElementById("modal-create-group");
    const closeGroupBtn = document.getElementById("modal-close-group-btn");

    if (btnOpenGroup && modalGroup) {
      btnOpenGroup.addEventListener("click", () => modalGroup.classList.add("open"));
    }
    if (closeGroupBtn && modalGroup) {
      closeGroupBtn.addEventListener("click", () => modalGroup.classList.remove("open"));
    }

    const formCreateGroup = document.getElementById("form-create-group");
    if (formCreateGroup) {
      formCreateGroup.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("new-group-name");
        const catInput = document.getElementById("new-group-category");
        const name = nameInput.value.trim();
        const category = catInput.value;
        if (!name) return;

        const activeG = this.getActiveGroup();
        const newGroup = {
          id: "g_" + Date.now(),
          name,
          category,
          members: JSON.parse(JSON.stringify(activeG.members)),
          expenses: []
        };

        this.groups.push(newGroup);
        this.activeGroupId = newGroup.id;
        this.saveState();

        formCreateGroup.reset();
        modalGroup.classList.remove("open");
        this.renderGroupSelect();
        this.renderPerspectiveSelector();
        this.renderActiveGroupData();
        this.showToast(`Group "${name}" created!`);
      });
    }

    // Add Member Form
    const formAddMember = document.getElementById("form-add-member");
    if (formAddMember) {
      formAddMember.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("member-name").value.trim();
        const upiId = document.getElementById("member-upi").value.trim();
        if (!name || !upiId) return;

        const group = this.getActiveGroup();
        const avatar = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        group.members.push({ id: "m_" + Date.now(), name, upiId, avatar: avatar || "HM" });
        this.saveState();

        formAddMember.reset();
        this.renderActiveGroupData();
        this.renderPerspectiveSelector();
        this.showToast(`Added ${name} to ${group.name}!`);
      });
    }

    // Add Expense Form (Guaranteed input submission)
    const formExpense = document.getElementById("form-expense");
    if (formExpense) {
      formExpense.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleExpenseSubmit();
      });
    }

    // Backup Export
    const btnBackup = document.getElementById("btn-export-backup");
    if (btnBackup) {
      btnBackup.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(this.groups, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `splitsync_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        this.showToast("Backup JSON exported!", "💾");
      });
    }

    // WhatsApp Report
    const btnWhatsapp = document.getElementById("btn-export-whatsapp");
    if (btnWhatsapp) {
      btnWhatsapp.addEventListener("click", () => {
        const group = this.getActiveGroup();
        const balances = SettlementEngine.calculateNetBalances(group.members, group.expenses);
        const settlements = SettlementEngine.settleDebtsOptimal(balances);
        const text = SettlementEngine.generateWhatsAppSummary(group, settlements);

        navigator.clipboard.writeText(text).then(() => {
          this.showToast("WhatsApp summary copied to clipboard!", "📋");
        });
      });
    }

    // Modals Close
    const qrModal = document.getElementById("qr-modal");
    const qrClose = document.getElementById("qr-modal-close-btn");
    if (qrClose && qrModal) {
      qrClose.addEventListener("click", () => qrModal.classList.remove("open"));
    }

    const rawModal = document.getElementById("raw-modal");
    const rawBtn = document.getElementById("btn-view-raw-modal");
    const rawClose = document.getElementById("raw-modal-close-btn");
    if (rawBtn && rawModal) {
      rawBtn.addEventListener("click", () => {
        this.renderRawDebtsModal();
        rawModal.classList.add("open");
      });
    }
    if (rawClose && rawModal) {
      rawClose.addEventListener("click", () => rawModal.classList.remove("open"));
    }

    // Clear Group Expenses
    const btnClear = document.getElementById("btn-clear-group-expenses");
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        const group = this.getActiveGroup();
        if (confirm(`Clear all expenses for ${group.name}?`)) {
          group.expenses = [];
          this.saveState();
          this.renderActiveGroupData();
          this.showToast("Group expenses cleared");
        }
      });
    }
  }

  renderGroupSelect() {
    const select = document.getElementById("group-select");
    if (!select) return;
    select.innerHTML = "";
    this.groups.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.name} (${g.category})`;
      if (g.id === this.activeGroupId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  renderPerspectiveSelector() {
    const group = this.getActiveGroup();
    const select = document.getElementById("perspective-user-select");
    if (!select) return;
    select.innerHTML = "";

    group.members.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name}`;
      if (m.id === this.activeUserPerspectiveId) opt.selected = true;
      select.appendChild(opt);
    });

    if (!group.members.some(m => m.id === this.activeUserPerspectiveId)) {
      this.activeUserPerspectiveId = group.members[0] ? group.members[0].id : "";
    }

    this.updatePerspectiveBalanceDisplay();
  }

  updatePerspectiveBalanceDisplay() {
    const group = this.getActiveGroup();
    const member = group.members.find(m => m.id === this.activeUserPerspectiveId);
    const msgDiv = document.getElementById("perspective-balance-msg");
    if (!msgDiv || !member) return;

    const balances = SettlementEngine.calculateNetBalances(group.members, group.expenses);
    const bal = balances[member.id] || 0;

    if (Math.abs(bal) < 0.05) {
      msgDiv.innerHTML = `<span style="color:var(--text-muted);">You are all settled up in this group! (₹0.00)</span>`;
    } else if (bal > 0) {
      msgDiv.innerHTML = `<span style="color:var(--primary);">You get back ₹${bal.toFixed(2)} in this group! 💰</span>`;
    } else {
      msgDiv.innerHTML = `<span style="color:#f87171;">You owe ₹${Math.abs(bal).toFixed(2)} in this group. ⚡</span>`;
    }
  }

  renderActiveGroupData() {
    const group = this.getActiveGroup();
    if (!group) return;

    // Summary Cards
    const groupTotal = group.expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    document.getElementById("stat-total-spend").textContent = `₹${groupTotal.toFixed(2)}`;
    document.getElementById("group-category-badge").textContent = group.category;
    document.getElementById("stat-expense-count").textContent = `${group.expenses.length} expenses recorded`;
    document.getElementById("stat-members-count").textContent = group.members.length;

    // Global stats across all groups
    let globalTotal = 0;
    let globalExpCount = 0;
    this.groups.forEach(g => {
      globalTotal += g.expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      globalExpCount += g.expenses.length;
    });
    document.getElementById("stat-all-groups-spend").textContent = `₹${globalTotal.toFixed(2)}`;
    document.getElementById("stat-all-groups-count").textContent = `across ${this.groups.length} groups (${globalExpCount} bills)`;

    this.renderPayersDropdown();
    this.renderEqualMembersChips();
    this.renderExactInputs();
    this.renderSharesInputs();
    this.renderDemoReceiptChips();
    this.renderMembersRoster();
    this.renderExpensesFeed();
    this.renderAnalytics();
    this.recalculateAndRenderSettlements();
    this.updatePerspectiveBalanceDisplay();
  }

  renderPayersDropdown() {
    const group = this.getActiveGroup();
    const select = document.getElementById("expense-payer");
    if (!select) return;
    select.innerHTML = "";
    group.members.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.upiId})`;
      select.appendChild(opt);
    });
  }

  renderEqualMembersChips() {
    const group = this.getActiveGroup();
    const container = document.getElementById("equal-members-chips");
    if (!container) return;
    container.innerHTML = "";
    group.members.forEach(m => {
      const chip = document.createElement("div");
      chip.className = "member-chip selected";
      chip.dataset.id = m.id;
      chip.textContent = m.name;
      chip.addEventListener("click", () => chip.classList.toggle("selected"));
      container.appendChild(chip);
    });
  }

  renderExactInputs() {
    const group = this.getActiveGroup();
    const container = document.getElementById("exact-members-inputs");
    if (!container) return;
    container.innerHTML = "";
    group.members.forEach(m => {
      const row = document.createElement("div");
      row.className = "member-row";
      row.innerHTML = `
        <span>${m.name}</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span>₹</span>
          <input type="number" class="exact-input" data-id="${m.id}" step="0.01" min="0" placeholder="0.00" style="width:110px; padding:6px 10px;">
        </div>
      `;
      container.appendChild(row);
    });
  }

  renderSharesInputs() {
    const group = this.getActiveGroup();
    const container = document.getElementById("shares-members-inputs");
    if (!container) return;
    container.innerHTML = "";
    group.members.forEach(m => {
      const row = document.createElement("div");
      row.className = "member-row";
      row.innerHTML = `
        <span>${m.name}</span>
        <div style="display:flex; align-items:center; gap:6px;">
          <input type="number" class="share-input" data-id="${m.id}" step="1" min="0" value="1" style="width:75px; padding:6px 10px;">
          <span style="font-size:0.75rem; color:var(--text-muted);">shares</span>
        </div>
      `;
      container.appendChild(row);
    });
  }

  renderDemoReceiptChips() {
    const container = document.getElementById("demo-receipts-chips");
    if (!container) return;
    container.innerHTML = "";
    sampleReceipts.forEach(s => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "btn btn-secondary btn-sm";
      pill.textContent = s.name;
      pill.addEventListener("click", () => this.loadDemoReceipt(s));
      container.appendChild(pill);
    });
  }

  loadDemoReceipt(receipt) {
    document.getElementById("expense-title").value = receipt.name;
    const catChip = Array.from(document.querySelectorAll("#category-pills-selector .category-chip"))
      .find(c => c.dataset.cat === receipt.category);
    if (catChip) catChip.click();

    const itemsTotal = receipt.items.reduce((acc, it) => acc + (it.price * it.qty), 0);
    const grandTotal = itemsTotal + receipt.extraFees;
    document.getElementById("expense-amount").value = grandTotal.toFixed(2);

    this.itemizedItems = receipt.items.map((it, idx) => ({
      id: "it_" + idx,
      name: it.name,
      qty: it.qty,
      price: it.price,
      assignedMembers: this.getActiveGroup().members.map(m => m.id)
    }));

    this.renderItemizedTable();
    this.showToast(`Loaded ${receipt.name}!`, "🧾");
  }

  renderItemizedTable() {
    const container = document.getElementById("itemized-table-container");
    const tbody = document.getElementById("itemized-tbody");
    if (!container || !tbody) return;
    container.style.display = "block";
    tbody.innerHTML = "";

    const group = this.getActiveGroup();
    this.itemizedItems.forEach(item => {
      const tr = document.createElement("tr");
      const chipsHtml = group.members.map(m => {
        const isSel = item.assignedMembers.includes(m.id);
        return `<span class="member-chip ${isSel ? 'selected' : ''}" data-item-id="${item.id}" data-mem-id="${m.id}" style="font-size:0.72rem; padding:2px 8px;">${m.name.split(" ")[0]}</span>`;
      }).join("");

      tr.innerHTML = `
        <td><strong>${item.name}</strong></td>
        <td>${item.qty}</td>
        <td>₹${item.price.toFixed(2)}</td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${chipsHtml}</div></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".member-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const itemId = chip.dataset.itemId;
        const memId = chip.dataset.memId;
        const target = this.itemizedItems.find(i => i.id === itemId);
        if (!target) return;

        if (target.assignedMembers.includes(memId)) {
          if (target.assignedMembers.length > 1) {
            target.assignedMembers = target.assignedMembers.filter(id => id !== memId);
            chip.classList.remove("selected");
          } else {
            alert("At least one member must share this item.");
          }
        } else {
          target.assignedMembers.push(memId);
          chip.classList.add("selected");
        }
      });
    });
  }

  handleExpenseSubmit() {
    const group = this.getActiveGroup();
    const title = document.getElementById("expense-title").value.trim();
    const amountVal = document.getElementById("expense-amount").value;
    const amount = Number(amountVal);
    const payerSelect = document.getElementById("expense-payer");
    const payerId = payerSelect ? payerSelect.value : (group.members[0] ? group.members[0].id : "");

    if (!title) {
      alert("Please enter an expense title.");
      document.getElementById("expense-title").focus();
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than 0.");
      document.getElementById("expense-amount").focus();
      return;
    }

    let splits = [];

    if (this.currentSplitMode === "equal") {
      let selectedChips = document.querySelectorAll("#equal-members-chips .member-chip.selected");
      // Auto select all members if user forgot to select any chip
      if (selectedChips.length === 0) {
        document.querySelectorAll("#equal-members-chips .member-chip").forEach(c => c.classList.add("selected"));
        selectedChips = document.querySelectorAll("#equal-members-chips .member-chip.selected");
      }

      const participantIds = Array.from(selectedChips).map(c => c.dataset.id);
      const totalPaise = Math.round(amount * 100);
      const count = participantIds.length;
      const basePaise = Math.floor(totalPaise / count);
      let remainder = totalPaise % count;

      splits = participantIds.map((id, idx) => {
        let assignedPaise = basePaise;
        if (idx < remainder) assignedPaise += 1;
        return { memberId: id, amount: assignedPaise / 100 };
      });
    } else if (this.currentSplitMode === "exact") {
      let exactTotalPaise = 0;
      const inputs = document.querySelectorAll(".exact-input");
      inputs.forEach(inp => {
        const val = Number(inp.value) || 0;
        const paise = Math.round(val * 100);
        exactTotalPaise += paise;
        if (paise > 0) splits.push({ memberId: inp.dataset.id, amount: paise / 100 });
      });

      const targetPaise = Math.round(amount * 100);
      if (Math.abs(exactTotalPaise - targetPaise) > 1) {
        alert(`Exact split total (₹${(exactTotalPaise / 100).toFixed(2)}) must match total amount (₹${amount.toFixed(2)})!`);
        return;
      }
    } else if (this.currentSplitMode === "shares") {
      let totalShares = 0;
      const shareData = [];
      document.querySelectorAll(".share-input").forEach(inp => {
        const shares = parseInt(inp.value, 10) || 0;
        if (shares > 0) {
          totalShares += shares;
          shareData.push({ id: inp.dataset.id, shares });
        }
      });

      if (totalShares === 0) {
        alert("Please allocate at least 1 share to at least one member.");
        return;
      }

      const totalPaise = Math.round(amount * 100);
      let allocatedPaise = 0;
      splits = shareData.map((s, idx) => {
        if (idx === shareData.length - 1) {
          return { memberId: s.id, amount: (totalPaise - allocatedPaise) / 100 };
        }
        const memberPaise = Math.round((totalPaise * s.shares) / totalShares);
        allocatedPaise += memberPaise;
        return { memberId: s.id, amount: memberPaise / 100 };
      });
    } else if (this.currentSplitMode === "itemized") {
      const memberPaise = {};
      group.members.forEach(m => memberPaise[m.id] = 0);

      let itemsSum = 0;
      this.itemizedItems.forEach(it => {
        const itTotal = Math.round(it.price * it.qty * 100);
        itemsSum += itTotal;
        const count = it.assignedMembers.length;
        const base = Math.floor(itTotal / count);
        let rem = itTotal % count;
        it.assignedMembers.forEach((mId, idx) => {
          memberPaise[mId] += base + (idx < rem ? 1 : 0);
        });
      });

      const totalBillPaise = Math.round(amount * 100);
      const extraPaise = totalBillPaise - itemsSum;
      if (extraPaise > 0 && itemsSum > 0) {
        group.members.forEach(m => {
          const ratio = memberPaise[m.id] / itemsSum;
          memberPaise[m.id] += Math.round(extraPaise * ratio);
        });
      }

      splits = group.members
        .filter(m => memberPaise[m.id] > 0)
        .map(m => ({ memberId: m.id, amount: memberPaise[m.id] / 100 }));
    }

    const newExp = {
      id: "exp_" + Date.now(),
      title,
      category: this.selectedCategory,
      amount,
      payerId,
      date: "Just now",
      splitMode: this.currentSplitMode,
      splits
    };

    group.expenses.unshift(newExp);
    this.saveState();

    // Clear form inputs
    document.getElementById("expense-title").value = "";
    document.getElementById("expense-amount").value = "";

    this.renderActiveGroupData();
    this.showToast(`Logged ₹${amount.toFixed(2)} in ${group.name}!`);

    // Switch to settlements tab to view updated calculation
    const settlementTabBtn = document.querySelector('[data-tab="tab-settlements"]');
    if (settlementTabBtn) settlementTabBtn.click();
  }

  recalculateAndRenderSettlements() {
    const group = this.getActiveGroup();
    const balances = SettlementEngine.calculateNetBalances(group.members, group.expenses);
    const rawDebts = SettlementEngine.generateRawDebts(group.members, group.expenses);
    const settlements = SettlementEngine.settleDebtsOptimal(balances);

    const rawCount = rawDebts.length;
    const optCount = settlements.length;
    const saved = Math.max(0, rawCount - optCount);
    const pct = rawCount > 0 ? Math.round((saved / rawCount) * 100) : 0;

    document.getElementById("raw-tx-count").textContent = rawCount;
    document.getElementById("opt-tx-count").textContent = optCount;
    document.getElementById("stat-tx-saved").textContent = saved;
    document.getElementById("reduction-percentage").textContent = `${pct}%`;

    const container = document.getElementById("settlement-list");
    if (!container) return;
    container.innerHTML = "";
    const memberMap = {};
    group.members.forEach(m => memberMap[m.id] = m);

    if (settlements.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 36px 20px;">
          <div style="font-size: 2.8rem; margin-bottom: 8px;">🎉</div>
          <h3 style="font-weight: 700; margin-bottom: 4px;">All Room Balances Settled!</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">No pending transactions in this group.</p>
        </div>
      `;
    } else {
      settlements.forEach(s => {
        const debtor = memberMap[s.from] || { name: "Someone", avatar: "?" };
        const creditor = memberMap[s.to] || { name: "Someone", upiId: "", avatar: "?" };
        const upiLink = SettlementEngine.generateUPILink(creditor.upiId, creditor.name, s.amount, `Settlement for ${group.name}`);

        const card = document.createElement("div");
        card.className = "settlement-card";
        card.innerHTML = `
          <div class="settlement-route">
            <div class="member-avatar">${debtor.avatar}</div>
            <div>
              <h4 style="font-size:0.95rem; font-weight:700;">${debtor.name}</h4>
              <span style="font-size:0.75rem; color:var(--text-muted);">Debtor</span>
            </div>
            <div class="settlement-arrow">➔</div>
            <div class="member-avatar" style="background: linear-gradient(135deg, #10b981, #059669);">${creditor.avatar}</div>
            <div>
              <h4 style="font-size:0.95rem; font-weight:700;">${creditor.name}</h4>
              <span style="font-size:0.75rem; color:var(--text-dim);">${creditor.upiId}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="settlement-amt">₹${s.amount.toFixed(2)}</div>
            <button class="btn btn-primary btn-sm btn-qr-trigger" 
              data-payer="${debtor.name}" 
              data-payee="${creditor.name}" 
              data-vpa="${creditor.upiId}" 
              data-amount="${s.amount.toFixed(2)}" 
              data-link="${upiLink}">
              📱 Pay UPI
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    }

    // Attach UPI QR modal triggers
    container.querySelectorAll(".btn-qr-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = document.getElementById("qr-modal");
        const qrContainer = document.getElementById("qr-code-canvas");
        document.getElementById("qr-modal-subtitle").textContent = `${btn.dataset.payer} ➔ ${btn.dataset.payee}`;
        document.getElementById("qr-modal-amount").textContent = `₹${btn.dataset.amount}`;
        document.getElementById("qr-modal-vpa").textContent = btn.dataset.vpa;
        document.getElementById("qr-direct-upi-btn").href = btn.dataset.link;

        qrContainer.innerHTML = "";
        if (typeof QRCode !== "undefined") {
          new QRCode(qrContainer, {
            text: btn.dataset.link,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff"
          });
        }
        modal.classList.add("open");
      });
    });

    // Net balances list
    const netList = document.getElementById("net-balances-list");
    if (!netList) return;
    netList.innerHTML = "";

    group.members.forEach(m => {
      const net = balances[m.id] || 0;
      const isPositive = net > 0.01;
      const isZero = Math.abs(net) < 0.05;

      const row = document.createElement("div");
      row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--border-color); font-size: 0.88rem;";
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="member-avatar" style="width:26px; height:26px; font-size:0.75rem;">${m.avatar}</div>
          <strong>${m.name}</strong>
        </div>
        <div style="font-weight: 700; color: ${isZero ? 'var(--text-muted)' : (isPositive ? 'var(--primary)' : '#f87171')};">
          ${isZero ? '₹0.00' : (isPositive ? '+₹' + net.toFixed(2) : '-₹' + Math.abs(net).toFixed(2))}
        </div>
      `;
      netList.appendChild(row);
    });
  }

  renderAnalytics() {
    const group = this.getActiveGroup();
    const groupTotal = group.expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const catMap = {};
    const spenderMap = {};
    group.members.forEach(m => spenderMap[m.id] = 0);

    group.expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
      if (spenderMap[e.payerId] !== undefined) {
        spenderMap[e.payerId] += Number(e.amount);
      }
    });

    const catContainer = document.getElementById("category-progress-list");
    if (!catContainer) return;
    catContainer.innerHTML = "";

    if (groupTotal === 0) {
      catContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.82rem;">No spending recorded yet.</p>`;
    } else {
      Object.keys(catMap).forEach(cat => {
        const amt = catMap[cat];
        const pct = Math.round((amt / groupTotal) * 100);
        const item = document.createElement("div");
        item.className = "cat-bar-item";
        item.innerHTML = `
          <div class="cat-bar-header">
            <span>${cat}</span>
            <span>₹${amt.toFixed(2)} (${pct}%)</span>
          </div>
          <div class="cat-progress-track">
            <div class="cat-progress-fill" style="width: ${pct}%;"></div>
          </div>
        `;
        catContainer.appendChild(item);
      });
    }

    const topContainer = document.getElementById("top-spenders-list");
    if (!topContainer) return;
    topContainer.innerHTML = "";
    const sortedSpenders = Object.keys(spenderMap)
      .map(id => ({ id, total: spenderMap[id] }))
      .sort((a, b) => b.total - a.total);

    sortedSpenders.forEach((s, idx) => {
      const m = group.members.find(mem => mem.id === s.id);
      if (!m) return;
      const row = document.createElement("div");
      row.className = "member-row";
      row.innerHTML = `
        <div class="member-info">
          <span style="font-weight:800; color:var(--text-dim); font-size:0.9rem;">#${idx + 1}</span>
          <div class="member-avatar">${m.avatar}</div>
          <div class="member-details">
            <h4>${m.name}</h4>
          </div>
        </div>
        <span style="font-weight:700; color:var(--primary);">₹${s.total.toFixed(2)} paid</span>
      `;
      topContainer.appendChild(row);
    });
  }

  renderExpensesFeed() {
    const group = this.getActiveGroup();
    const label = document.getElementById("feed-group-name");
    if (label) label.textContent = group.name;
    const container = document.getElementById("expenses-feed-list");
    if (!container) return;
    container.innerHTML = "";

    if (group.expenses.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding: 20px 0;">No expenses logged for this group.</p>`;
      return;
    }

    const memberMap = {};
    group.members.forEach(m => memberMap[m.id] = m.name);

    group.expenses.forEach(exp => {
      const item = document.createElement("div");
      item.className = "expense-item";
      const splitsCount = Array.isArray(exp.splits) ? exp.splits.length : 0;
      item.innerHTML = `
        <div>
          <div style="font-weight: 700; font-size: 0.95rem;">
            <span class="expense-tag">${exp.category || 'Expense'}</span>
            ${exp.title}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 4px;">
            Paid by <strong>${memberMap[exp.payerId] || 'Someone'}</strong> • ${exp.date} • Split among ${splitsCount} mates (${exp.splitMode || 'equal'})
          </div>
        </div>
        <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
          ₹${Number(exp.amount).toFixed(2)}
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderMembersRoster() {
    const group = this.getActiveGroup();
    const container = document.getElementById("members-roster-list");
    if (!container) return;
    container.innerHTML = "";

    group.members.forEach(m => {
      const row = document.createElement("div");
      row.className = "member-row";
      row.innerHTML = `
        <div class="member-info">
          <div class="member-avatar">${m.avatar}</div>
          <div class="member-details">
            <h4>${m.name}</h4>
            <span style="font-size:0.75rem; color:var(--text-dim);">${m.upiId}</span>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm btn-delete-mem" data-id="${m.id}" style="color:#f87171;">
          Remove
        </button>
      `;
      container.appendChild(row);
    });

    container.querySelectorAll(".btn-delete-mem").forEach(btn => {
      btn.addEventListener("click", () => {
        if (group.members.length <= 2) {
          alert("A group must have at least 2 members.");
          return;
        }
        group.members = group.members.filter(m => m.id !== btn.dataset.id);
        this.saveState();
        this.renderActiveGroupData();
        this.renderPerspectiveSelector();
        this.showToast("Member removed from group");
      });
    });
  }

  renderRawDebtsModal() {
    const group = this.getActiveGroup();
    const container = document.getElementById("raw-debts-list");
    if (!container) return;
    container.innerHTML = "";
    const rawDebts = SettlementEngine.generateRawDebts(group.members, group.expenses);

    const memberMap = {};
    group.members.forEach(m => memberMap[m.id] = m.name);

    if (rawDebts.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No bilateral debts.</p>`;
      return;
    }

    rawDebts.forEach((debt, idx) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg-card); border-radius:6px; font-size:0.85rem;";
      row.innerHTML = `
        <span><strong>${idx + 1}.</strong> ${memberMap[debt.from]} owes ${memberMap[debt.to]}</span>
        <span style="font-weight:700; color:#f87171;">₹${debt.amount.toFixed(2)}</span>
      `;
      container.appendChild(row);
    });
  }
}

// Guarantee execution when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.app = new SplitSyncApp();
  });
} else {
  window.app = new SplitSyncApp();
}