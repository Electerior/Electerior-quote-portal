const token = new URLSearchParams(location.search).get("token");
let currentParts = [];
let currentLines = [];
let saveTimer = null;
let isSaving = false;
let needsSaveAgain = false;

loadVendor();

async function loadVendor() {
  const response = await fetch(`/api/vendor?token=${encodeURIComponent(token || "")}`);
  const data = await response.json();
  if (!response.ok) {
    document.querySelector("#title").textContent = "견적 링크를 찾을 수 없습니다";
    document.querySelector("#summary").textContent = data.error || "";
    document.querySelector("#quoteForm").classList.add("hidden");
    return;
  }

  currentParts = data.parts;
  currentLines = data.lines;
  document.querySelector("#title").textContent = `${data.vendor.company_name} 견적 단가 입력`;
  document.querySelector("#summary").textContent = `${data.request.project_name} · 마감일: ${data.request.due_date || "-"}`;
  renderTable();
}

function renderTable() {
  const lineMap = new Map(currentLines.map((line) => [line.part_id, line]));
  document.querySelector("#quoteTable").innerHTML = `
    <tr>
      <th>구분</th>
      <th>부품명</th>
      <th>사양</th>
      <th>수량</th>
      <th>단가</th>
    </tr>
    ${currentParts
      .map((part) => {
        const line = lineMap.get(part.id) || {};
        return `
          <tr data-part-id="${part.id}">
            <td>${escapeHtml(part.category || "")}</td>
            <td>${escapeHtml(part.name)}</td>
            <td>${escapeHtml(part.spec || "")}</td>
            <td>${escapeHtml(part.quantity)} ${escapeHtml(part.unit || "")}</td>
            <td>
              <input
                class="price-input"
                name="unitPrice"
                inputmode="numeric"
                placeholder="숫자만 입력"
                value="${escapeAttr(formatInputPrice(line.unit_price || ""))}"
              />
            </td>
          </tr>
        `;
      })
      .join("")}
  `;

  document.querySelectorAll('[name="unitPrice"]').forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatInputPrice(input.value);
      scheduleAutoSubmit();
    });
    input.addEventListener("blur", () => submitPrices());
  });
}

function scheduleAutoSubmit() {
  setStatus("입력 중입니다.");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => submitPrices(), 800);
}

async function submitPrices() {
  clearTimeout(saveTimer);
  if (isSaving) {
    needsSaveAgain = true;
    return;
  }

  const lines = [...document.querySelectorAll("#quoteTable tr[data-part-id]")].map((row) => ({
    partId: Number(row.dataset.partId),
    unitPrice: row.querySelector('[name="unitPrice"]').value,
  }));

  if (!lines.some((line) => line.unitPrice.trim())) {
    setStatus("가격을 입력하면 자동으로 제출됩니다.");
    return;
  }

  isSaving = true;
  needsSaveAgain = false;
  setStatus("자동 제출 중입니다.");
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, lines }),
  });
  const data = await response.json();
  isSaving = false;

  if (!response.ok) {
    setStatus(data.error || "제출 중 오류가 발생했습니다.", true);
    return;
  }

  setStatus(`제출 완료 · ${new Date(data.submittedAt).toLocaleString("ko-KR")}`);
  if (needsSaveAgain) scheduleAutoSubmit();
}

function formatInputPrice(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setStatus(message, isError = false) {
  const target = document.querySelector("#saveStatus");
  target.textContent = message;
  target.classList.toggle("status-error", isError);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
