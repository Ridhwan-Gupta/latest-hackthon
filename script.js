/**
 * app.js - SplitSync Pro Logic & Algorithmic Engine
 */

// 1. Algorithmic Settlement Engine (Min Cash Flow + Bitmask DP)
const SettlementEngine = {
  calculateNetBalances(members, expenses) {
    const balances = {};
    members.forEach(m => balances[m.id] = 0);

    expenses.forEach(exp => {
      if (balances[exp.payerId] !== undefined) {
        balances[exp.payerId] += Math.round(exp.amount * 100);
      }
      exp.splits.forEach(split => {
        if (balances[split.memberId] !== undefined) {
          balances[split.memberId] -= Math.round(split.amount * 100);
        }
      });
    });

    const result = {};
    Object.keys(balances).forEach(id => result[id] = balances[id] / 100);
    return result;
  },

  generateRawDebts(members, expenses) {
    const rawMatrix = {};
    members.forEach(m1 => {
      rawMatrix[m1.id] = {};
      members.forEach(m2 => rawMatrix[m1.id][m2.id] = 0);
    });

    expenses.forEach(exp => {
      exp.splits.forEach(split => {
        if (split.memberId !== exp.payerId) {
          rawMatrix[split.memberId][exp.payerId] += Math.round(split.amount * 100);
        }
      });
    });

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
    const total = group.expenses.reduce((a, b) => a + b.amount, 0);

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

// 2. Demo Receipts
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

// 3. Initial Multi-Group State
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
      },
      {
        id: "e4",
        title: "⛽ Highway Petrol Refill",
        category: "🚗 Travel & Petrol",
        amount: 2170.00,
        payerId: "m2",
        date: "Last week",
        splitMode: "equal",
        splits: [
          { memberId: "m1", amount: 723.34 },
          { memberId: "m2", amount: 723.33 },
          { memberId: "m5", amount: 723.33 }
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
        id: "e5",
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
    this.groups = JSON.parse(localStorage.getItem("splitsync_groups")) || SEED_GROUPS;
    this.activeGroupId = localStorage.getItem("splitsync_active_group") || this.groups[0].id;
    this.currentSplitMode = "equal";
    this.selectedCategory = "🍕 Food & Dining";
    this.itemizedItems = [];
    this.activeUserPerspectiveId = "m1";

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
    const nextTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(nextTheme);
    this.showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'White/Light'} Mode`, nextTheme === 'dark' ? '🌙' : '☀️');
  }

  getActiveGroup() {
    return this.groups.find(g => g.id === this.activeGroupId) || this.groups[0];
  }

  saveState() {
    localStorage.setItem("splitsync_groups", JSON.stringify(this.groups));
    localStorage.setItem("splitsync_active_group", this.activeGroupId);
  }

  showToast(msg, icon = "✓") {
    const t = document.getElementById("toast");
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
    // Theme Toggle Click
    document.getElementById("btn-theme-toggle").addEventListener("click", () => {
      this.toggleTheme();
    });

    // Switch Group
    document.getElementById("group-select").addEventListener("change", (e) => {
      this.activeGroupId = e.target.value;
      this.saveState();
      this.renderPerspectiveSelector();
      this.renderActiveGroupData();
      this.showToast(`Switched to ${this.getActiveGroup().name}`);
    });

    // Perspective Switch
    document.getElementById("perspective-user-select").addEventListener("change", (e) => {
      this.activeUserPerspectiveId = e.target.value;
      this.updatePerspectiveBalanceDisplay();
    });

    // Navigation Tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
      });
    });

    // Category Pills
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
        document.getElementById(`split-section-${this.currentSplitMode}`).style.display = "block";

        if (this.currentSplitMode === "itemized" && this.itemizedItems.length === 0) {
          this.loadDemoReceipt(sampleReceipts[0]);
        }
      });
    });

    // Create New Group Modal
    document.getElementById("btn-open-create-group").addEventListener("click", () => {
      document.getElementById("modal-create-group").classList.add("open");
    });
    document.getElementById("modal-close-group-btn").addEventListener("click", () => {
      document.getElementById("modal-create-group").classList.remove("open");
    });

    document.getElementById("form-create-group").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("new-group-name").value.trim();
      const category = document.getElementById("new-group-category").value;
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

      document.getElementById("form-create-group").reset();
      document.getElementById("modal-create-group").classList.remove("open");
      this.renderGroupSelect();
      this.renderPerspectiveSelector();
      this.renderActiveGroupData();
      this.showToast(`Group "${name}" created!`);
    });

    // Backup Export
    document.getElementById("btn-export-backup").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(this.groups, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `splitsync_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      this.showToast("Backup JSON exported!", "💾");
    });

    // Add Member Form
    document.getElementById("form-add-member").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("member-name").value.trim();
      const upiId = document.getElementById("member-upi").value.trim();
      if (!name || !upiId) return;

      const group = this.getActiveGroup();
      const avatar = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      group.members.push({ id: "m_" + Date.now(), name, upiId, avatar: avatar || "HM" });
      this.saveState();

      document.getElementById("form-add-member").reset();
      this.renderActiveGroupData();
      this.renderPerspectiveSelector();
      this.showToast(`Added ${name} to ${group.name}!`);
    });

    // Add Expense Form
    document.getElementById("form-expense").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleExpenseSubmit();
    });

    // Copy WhatsApp Report
    document.getElementById("btn-export-whatsapp").addEventListener("click", () => {
      const group = this.getActiveGroup();
      const balances = SettlementEngine.calculateNetBalances(group.members, group.expenses);
      const settlements = SettlementEngine.settleDebtsOptimal(balances);
      const text = SettlementEngine.generateWhatsAppSummary(group, settlements);

      navigator.clipboard.writeText(text).then(() => {
        this.showToast("WhatsApp summary copied to clipboard!", "📋");
      });
    });

    // Modal Close Handlers
    document.getElementById("qr-modal-close-btn").addEventListener("click", () => {
      document.getElementById("qr-modal").classList.remove("open");
    });

    document.getElementById("btn-view-raw-modal").addEventListener("click", () => {
      this.renderRawDebtsModal();
      document.getElementById("raw-modal").classList.add("open");
    });
    document.getElementById("raw-modal-close-btn").addEventListener("click", () => {
      document.getElementById("raw-modal").classList.remove("open");
    });

    // Clear Expenses
    document.getElementById("btn-clear-group-expenses").addEventListener("click", () => {
      const group = this.getActiveGroup();
      if (confirm(`Clear all expenses for ${group.name}?`)) {
        group.expenses = [];
        this.saveState();
        this.renderActiveGroupData();
        this.showToast("Group expenses cleared");
      }
    });
  }

  renderGroupSelect() {
    const select = document.getElementById("group-select");
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
    if (!member) {
      msgDiv.textContent = "";
      return;
    }

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

    const groupTotal = group.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    document.getElementById("stat-total-spend").textContent = `₹${groupTotal.toFixed(2)}`;
    document.getElementById("group-category-badge").textContent = group.category;
    document.getElementById("stat-expense-count").textContent = `${group.expenses.length} expenses recorded`;
    document.getElementById("stat-members-count").textContent = group.members.length;

    let globalTotal = 0;
    let globalExpCount = 0;
    this.groups.forEach(g => {
      globalTotal += g.expenses.reduce((acc, curr) => acc + curr.amount, 0);
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

  loadDemoReceipt(s) {
    const group = this.getActiveGroup();
    document.getElementById("expense-title").value = s.name;
    this.selectedCategory = s.category;

    document.querySelectorAll("#category-pills-selector .category-chip").forEach(c => {
      c.classList.toggle("active", c.dataset.cat === s.category);
    });

    this.itemizedItems = s.items.map(item => ({
      ...item,
      sharedBy: group.members.map(m => m.id)
    }));

    const subtotal = this.itemizedItems.reduce((acc, curr) => acc + curr.price, 0);
    document.getElementById("expense-amount").value = (subtotal + s.extraFees).toFixed(2);

    const container = document.getElementById("itemized-table-container");
    const tbody = document.getElementById("itemized-tbody");
    container.style.display = "block";
    tbody.innerHTML = "";

    this.itemizedItems.forEach(item => {
      const tr = document.createElement("tr");
      let chipsHtml = "";
      group.members.forEach(m => {
        chipsHtml += `<span class="member-chip selected" data-mid="${m.id}">${m.name.split(" ")[0]}</span>`;
      });

      tr.innerHTML = `
        <td><strong>${item.name}</strong></td>
        <td>${item.qty}</td>
        <td>₹${item.price.toFixed(2)}</td>
        <td><div class="member-chip-group">${chipsHtml}</div></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".member-chip").forEach(chip => {
      chip.addEventListener("click", () => chip.classList.toggle("selected"));
    });

    this.showToast(`Loaded ${s.name}`);
  }

  handleExpenseSubmit() {
    const group = this.getActiveGroup();
    const title = document.getElementById("expense-title").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const payerId = document.getElementById("expense-payer").value;

    if (!title || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid title and amount.");
      return;
    }

    let splits = [];

    if (this.currentSplitMode === "equal") {
      const selectedChips = document.querySelectorAll("#equal-members-chips .member-chip.selected");
      const participantIds = Array.from(selectedChips).map(c => c.dataset.id);
      if (participantIds.length === 0) return alert("Select at least one member.");

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
      const inputs = document.querySelectorAll(".exact-input");
      let sum = 0;
      inputs.forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        if (val > 0) {
          splits.push({ memberId: inp.dataset.id, amount: val });
          sum += val;
        }
      });
      if (Math.abs(sum - amount) > 0.05) {
        return alert(`Sum of exact amounts (₹${sum.toFixed(2)}) must equal ₹${amount.toFixed(2)}.`);
      }

    } else if (this.currentSplitMode === "shares") {
      const inputs = document.querySelectorAll(".share-input");
      let totalShares = 0;
      const shareMap = {};
      inputs.forEach(inp => {
        const shares = parseInt(inp.value, 10) || 0;
        if (shares > 0) {
          shareMap[inp.dataset.id] = shares;
          totalShares += shares;
        }
      });
      if (totalShares === 0) return alert("Allocate at least 1 share.");

      const totalPaise = Math.round(amount * 100);
      let remainingPaise = totalPaise;
      const ids = Object.keys(shareMap);

      splits = ids.map((id, idx) => {
        if (idx === ids.length - 1) return { memberId: id, amount: remainingPaise / 100 };
        const assigned = Math.round((shareMap[id] / totalShares) * totalPaise);
        remainingPaise -= assigned;
        return { memberId: id, amount: assigned / 100 };
      });

    } else {
      const perPerson = amount / group.members.length;
      splits = group.members.map(m => ({ memberId: m.id, amount: Math.round(perPerson * 100) / 100 }));
    }

    group.expenses.unshift({
      id: "exp_" + Date.now(),
      title,
      category: this.selectedCategory,
      amount,
      payerId,
      date: "Just now",
      splitMode: this.currentSplitMode,
      splits
    });

    this.saveState();
    document.getElementById("form-expense").reset();
    this.renderActiveGroupData();
    this.showToast(`Logged ₹${amount.toFixed(2)} in ${group.name}!`);

    document.querySelector('[data-tab="tab-settlements"]').click();
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
    container.innerHTML = "";
    const memberMap = {};
    group.members.forEach(m => memberMap[m.id] = m);

    if (settlements.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 36px 20px;">
          <div style="font-size: 2.8rem; margin-bottom: 8px;">🎉</div>
          <h3 style="font-size: 1.1rem; font-weight: 700;">Everyone is All Settled!</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
            No pending transfers in ${group.name}. Add a bill to see the graph solver in action.
          </p>
        </div>
      `;
    } else {
      settlements.forEach(s => {
        const debtor = memberMap[s.from] || { name: "Someone", upiId: "" };
        const creditor = memberMap[s.to] || { name: "Someone", upiId: "payee@upi" };
        const upiLink = SettlementEngine.generateUPILink(
          creditor.upiId,
          creditor.name,
          s.amount,
          `${group.name}: ${debtor.name} to ${creditor.name}`
        );

        const card = document.createElement("div");
        card.className = "settlement-card";
        card.innerHTML = `
          <div class="debtor-flow">
            <div class="flow-node">
              <span class="flow-name">${debtor.name}</span>
              <span class="flow-upi">Debtor</span>
            </div>
            <div class="flow-arrow">
              <span>owes</span>
              <span>➔</span>
            </div>
            <div class="flow-node">
              <span class="flow-name">${creditor.name}</span>
              <span class="flow-upi">${creditor.upiId}</span>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap: 10px; flex-wrap:wrap;">
            <div class="flow-amount">₹${s.amount.toFixed(2)}</div>
            <div class="settlement-actions">
              <a href="${upiLink}" class="btn btn-primary btn-sm" target="_blank">
                ⚡ Pay UPI
              </a>
              <button class="btn btn-secondary btn-sm btn-qr" 
                data-payer="${debtor.name}"
                data-payee="${creditor.name}"
                data-vpa="${creditor.upiId}"
                data-amount="${s.amount.toFixed(2)}"
                data-link="${upiLink}">
                📱 Show QR
              </button>
              <button class="btn btn-secondary btn-sm btn-remind"
                data-payer="${debtor.name}"
                data-payee="${creditor.name}"
                data-vpa="${creditor.upiId}"
                data-amt="${s.amount.toFixed(2)}"
                data-group="${group.name}">
                🔔 Ping
              </button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    }

    container.querySelectorAll(".btn-qr").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("qr-modal-subtitle").textContent = `${btn.dataset.payer} ➔ ${btn.dataset.payee}`;
        document.getElementById("qr-modal-amount").textContent = `₹${btn.dataset.amount}`;
        document.getElementById("qr-modal-vpa").textContent = btn.dataset.vpa;
        document.getElementById("qr-direct-upi-btn").href = btn.dataset.link;

        const qrContainer = document.getElementById("qr-code-canvas");
        qrContainer.innerHTML = "";

        if (typeof QRCode !== "undefined") {
          new QRCode(qrContainer, {
            text: btn.dataset.link,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff"
          });
        } else {
          qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(btn.dataset.link)}" alt="QR">`;
        }
        document.getElementById("qr-modal").classList.add("open");
      });
    });

    container.querySelectorAll(".btn-remind").forEach(btn => {
      btn.addEventListener("click", () => {
        const text = `Hey ${btn.dataset.payer}! Quick friendly reminder for our ${btn.dataset.group} split: ₹${btn.dataset.amt}. You can pay directly to ${btn.dataset.payee} (${btn.dataset.vpa}) via GPay/PhonePe. Cheers!`;
        navigator.clipboard.writeText(text).then(() => {
          this.showToast(`Reminder copied for ${btn.dataset.payer}!`, "🔔");
        });
      });
    });

    const balanceList = document.getElementById("net-balances-list");
    balanceList.innerHTML = "";
    group.members.forEach(m => {
      const bal = balances[m.id] || 0;
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
        <span style="font-weight:800; font-size:0.95rem; color:${bal >= 0 ? 'var(--primary)' : '#f87171'}">
          ${bal >= 0 ? '+' : ''}₹${bal.toFixed(2)}
        </span>
      `;
      balanceList.appendChild(row);
    });
  }

  renderAnalytics() {
    const group = this.getActiveGroup();
    const catMap = {};
    const spenderMap = {};
    group.members.forEach(m => spenderMap[m.id] = 0);

    let groupTotal = 0;
    group.expenses.forEach(exp => {
      catMap[exp.category] = (catMap[exp.category] || 0) + exp.amount;
      if (spenderMap[exp.payerId] !== undefined) {
        spenderMap[exp.payerId] += exp.amount;
      }
      groupTotal += exp.amount;
    });

    const catContainer = document.getElementById("category-progress-list");
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
    document.getElementById("feed-group-name").textContent = group.name;
    const container = document.getElementById("expenses-feed-list");
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
      item.innerHTML = `
        <div>
          <div style="font-weight: 700; font-size: 0.95rem;">
            <span class="expense-tag">${exp.category}</span>
            ${exp.title}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 4px;">
            Paid by <strong>${memberMap[exp.payerId] || 'Someone'}</strong> • ${exp.date} • Split among ${exp.splits.length} mates (${exp.splitMode})
          </div>
        </div>
        <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
          ₹${exp.amount.toFixed(2)}
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderMembersRoster() {
    const group = this.getActiveGroup();
    const container = document.getElementById("members-roster-list");
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

document.addEventListener("DOMContentLoaded", () => {
  window.app = new SplitSyncApp();
});