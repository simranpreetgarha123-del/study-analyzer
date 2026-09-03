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

        document.getElementById("status").innerText = stats.status;
        document.getElementById("doingGood").innerText = stats.doing_good;
        document.getElementById("improvement").innerText = stats.improvement;

        renderCharts(stats);
    } catch (error) {
        console.error("Error getting statistics:", error);
    }
}

let chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        chartInstances[id] = null;
    }
}

function scoreFromLabel(label) {
    const map = {
        "Excellent": 5, "Good": 4, "Average": 3, "Low": 2, "Very Low": 1,
        "Very Long Sessions": 5, "Long Sessions": 4, "Moderate Sessions": 3,
        "Short Sessions": 2, "Very Short Sessions": 1,
        "Multiple Topics": 5, "Varied Topics": 4, "Some Variety": 3,
        "Focused on One Area": 2, "Single Topic": 1,
        "Consistent Pattern": 5, "Need More Sessions": 3, "Irregular Pattern": 2,
        "No Pattern": 1
    };
    for (const key in map) {
        if (label && label.includes(key)) return map[key];
    }
    return 2;
}

function renderCharts(stats) {
    const navy = "#002b49";
    const gold = "#d9a74a";
    const cream = "#f7f4ec";
    const teal = "#1a7f8e";
    const rose = "#c0392b";
    const green = "#27ae60";

    const studied = parseFloat(stats.studied) || 0;
    const goal = parseFloat(stats.daily_goal) || 1;
    const remaining = parseFloat(stats.remaining) || 0;
    const productivity = parseFloat(stats.productivity) || 0;

    destroyChart("progressChart");
    chartInstances["progressChart"] = new Chart(
        document.getElementById("progressChart"),
        {
            type: "doughnut",
            data: {
                labels: ["Studied", "Remaining"],
                datasets: [{
                    data: [studied, Math.max(remaining, 0)],
                    backgroundColor: [gold, "#e8e1d1"],
                    borderColor: [navy, "#ccc"],
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                cutout: "70%",
                plugins: {
                    legend: { position: "bottom", labels: { color: navy, font: { family: "Plus Jakarta Sans", weight: "700" }, padding: 16 } },
                    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} hrs` } }
                }
            }
        }
    );

    destroyChart("productivityChart");
    chartInstances["productivityChart"] = new Chart(
        document.getElementById("productivityChart"),
        {
            type: "bar",
            data: {
                labels: ["Productivity", "Remaining"],
                datasets: [{
                    label: "Score (%)",
                    data: [productivity, Math.max(100 - productivity, 0)],
                    backgroundColor: [navy, "#e8e1d1"],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: "y",
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x.toFixed(1)}%` } }
                },
                scales: {
                    x: {
                        max: 100,
                        grid: { color: "rgba(0,43,73,0.06)" },
                        ticks: { color: navy, font: { family: "Plus Jakarta Sans" }, callback: (v) => v + "%" }
                    },
                    y: { grid: { display: false }, ticks: { color: navy, font: { family: "Plus Jakarta Sans", weight: "700" } } }
                }
            }
        }
    );

    destroyChart("insightsChart");
    chartInstances["insightsChart"] = new Chart(
        document.getElementById("insightsChart"),
        {
            type: "polarArea",
            data: {
                labels: ["Consistency", "Intensity", "Pattern", "Focus Balance"],
                datasets: [{
                    data: [
                        scoreFromLabel(stats.consistency),
                        scoreFromLabel(stats.intensity),
                        scoreFromLabel(stats.pattern),
                        scoreFromLabel(stats.focus_balance)
                    ],
                    backgroundColor: [
                        "rgba(0, 43, 73, 0.75)",
                        "rgba(217, 167, 74, 0.75)",
                        "rgba(26, 127, 142, 0.75)",
                        "rgba(39, 174, 96, 0.75)"
                    ],
                    borderWidth: 1,
                    borderColor: "#fff"
                }]
            },
            options: {
                scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, display: false }, grid: { color: "rgba(0,43,73,0.1)" } } },
                plugins: {
                    legend: { position: "bottom", labels: { color: navy, font: { family: "Plus Jakarta Sans", weight: "700" }, padding: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const labels = [stats.consistency, stats.intensity, stats.pattern, stats.focus_balance];
                                return ` ${labels[ctx.dataIndex] || ""}`;
                            }
                        }
                    }
                }
            }
        }
    );

    destroyChart("hoursChart");
    chartInstances["hoursChart"] = new Chart(
        document.getElementById("hoursChart"),
        {
            type: "bar",
            data: {
                labels: ["Goal", "Studied", "Remaining"],
                datasets: [{
                    label: "Hours",
                    data: [goal, studied, Math.max(remaining, 0)],
                    backgroundColor: [navy, gold, "#e8e1d1"],
                    borderRadius: 10,
                    borderSkipped: false
                }]
            },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y} hrs` } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: navy, font: { family: "Plus Jakarta Sans", weight: "700" } } },
                    y: {
                        grid: { color: "rgba(0,43,73,0.06)" },
                        ticks: { color: navy, font: { family: "Plus Jakarta Sans" }, callback: (v) => v + "h" }
                    }
                }
            }
        }
    );
}
