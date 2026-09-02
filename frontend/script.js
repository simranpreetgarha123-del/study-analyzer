const isLocal = window.location.hostname === "localhost" || 
                window.location.hostname === "127.0.0.1" || 
                window.location.hostname === "" || 
                window.location.protocol === "file:";
const BASE_URL = isLocal 
    ? "http://127.0.0.1:8000" 
    : "https://study-time-backend.onrender.com";
const API_URL = BASE_URL.replace(/\/+$/, "");

function initTypewriter() {
    const text = "Smart Study Tracker";
    const container = document.getElementById("typedTitle");
    if (!container) return;
    
    container.textContent = "";
    let index = 0;
    
    function typeChar() {
        if (index < text.length) {
            container.textContent += text.charAt(index);
            index++;
            setTimeout(typeChar, 85);
        }
    }
    typeChar();
}

document.addEventListener("DOMContentLoaded", () => {
    initTypewriter();
    
    const dateInput = document.getElementById("selectedDate");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }
    loadDailyData();
});

async function addRecord() {
    const date = document.getElementById("selectedDate").value;
    const category = document.getElementById("category").value.trim();
    const description = document.getElementById("description").value.trim();
    const hours = document.getElementById("hours").value;

    if (!date || !category || !description || !hours) {
        alert("Please fill all fields");
        return;
    }

    if (parseFloat(hours) <= 0) {
        alert("Study hours must be greater than 0");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/records`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                date: date,
                category: category,
                description: description,
                hours: parseFloat(hours)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.detail || "Error adding study session");
            return;
        }

        alert(data.message);

        document.getElementById("category").value = "";
        document.getElementById("description").value = "";
        document.getElementById("hours").value = "";

        await loadDailyData();
    } catch (error) {
        console.error(error);
        alert("Unable to connect to backend");
    }
}

async function loadDailyData() {
    const dateInput = document.getElementById("selectedDate");
    const goalInput = document.getElementById("dailyGoal");
    
    if (!dateInput || !goalInput) return;
    
    const date = dateInput.value;
    const goal = parseFloat(goalInput.value);

    if (!date) return;

    if (!goal || goal <= 0) {
        alert("Please enter a valid daily goal");
        return;
    }

    await getRecords(date);
    await getStats(date, goal);
}

async function getRecords(date) {
    try {
        const response = await fetch(`${API_URL}/records?date=${date}`);
        const records = await response.json();
        const recordsContainer = document.getElementById("records");

        recordsContainer.innerHTML = "";

        if (!records || records.length === 0) {
            recordsContainer.innerHTML = `
                <p class="empty-message">No study sessions added for this day.</p>
            `;
            return;
        }

        records.forEach(record => {
            recordsContainer.innerHTML += `
                <div class="record">
                    <div class="record-content">
                        <h3>${record.category}</h3>
                        <p>${record.description}</p>
                        <strong>${record.hours} Hours</strong>
                    </div>
                    <button class="delete-btn" onclick="deleteRecord('${record._id}')">Delete</button>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error getting records:", error);
    }
}

async function deleteRecord(id) {
    const confirmDelete = confirm("Are you sure you want to delete this study session?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/records/${id}`, {
            method: "DELETE"
        });

        const data = await response.json();
        alert(data.message);
        await loadDailyData();
    } catch (error) {
        console.error(error);
        alert("Error deleting study session");
    }
}

async function getStats(date, goal) {
    try {
        const response = await fetch(`${API_URL}/stats?date=${date}&goal=${goal}`);
        const stats = await response.json();

        document.getElementById("goal").innerText = stats.daily_goal + " Hours";
        document.getElementById("studied").innerText = stats.studied + " Hours";
        document.getElementById("remaining").innerText = stats.remaining + " Hours";
        document.getElementById("productivity").innerText = stats.productivity + "%";
        document.getElementById("status").innerText = stats.status;
        document.getElementById("doingGood").innerText = stats.doing_good;
        document.getElementById("improvement").innerText = stats.improvement;
        document.getElementById("consistency").innerText = stats.consistency;
        document.getElementById("intensity").innerText = stats.intensity;
        document.getElementById("pattern").innerText = stats.pattern;
        document.getElementById("focusBalance").innerText = stats.focus_balance;
    } catch (error) {
        console.error("Error getting statistics:", error);
    }
}
