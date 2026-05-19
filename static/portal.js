const loginForm = document.querySelector("#vendorLoginForm");
const loginPanel = document.querySelector("#loginPanel");
const projectPanel = document.querySelector("#projectPanel");
const projectList = document.querySelector("#vendorProjectList");
const loginSummary = document.querySelector("#loginSummary");
const logoutButton = document.querySelector("#logoutButton");

const savedEmail = localStorage.getItem("quotePortalVendorEmail");
if (savedEmail) {
  loginForm.elements.email.value = savedEmail;
  loadVendorProjects(savedEmail);
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = loginForm.elements.email.value.trim();
  localStorage.setItem("quotePortalVendorEmail", email);
  loadVendorProjects(email);
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("quotePortalVendorEmail");
  projectPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  projectList.innerHTML = "";
});

async function loadVendorProjects(email) {
  loginPanel.classList.add("hidden");
  projectPanel.classList.remove("hidden");
  loginSummary.textContent = `${email} 계정으로 조회 중입니다.`;
  projectList.innerHTML = '<p class="muted">프로젝트를 불러오고 있습니다.</p>';

  const response = await fetch(`/api/vendor-projects?email=${encodeURIComponent(email)}`);
  const data = await response.json();
  if (!response.ok) {
    projectList.innerHTML = `<p class="badge warn">${escapeHtml(data.error || "조회 중 오류가 발생했습니다.")}</p>`;
    return;
  }

  loginSummary.textContent = `${email} 계정에 연결된 프로젝트 ${data.projects.length}건`;
  if (!data.projects.length) {
    projectList.innerHTML = '<p class="muted">현재 연결된 견적 요청이 없습니다.</p>';
    return;
  }

  projectList.innerHTML = data.projects
    .map(
      (project) => `
        <div class="item project-item">
          <div class="item-title">
            <span>${escapeHtml(project.project_name)}</span>
            <span class="badge ${project.status === "submitted" ? "done" : project.status === "draft" ? "warn" : ""}">
              ${statusText(project.status)}
            </span>
          </div>
          <div class="project-meta">
            <span>업체명: ${escapeHtml(project.company_name)}</span>
            <span>마감일: ${escapeHtml(project.due_date || "-")}</span>
            <span>품목: ${project.part_count}개</span>
            <span>견적 합계: ${formatMoney(project.quote_total)}</span>
          </div>
          <div class="project-actions">
            <a class="ghost" href="/vendor.html?token=${escapeAttr(project.vendor_token)}">견적 입력/확인</a>
          </div>
        </div>
      `
    )
    .join("");
}

function statusText(status) {
  if (status === "submitted") return "최종 제출 완료";
  if (status === "draft") return "임시 저장";
  return "작성 전";
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
