loadRequests();

async function loadRequests() {
  const list = document.querySelector("#requestList");
  const response = await fetch("/api/requests");
  const data = await response.json();

  if (!data.requests.length) {
    list.innerHTML = '<p class="muted">아직 생성된 견적 요청이 없습니다.</p>';
    return;
  }

  list.innerHTML = data.requests
    .map(
      (request) => `
        <div class="item">
          <div class="item-title">
            <span>${escapeHtml(request.project_name)}</span>
            <span class="badge ${request.submitted_count === request.vendor_count ? "done" : ""}">
              ${request.submitted_count}/${request.vendor_count} 제출
            </span>
          </div>
          <div class="muted">마감일: ${escapeHtml(request.due_date || "-")} · 생성일: ${formatDate(request.created_at)}</div>
          <p><a class="ghost" href="/admin.html?token=${escapeAttr(request.token)}">관리자 화면</a></p>
        </div>
      `
    )
    .join("");
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
