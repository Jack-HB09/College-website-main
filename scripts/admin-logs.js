const activityLogsUrl = "../scripts/php/admin/activity-logs.php";
let currentPage = 1;
let currentFilters = {};

function formatDisplayDate(dateText) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        return dateText || "Unknown";
    }

    const [year, month, day] = dateText.split("-");
    return `${day}/${month}/${year}`;
}

async function loadActivityLogs(page = 1) {
    const status = document.getElementById("admin-log-status");
    const content = document.getElementById("admin-log-content");
    const rows = document.getElementById("admin-log-rows");

    const parameters = new URLSearchParams(currentFilters);
    parameters.set("page", String(page));

    status.textContent = "Loading activity logs...";

    try {
        const response = await fetch(`${activityLogsUrl}?${parameters.toString()}`, {
            credentials: "same-origin",
            cache: "no-store"
        });
        const result = await response.json();

        if (response.status === 401) {
            status.textContent = "You must be signed in to view activity logs.";
            content.hidden = true;
            return;
        }
        if (response.status === 403) {
            status.textContent = "Access denied.";
            content.hidden = true;
            return;
        }
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load activity logs.");
        }

        status.textContent = "";
        content.hidden = false;
        rows.replaceChildren();

        if (result.records.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No activity records found.";
            row.append(cell);
            rows.append(row);
        } else {
            result.records.forEach(record => {
                const row = document.createElement("tr");
                [
                    record.id,
                    record.username,
                    record.event,
                    record.specific_event,
                    formatDisplayDate(record.date),
                    record.time
                ].forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = String(value);
                    row.append(cell);
                });
                rows.append(row);
            });
        }

        currentPage = result.pagination.page;
        document.getElementById("admin-log-page-info").textContent =
            `Page ${result.pagination.page} of ${result.pagination.total_pages} `
            + `(${result.pagination.total_records} records)`;
        document.getElementById("admin-log-prev").disabled = currentPage <= 1;
        document.getElementById("admin-log-next").disabled =
            currentPage >= result.pagination.total_pages;
    } catch (error) {
        console.error("Unable to load activity logs:", error);
        status.textContent = "Activity logs could not be loaded.";
        content.hidden = true;
    }
}

document.getElementById("admin-log-filters").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    currentFilters = {};

    for (const [key, value] of formData.entries()) {
        if (value !== "") {
            currentFilters[key] = value;
        }
    }
    loadActivityLogs(1);
});

document.getElementById("admin-log-clear").addEventListener("click", () => {
    document.getElementById("admin-log-filters").reset();
    currentFilters = {};
    loadActivityLogs(1);
});

document.getElementById("admin-log-prev").addEventListener("click", () => {
    if (currentPage > 1) {
        loadActivityLogs(currentPage - 1);
    }
});

document.getElementById("admin-log-next").addEventListener("click", () => {
    loadActivityLogs(currentPage + 1);
});

loadActivityLogs();
