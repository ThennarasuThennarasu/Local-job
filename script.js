const backendURL = "http://127.0.0.1:5000";

// 🧭 Get employer_id or worker_id after login
const userId = localStorage.getItem("user_id");
const userRole = localStorage.getItem("user_role");

// 🔹 Logout
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// 🟢 Employer: Post a Job
async function postJob() {
  const title = document.getElementById("jobTitle").value;
  const description = document.getElementById("jobDescription").value;
  const location = document.getElementById("jobLocation").value;

  const res = await fetch(`${backendURL}/post_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employer_id: userId,
      title,
      description,
      location
    })
  });

  const data = await res.json();
  alert(data.message);
  loadJobs();
}

// 🟢 Employer: Load Posted Jobs
async function loadJobs() {
  const res = await fetch(`${backendURL}/employer_notifications/${userId}`);
  const jobs = await res.json();

  const jobList = document.getElementById("jobList");
  const notifications = document.getElementById("notifications");

  jobList.innerHTML = "";
  notifications.innerHTML = "";

  jobs.forEach(job => {
    const jobItem = document.createElement("li");
    jobItem.innerHTML = `
      <b>${job.title}</b> - ${job.status}
      ${job.worker_email ? `<br>👷 Worker: ${job.worker_email}` : ""}
    `;
    jobList.appendChild(jobItem);

    if (job.status === "Accepted") {
      const notifyItem = document.createElement("li");
      notifyItem.innerHTML = `✅ <b>${job.title}</b> accepted by ${job.worker_email}`;
      notifications.appendChild(notifyItem);
    }
  });
}

// 🔧 Worker: Load Available Jobs
async function loadAvailableJobs() {
  const res = await fetch(`${backendURL}/get_jobs`);
  const jobs = await res.json();
  const jobList = document.getElementById("availableJobs");
  jobList.innerHTML = "";

  jobs.forEach(job => {
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${job.title}</b> - ${job.location}
      <p>${job.description}</p>
      <button onclick="respondJob(${job.id}, 'Accepted')">Accept</button>
      <button onclick="respondJob(${job.id}, 'Rejected')">Reject</button>
    `;
    jobList.appendChild(li);
  });
}

// 🧰 Worker: Respond to Job
async function respondJob(jobId, response) {
  const res = await fetch(`${backendURL}/respond_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: jobId,
      worker_id: userId,
      response
    })
  });

  const data = await res.json();
  alert(data.message);
  loadAvailableJobs();
}

// 🚀 Auto-load dashboard data
window.onload = function () {
  if (userRole === "Employer") loadJobs();
  else if (userRole === "Worker") loadAvailableJobs();
};

// ===== LOCAL STORAGE HELPERS =====
function getJobs() {
  return JSON.parse(localStorage.getItem("jobs")) || [];
}

function saveJobs(jobs) {
  localStorage.setItem("jobs", JSON.stringify(jobs));
}

// ===== EMPLOYER FUNCTIONS =====
function postJob() {
  const title = document.getElementById("jobTitle")?.value.trim();
  const description = document.getElementById("jobDescription")?.value.trim();
  const location = document.getElementById("jobLocation")?.value.trim();

  if (!title || !description || !location) {
    alert("Please fill all fields!");
    return;
  }

  const jobs = getJobs();
  const newJob = {
    id: Date.now(),
    title,
    description,
    location,
    status: "Open",
    worker: null,
    workerLocation: null
  };
  jobs.push(newJob);
  saveJobs(jobs);

  alert("✅ Job Posted Successfully!");
  document.getElementById("jobTitle").value = "";
  document.getElementById("jobDescription").value = "";
  document.getElementById("jobLocation").value = "";
  loadEmployerJobs();
}

function loadEmployerJobs() {
  const jobs = getJobs();  // your stored jobs
  const jobList = document.getElementById("jobList");
  const notifications = document.getElementById("notifications");
  if (!jobList || !notifications) return;

  jobList.innerHTML = "";
  notifications.innerHTML = "";

  jobs.forEach((job) => {

    // -------------------------
    // TIME AGO CALCULATION
    // -------------------------
    const postedAgo = timeAgo(job.created_at);

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${job.title}</strong> - ${job.location}<br>
      <small>${job.description}</small><br>

      <span style="color:#007bff; font-size:12px;">
        ⏱ Posted: ${postedAgo}
      </span><br>

      <b>Status:</b> ${job.status}
      ${job.worker ? `<br><b>Worker:</b> ${job.worker}` : ""}
      ${
        job.workerLocation
          ? `<br>📍 Worker Location: ${job.workerLocation.lat.toFixed(4)}, ${job.workerLocation.lng.toFixed(4)}`
          : ""
      }
    `;

    jobList.appendChild(li);

    // -------------------------
    // Notifications
    // -------------------------
    if (job.status === "Accepted") {
      const note = document.createElement("li");
      note.textContent = `📢 ${job.title} accepted by ${job.worker}`;
      notifications.appendChild(note);
    } 
    else if (job.status === "Completed") {
      const note = document.createElement("li");
      note.textContent = `✅ ${job.title} completed by ${job.worker}`;
      notifications.appendChild(note);
    }
  });
}


