const token = new URLSearchParams(location.search).get("token");
let currentParts = [];
let currentLines = [];
let saveTimer = null;
let isSaving = false;
let needsSaveAgain = false;

loadVendor();

document.querySelector("#finalSubmitButton").addEventListener("click", () => submitPrices(true));

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
  document.querySelector("#vendorCard").innerHTML = `
    <div><strong>업체명</strong><span>${escapeHtml(data.vendor.company_name)}</span></div>
    <div><strong>담당자</strong><span>${escapeHtml(data.vendor.contact_name || "-")}</span></div>
    <div><strong>이메일</strong><span>${escapeHtml(data.vendor.contact_email || "-")}</span></div>
    <div>
      <strong>상태</strong>
      <span class="badge ${data.vendor.status === "submitted" ? "done" : ""}">
        ${statusText(data.vendor.status)}
      </span>
    </div>
  `;
  renderTable();
  if (data.vendor.status === "submitted") {
    setStatus(`최종 제출 완료 · ${new Date(data.vendor.submitted_at).toLocaleString("ko-KR")}`);
    document.querySelector("#finalSubmitButton").textContent = "제출 완료";
  }
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
      <th class="right">합계</th>
    </tr>
    ${currentParts
      .map((part) => {
        const line = lineMap.get(part.id) || {};
        return `
          <tr data-part-id="${part.id}" data-quantity="${part.quantity || 1}">
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
            <td class="right line-total">0</td>
          </tr>
        `;
      })
      .join("")}
  `;

  document.querySelectorAll('[name="unitPrice"]').forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatInputPrice(input.value);
      updateLineTotals();
      scheduleAutoSave();
    });
    input.addEventListener("blur", () => submitPrices(false));
  });
  updateLineTotals();
}

function scheduleAutoSave() {
  setStatus("입력 중입니다.");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => submitPrices(false), 800);
}

async function submitPrices(finalSubmit) {
  clearTimeout(saveTimer);
  if (isSaving) {
    needsSaveAgain = true;
    return;
  }

  const lines = collectLines();
  if (!lines.some((line) => line.unitPrice.trim())) {
    setStatus("단가를 입력하면 임시 저장됩니다.");
    return;
  }

  if (finalSubmit && !lines.every((line) => line.unitPrice.trim())) {
    setStatus("최종 제출 전 모든 품목의 단가를 입력해주세요.", true);
    return;
  }

  isSaving = true;
  needsSaveAgain = false;
  setStatus(finalSubmit ? "최종 제출 중입니다." : "임시 저장 중입니다.");
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, lines, finalSubmit }),
  });
  const data = await response.json();
  isSaving = false;

  if (!response.ok) {
    setStatus(data.error || "저장 중 오류가 발생했습니다.", true);
    return;
  }

  if (data.status === "submitted") {
    setStatus(`최종 제출 완료 · ${new Date(data.submittedAt).toLocaleString("ko-KR")}`);
    document.querySelector("#finalSubmitButton").textContent = "제출 완료";
  } else {
    setStatus("임시 저장 완료");
  }
  if (needsSaveAgain) scheduleAutoSave();
}

function collectLines() {
  return [...document.querySelectorAll("#quoteTable tr[data-part-id]")].map((row) => ({
    partId: Number(row.dataset.partId),
    unitPrice: row.querySelector('[name="unitPrice"]').value,
  }));
}

function updateLineTotals() {
  document.querySelectorAll("#quoteTable tr[data-part-id]").forEach((row) => {
    const quantity = Number(row.dataset.quantity || 1);
    const unitPrice = parseNumber(row.querySelector('[name="unitPrice"]').value);
    row.querySelector(".line-total").textContent = formatMoney(quantity * unitPrice);
  });
}

function statusText(status) {
  if (status === "submitted") return "최종 제출 완료";
  if (status === "draft") return "임시 저장";
  return "작성 전";
}

function parseNumber(value) {
  return Number(String(value).replace(/[^\d.]/g, ""));
}

function formatInputPrice(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("ko-KR");
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
