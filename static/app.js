const form = document.querySelector("#requestForm");
const result = document.querySelector("#result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.classList.remove("hidden");
  result.innerHTML = '<p class="muted">견적 요청을 만들고 있습니다.</p>';

  const response = await fetch("/api/requests", {
    method: "POST",
    body: new FormData(form),
  });
  const data = await response.json();

  if (!response.ok) {
    result.innerHTML = `<p class="badge warn">${escapeHtml(data.error || "오류가 발생했습니다.")}</p>`;
    return;
  }

  const allLinksText = data.vendorLinks
    .map((vendor) => `${vendor.company_name}${vendor.contact_name ? ` / ${vendor.contact_name}` : ""}: ${vendor.url}`)
    .join("\n");

  const links = data.vendorLinks
    .map(
      (vendor) => `
        <div class="item">
          <div class="item-title">
            <span>${escapeHtml(vendor.company_name)}</span>
            <span class="badge">업체 링크</span>
          </div>
          <div class="muted">${escapeHtml(vendor.contact_name || "")} ${escapeHtml(vendor.contact_email || "")}</div>
          <div class="copy-row">
            <input readonly value="${escapeAttr(vendor.url)}" />
            <button type="button" onclick="copyText('${escapeAttr(vendor.url)}')">복사</button>
          </div>
        </div>
      `
    )
    .join("");

  result.innerHTML = `
    <div class="section-head">
      <div>
        <h2>생성 완료</h2>
        <p>${data.partCount}개 부품을 읽었습니다. 아래 링크를 업체에 전달하면 업체는 가격만 입력하면 됩니다.</p>
      </div>
      <button class="ghost" type="button" onclick="copyText('${escapeAttr(allLinksText)}')">전체 링크 복사</button>
    </div>
    <p><a class="ghost" href="${escapeAttr(data.adminUrl)}">관리자 비교 화면 열기</a></p>
    <div class="list">${links}</div>
  `;
});

function copyText(text) {
  navigator.clipboard.writeText(text);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;").replace(/\n/g, "&#10;");
}