function timeAgo(createdTime) {
  if (!createdTime) return "Just now";

  // MySQL format → "2025-11-29 12:45:10"
  const date = new Date(createdTime.replace(" ", "T"));

  if (isNaN(date.getTime())) return "Just now";

  const now = new Date();
  const diffMs = now - date;

  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);

  if (sec < 60) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (hrs < 24) return `${hrs} hours ago`;
  return `${days} days ago`;
}


// ===== WORKER FUNCTIONS =====
function loadAvailableJobs() {
  const jobs = getJobs();
  const availableList = document.getElementById("availableJobs");
  const acceptedList = document.getElementById("acceptedJobs");
  if (!availableList || !acceptedList) return;

  availableList.innerHTML = "";
  acceptedList.innerHTML = "";

  jobs.forEach((job) => {
    if (job.status === "Open") {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${job.title}</strong> - ${job.location}<br>
        <small>${job.description}</small><br>
        <button onclick="acceptJob(${job.id})">Accept</button>
        <button onclick="rejectJob(${job.id})">Reject</button>
      `;
      availableList.appendChild(li);
    } else if (job.status === "Accepted" && job.worker === "Worker1") {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${job.title}</strong> - ${job.location}<br>
        <small>${job.description}</small><br>
        <b>Status:</b> Accepted<br>
        <button onclick="markCompleted(${job.id})">Mark as Completed</button>
      `;
      acceptedList.appendChild(li);
    } else if (job.status === "Completed" && job.worker === "Worker1") {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${job.title}</strong> - ${job.location}<br>
        <b>Status:</b> ✅ Completed
      `;
      acceptedList.appendChild(li);
    }
  });
}

function acceptJob(id) {
  const jobs = getJobs();
  const job = jobs.find((j) => j.id === id);
  if (job) {
    job.status = "Accepted";
    job.worker = "Worker1";
    saveJobs(jobs);
    alert("✅ Job Accepted!");

    // Start tracking worker location
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition((position) => {
        const jobs = getJobs();
        const currentJob = jobs.find((j) => j.id === id);
        if (currentJob) {
          currentJob.workerLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          saveJobs(jobs);
        }
      });
    } else {
      alert("Geolocation not supported in your browser.");
    }

    loadAvailableJobs();
  }
}

function markCompleted(id) {
  const jobs = getJobs();
  const job = jobs.find((j) => j.id === id);
  if (job) {
    job.status = "Completed";
    saveJobs(jobs);
    alert("🎉 Job marked as completed!");
    loadAvailableJobs();
  }
}

function rejectJob(id) {
  alert("❌ Job Rejected!");
}

// ===== LOGOUT =====
function logout() {
  window.location.href = "index.html";
}

// ===== AUTO LOAD =====
document.addEventListener("DOMContentLoaded", () => {
  loadEmployerJobs();
  loadAvailableJobs();

  // Employer page live refresh every 5 seconds to see updated worker location
  if (document.title.includes("Employer Dashboard")) {
    setInterval(loadEmployerJobs, 5000);
  }
});
// Example: show first worker location on map
if (job.workerLocation && window.google) {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: job.workerLocation,
  });
  new google.maps.Marker({
    position: job.workerLocation,
    map: map,
    title: job.worker
  });
}











let map, marker;
let workerId = 2; // example: replace with actual accepted worker ID

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: { lat: 13.0827, lng: 80.2707 } // default: Chennai
  });
  marker = new google.maps.Marker({
    map: map,
    position: { lat: 13.0827, lng: 80.2707 },
    title: "Worker"
  });
}

function updateWorkerLocation() {
  fetch(`http://127.0.0.1:5000/get_worker_location/${workerId}`)
    .then(res => res.json())
    .then(data => {
      if (data.latitude && data.longitude) {
        const newPos = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) };
        marker.setPosition(newPos);
        map.setCenter(newPos);
      }
    });
}

window.onload = function() {
  initMap();
  setInterval(updateWorkerLocation, 10000); // update every 10 sec
};




// Run this when worker accepts a job
function startWorkerLiveTracking(workerId) {
  if (navigator.geolocation) {
    setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetch("http://127.0.0.1:5000/update_location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            worker_id: workerId,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          })
        });
      });
    }, 5000); // every 5 seconds
  } else {
    alert("Geolocation not supported in this browser");
  }
  
}

