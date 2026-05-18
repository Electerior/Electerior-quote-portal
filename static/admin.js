const token = new URLSearchParams(location.search).get("token");
let latestData = null;

loadAdmin();
setInterval(loadAdmin, 5000);

document.querySelector("#copyAllLinks")?.addEventListener("click", () => {
  if (!latestData) return;
  const base = `${location.origin}/vendor.html?token=`;
  const text = latestData.vendors
    .map((vendor) => `${vendor.company_name}${vendor.contact_name ? ` / ${vendor.contact_name}` : ""}: ${base}${vendor.token}`)
    .join("\n");
  navigator.clipboard.writeText(text);
  setRefreshStatus("전체 링크를 복사했습니다.");
});

async function loadAdmin() {
  const response = await fetch(`/api/request?token=${encodeURIComponent(token || "")}`);
  const data = await response.json();
  if (!response.ok) {
    document.querySelector("#title").textContent = "요청을 찾을 수 없습니다";
    document.querySelector("#summary").textContent = data.error || "";
    return;
  }

  latestData = data;
  document.querySelector("#title").textContent = data.request.project_name;
  document.querySelector("#summary").textContent = `마감일: ${data.request.due_date || "-"} · 부품 ${data.parts.length}개 · 업체 ${data.vendors.length}개`;
  renderVendorLinks(data.vendors);
  renderCompare(data.parts, data.vendors, data.quotes);
  renderNotifications(data.notifications);
  setRefreshStatus(`자동 갱신됨 · ${new Date().toLocaleTimeString("ko-KR")}`);
}

function renderVendorLinks(vendors) {
  const base = `${location.origin}/vendor.html?token=`;
  document.querySelector("#vendorLinks").innerHTML = vendors
    .map((vendor) => {
      const url = `${base}${vendor.token}`;
      return `
        <div class="item">
          <div class="item-title">
            <span>${escapeHtml(vendor.company_name)}</span>
            <span class="badge ${vendor.status === "submitted" ? "done" : ""}">
              ${vendor.status === "submitted" ? "제출 완료" : "대기"}
            </span>
          </div>
          <div class="muted">${escapeHtml(vendor.contact_name || "")} ${escapeHtml(vendor.contact_email || "")}</div>
          <div class="copy-row">
            <input readonly value="${escapeAttr(url)}" />
            <button type="button" onclick="copyText('${escapeAttr(url)}')">복사</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderCompare(parts, vendors, quotes) {
  const quoteMap = new Map();
  quotes.forEach((quote) => quoteMap.set(`${quote.part_id}:${quote.company_name}`, quote));

  const header = `
    <tr>
      <th>구분</th>
      <th>부품명</th>
      <th>사양</th>
      <th class="right">수량</th>
      ${vendors.map((vendor) => `<th>${escapeHtml(vendor.company_name)} 단가</th>`).join("")}
    </tr>
  `;

  const totals = Object.fromEntries(vendors.map((vendor) => [vendor.company_name, 0]));
  const rows = parts
    .map((part) => {
      vendors.forEach((vendor) => {
        const quote = quoteMap.get(`${part.id}:${vendor.company_name}`);
        totals[vendor.company_name] += Number(quote?.unit_price || 0) * Number(part.quantity || 1);
      });
      return `
        <tr>
          <td>${escapeHtml(part.category || "")}</td>
          <td>${escapeHtml(part.name)}</td>
          <td>${escapeHtml(part.spec || "")}</td>
          <td class="right">${escapeHtml(part.quantity)}</td>
          ${vendors.map((vendor) => priceCell(quoteMap.get(`${part.id}:${vendor.company_name}`)?.unit_price)).join("")}
        </tr>
      `;
    })
    .join("");

  const totalRow = `
    <tr class="total-row">
      <td colspan="4">총액</td>
      ${vendors.map((vendor) => `<td>${formatMoney(totals[vendor.company_name])}</td>`).join("")}
    </tr>
  `;

  document.querySelector("#compareTable").innerHTML = header + rows + totalRow;
}

function renderNotifications(notifications) {
  const target = document.querySelector("#notifications");
  if (!notifications.length) {
    target.innerHTML = '<p class="muted">아직 알림 기록이 없습니다.</p>';
    return;
  }
  target.innerHTML = notifications
    .map(
      (item) => `
        <div class="item">
          <div class="item-title">
            <span>${escapeHtml(item.subject)}</span>
            <span class="badge ${item.status === "sent" ? "done" : "warn"}">${escapeHtml(item.status)}</span>
          </div>
          <div class="muted">${escapeHtml(item.recipient || "")} · ${formatDate(item.created_at)}</div>
        </div>
      `
    )
    .join("");
}

function priceCell(value) {
  if (value === null || value === undefined || value === "") return "<td></td>";
  return `<td>${formatMoney(value)}</td>`;
}

function copyText(text) {
  navigator.clipboard.writeText(text);
  setRefreshStatus("링크를 복사했습니다.");
}

function setRefreshStatus(message) {
  const target = document.querySelector("#refreshStatus");
  if (target) target.textContent = message;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
