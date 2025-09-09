function formatMonth(dateObj) {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];
    return monthNames[dateObj.getMonth()] + " " + dateObj.getFullYear();
}

function getAllMonthsOfYear(year) {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];
    return monthNames.map(m => `${m} ${year}`);
}

async function fetchAllLeads(page = 1, allData = []) {
    try {
        let resp = await ZOHO.CRM.API.getAllRecords({
            Entity: "Leads",
            per_page: 500,
            page: page
        });

        console.log("API Response Page:", page, resp);

        if (resp && resp.data && resp.data.length > 0) {
            allData = allData.concat(resp.data);
        }

        return allData;
    } catch (e) {
        console.error("Error fetching leads:", e);
        return allData;
    }
}

function groupLeadsByMonthWeek(leads) {
    const year = new Date().getFullYear();
    let months = getAllMonthsOfYear(year);

    let grouped = {};
    months.forEach(m => {
        grouped[m] = {};
        for (let week = 1; week <= 4; week++) {
            grouped[m][week] = 0;
        }
    });

    leads.forEach(lead => {
        if (lead.Created_Time) {
            let createdDate = new Date(lead.Created_Time.split("+")[0]);
            let monthKey = formatMonth(createdDate);
            let weekNumber = Math.ceil(createdDate.getDate() / 7);

            if (grouped[monthKey] && weekNumber >= 1 && weekNumber <= 4) {
                grouped[monthKey][weekNumber] += 1;
            }
        }
    });

    return grouped;
}

function getPercentChange(current, previous) {
    if (previous === null || previous === undefined) return "";
    if (previous === 0 && current > 0) return ` <span style="color:green;">(+100%)</span>`;
    if (previous === 0 && current === 0) return ` <span style="color:gray;">(0%)</span>`;
    let change = (((current - previous) / previous) * 100).toFixed(1);
    let color = change > 0 ? "green" : (change < 0 ? "red" : "gray");
    return ` <span style="color:${color};">(${change > 0 ? "+" : ""}${change}%)</span>`;
}

function renderTable(monthlyWeeklyCounts) {
    let table = document.querySelector("#leadsTable");
    let thead = table.querySelector("thead");
    let tbody = table.querySelector("tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    const year = new Date().getFullYear();
    let months = getAllMonthsOfYear(year);

    let headerRow = "<tr><th>Week</th>";
    months.forEach(m => headerRow += `<th>${m}</th>`);
    headerRow += "</tr>";
    thead.innerHTML = headerRow;

    for (let week = 1; week <= 4; week++) {
        let row = `<tr><td>Week ${week}</td>`;
        months.forEach(m => {
            let count = (monthlyWeeklyCounts[m] && monthlyWeeklyCounts[m][week]) || 0;
            let prevWeekCount = (week > 1) ? ((monthlyWeeklyCounts[m] && monthlyWeeklyCounts[m][week - 1]) || 0) : null;
            let percentHTML = getPercentChange(count, prevWeekCount);
            row += `<td>${count}${percentHTML}</td>`;
        });
        row += "</tr>";
        tbody.innerHTML += row;
    }

    let totalRow = `<tr><td><strong>Total</strong></td>`;
    months.forEach((m, i) => {
        let total = monthlyWeeklyCounts[m] 
            ? Object.values(monthlyWeeklyCounts[m]).reduce((a, b) => a + b, 0) 
            : 0;
        let prevMonth = (i > 0) ? months[i - 1] : null;
        let prevTotal = prevMonth && monthlyWeeklyCounts[prevMonth] 
            ? Object.values(monthlyWeeklyCounts[prevMonth]).reduce((a, b) => a + b, 0) 
            : null;
        let percentHTML = getPercentChange(total, prevTotal);
        totalRow += `<td><strong>${total}${percentHTML}</strong></td>`;
    });
    totalRow += "</tr>";
    tbody.innerHTML += totalRow;

    document.querySelector("#footerNote").innerText =
        `Leads grouped by month and week for ${year}.`;
}

ZOHO.embeddedApp.on("PageLoad", async function(data) {
    console.log("Page Data:", data);
    let allLeads = await fetchAllLeads(); 
    console.log("Total Leads Fetched:", allLeads.length);

    let monthlyWeeklyCounts = groupLeadsByMonthWeek(allLeads);
    renderTable(monthlyWeeklyCounts);
});

ZOHO.embeddedApp.init();