startWorkerLiveTracking(workerId);



const currentPos = marker.getPosition();
if (currentPos) {
  const stepLat = (newPos.lat - currentPos.lat()) / 20;
  const stepLng = (newPos.lng - currentPos.lng()) / 20;
  let step = 0;
  const smoothMove = setInterval(() => {
    step++;
    marker.setPosition({
      lat: currentPos.lat() + stepLat * step,
      lng: currentPos.lng() + stepLng * step,
    });
    if (step === 20) clearInterval(smoothMove);
  }, 100); // smooth transition
}





function showCompletedJobs() {
  fetch('/api/getCompletedJobs')
    .then(res => res.json())
    .then(jobs => {
      const div = document.getElementById('completedJobs');
      div.innerHTML = jobs.map(job => `
        <div class="jobCard">
          <h4>${job.title}</h4>
          <p>${job.worker_name}</p>
          <label>Rating (1–5):</label>
          <input type="number" id="rating-${job.id}" min="1" max="5">
          <textarea id="feedback-${job.id}" placeholder="Write feedback..."></textarea>
          <button onclick="submitRating(${job.id}, ${job.worker_id})">Submit</button>
        </div>
      `).join('');
    });
}

function submitRating(jobId, workerId) {
  const rating = document.getElementById(`rating-${jobId}`).value;
  const feedback = document.getElementById(`feedback-${jobId}`).value;

  fetch('/api/submitRating', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ jobId, workerId, rating, feedback })
  })
  .then(res => res.json())
  .then(data => {
    alert('Feedback submitted successfully!');
    showCompletedJobs();
  });
}




function loadRatings() {
  fetch('/api/getMyRatings')
    .then(res => res.json())
    .then(ratings => {
      const ul = document.getElementById('ratings');
      ul.innerHTML = ratings.map(r => `
        <li>
          <strong>${r.employer_name}</strong>: ${r.rating}⭐ <br>
          "${r.feedback}"
        </li>
      `).join('');
    });
}




// SHOW EMPLOYER NAME 

window.onload = function () {
  const name = localStorage.getItem("employerName");
  if (name) {
    document.getElementById("empNameDisplay").innerHTML = `👷 ${name} - Employer Dashboard`;
  }
};



body: JSON.stringify({
  employer_id: userId,
  employer_name: localStorage.getItem("employerName"),
  job_title: title,
  job_description: description,
  job_location: location
})
