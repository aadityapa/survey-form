// DOM elements
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const progressBar = document.getElementById("progressBar");
const stepsUI = document.querySelectorAll(".progress-step");

const searchEl = document.getElementById("search");
const resultsEl = document.getElementById("results");
const msgEl = document.getElementById("msg");

const fields = {
  srn: document.getElementById("srn"),
  employeeName: document.getElementById("employeeName"),
  manager: document.getElementById("manager"),
  designation: document.getElementById("designation"),
  department: document.getElementById("department"),
  managerVerified: document.getElementById("managerVerified"),
  designationVerified: document.getElementById("designationVerified"),
  departmentVerified: document.getElementById("departmentVerified"),
  choice: document.getElementById("choice"),
  comments: document.getElementById("comments")
};

// Show step & update progress
function showStep(step) {
  [step1, step2, step3].forEach(s => s.classList.remove("active"));
  step.classList.add("active");

  let currentIndex = 1;
  if (step === step1) { progressBar.style.width = "33%"; currentIndex = 1; }
  else if (step === step2) { progressBar.style.width = "66%"; currentIndex = 2; }
  else { progressBar.style.width = "100%"; currentIndex = 3; }

  stepsUI.forEach((el, idx) => {
    if (idx < currentIndex - 1) {
      el.classList.add("completed");
      el.innerHTML = "✔";
    } else {
      el.classList.remove("completed");
      el.innerHTML = idx + 1;
    }
    el.classList.toggle("active", idx === currentIndex - 1);
  });
}

// Navigation
document.getElementById("next1").addEventListener("click", () => {
  if (!fields.employeeName.value) { msgEl.textContent = "Select employee first"; return; }
  msgEl.textContent = "";
  showStep(step2);
});
document.getElementById("back2").addEventListener("click", () => showStep(step1));
document.getElementById("next2").addEventListener("click", () => {
  if (!fields.managerVerified.checked || !fields.designationVerified.checked || !fields.departmentVerified.checked) {
    msgEl.textContent = "Please verify all fields"; return;
  }
  msgEl.textContent = "";
  showStep(step3);
});
document.getElementById("back3").addEventListener("click", () => showStep(step2));

// Search
let debounceTimer;
searchEl.addEventListener("input", () => {
  const q = searchEl.value.trim();
  if (q.length < 2) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; return; }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/employees?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      renderResults(data);
    } catch (err) { console.error(err); }
  }, 250);
});

function renderResults(items) {
  if (!items || !items.length) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; return; }
  resultsEl.innerHTML = items.map(x => `
    <div data-srn="${x.srn || ''}" data-name="${x.name || ''}" data-manager="${x.manager || ''}" data-designation="${x.designation || ''}" data-department="${x.department || ''}">
      ${x.name} (${x.department || ''} - ${x.designation || ''})
    </div>
  `).join("");
  resultsEl.style.display = "block";
  Array.from(resultsEl.children).forEach(div => {
    div.addEventListener("click", () => {
      fields.srn.value = div.dataset.srn;
      fields.employeeName.value = div.dataset.name;
      fields.manager.value = div.dataset.manager;
      fields.designation.value = div.dataset.designation;
      fields.department.value = div.dataset.department;
      resultsEl.style.display = "none"; resultsEl.innerHTML = "";
      searchEl.value = div.dataset.name;
      msgEl.textContent = "";
    });
  });
}

/* -------- Step 3 Logic -------- */
document.querySelectorAll(".platformCheck").forEach(chk => {
  chk.addEventListener("change", function () {
    const desc = document.querySelector(`.platform-desc[data-platform="${this.value}"]`);
    if (this.checked) {
      desc.style.display = "block";
      desc.required = true;
    } else {
      desc.style.display = "none";
      desc.required = false;
      desc.value = "";
    }
  });
});

// Submit
document.getElementById("submitBtn").addEventListener("click", async () => {
  msgEl.textContent = "";

  const workingMode = document.querySelector("input[name='workingMode']:checked")?.value;
  const userType = document.querySelector("input[name='userType']:checked")?.value;
  const device = document.querySelector("input[name='device']:checked")?.value;

  if (!workingMode || !userType || !device) {
    msgEl.textContent = "Please complete all Step 3 selections";
    return;
  }

  const choiceObj = {
    workingMode,
    userType,
    device,
    clientAccess: [...document.querySelectorAll("input[name='clientAccess']:checked")].map(el => el.value),
    emailAccess: [...document.querySelectorAll("input[name='emailAccess']:checked")].map(el => el.value),
    platformAccess: [...document.querySelectorAll(".platformCheck:checked")].map(el => {
      const val = el.value;
      const desc = document.querySelector(`.platform-desc[data-platform="${val}"]`).value;
      return { name: val, description: desc };
    }),
    pendriveAccess: document.querySelector("input[name='pendriveAccess']:checked")?.value
  };

  const payload = {
    employeeSrn: fields.srn.value ? Number(fields.srn.value) : undefined,
    employeeName: fields.employeeName.value,
    manager: fields.manager.value,
    designation: fields.designation.value,
    department: fields.department.value,
    managerVerified: fields.managerVerified.checked,
    designationVerified: fields.designationVerified.checked,
    departmentVerified: fields.departmentVerified.checked,
    choice: JSON.stringify(choiceObj),
    comments: fields.comments.value
  };

  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const out = await res.json();
    if (res.ok) {
      // ✅ Open thank-you page in a new tab
      const url = `/thankyou.html?id=${out.submissionId}`;
      window.open(url, "_blank");

      // Reset form
      searchEl.value = "";
      Object.values(fields).forEach(f => { if (f.tagName === "INPUT" || f.tagName === "TEXTAREA") f.value = ""; });
      document.querySelectorAll("input[type=checkbox],input[type=radio]").forEach(c => c.checked = false);
      document.querySelectorAll(".platform-desc").forEach(d => { d.value = ""; d.style.display = "none"; });
      showStep(step1);
    } else {
      msgEl.textContent = out.error || "Submit failed";
    }
  } catch (err) {
    msgEl.textContent = "Submit failed: " + err.message;
  }
});
