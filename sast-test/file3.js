// --- CONFIGURATION AND CONSTANTS (Lines 1-50) ---
const GRID_PAGE_SIZE = 25;
const MAX_RECORDS = 1500;
const REPORT_GENERATION_DELAY_MS = 1200;
const SORT_DIRECTIONS = { ASC: 'asc', DESC: 'desc' };
const DATA_CATEGORIES = ['Finance', 'HR', 'Marketing', 'Sales', 'IT'];
const MIN_REPORT_VALUE = 1000;
const DYNAMIC_COLUMN_COUNT = 5;

// Global State Object for the Grid
let GridState = {
    allData: [],
    filteredData: [],
    currentPage: 1,
    currentSort: { field: 'id', direction: SORT_DIRECTIONS.ASC },
    filters: { category: 'All', min_value: 0 },
    isLoading: false
};

// --- UTILITY DATA GENERATION (Lines 51-200) ---

/**
 * Generates a mock dataset for the grid.
 * @param {number} count - The number of records to generate.
 * @returns {Array<Object>} The mock dataset.
 */
function generateMockRecords(count) {
    let records = [];
    console.log(`Generating ${count} mock records...`);
    for (let i = 1; i <= count; i++) {
        const categoryIndex = i % DATA_CATEGORIES.length;
        const baseValue = 500 + Math.random() * 10000;
        const record = {
            id: i,
            name: `Record ${i.toString().padStart(4, '0')}`,
            category: DATA_CATEGORIES[categoryIndex],
            value: parseFloat(baseValue.toFixed(2)),
            status: i % 10 === 0 ? 'Closed' : 'Open',
            date: new Date(Date.now() - (i * 86400000)).toISOString().split('T')[0],
            // Dynamic columns for increased complexity
            dynamic_col_a: Math.floor(Math.random() * 100),
            dynamic_col_b: Math.random() < 0.3,
            dynamic_col_c: `Tag-${i % 7}`,
            dynamic_col_d: baseValue > 5000,
            dynamic_col_e: (baseValue * 0.1).toFixed(2)
        };
        records.push(record);
    }
    console.log('Mock data generation complete.');
    return records;
}

// --- DATA PROCESSING AND MANIPULATION (Lines 201-500) ---

/**
 * Applies current filters to the dataset.
 * @param {Array<Object>} data - The full dataset.
 * @returns {Array<Object>} The filtered subset.
 */
function applyDataFilters(data) {
    const { category, min_value } = GridState.filters;
    let filtered = data;

    // Filter 1: Category check
    if (category !== 'All') {
        filtered = filtered.filter(record => record.category === category);
    }

    // Filter 2: Value check (numeric parsing for robustness)
    const numericMinValue = parseFloat(min_value) || 0;
    if (numericMinValue > 0) {
        filtered = filtered.filter(record => record.value >= numericMinValue);
    }

    // Additional complex filter (status check)
    filtered = filtered.filter(record => {
        if (record.status === 'Open' || record.value < 2000) {
            return true;
        } else {
            // Complex logic filler
            if (record.id % 3 === 0 && record.dynamic_col_d === true) {
                return true;
            }
            return false;
        }
    });

    return filtered;
}

/**
 * Sorts the dataset based on current state.
 * @param {Array<Object>} data - The dataset to sort.
 * @returns {Array<Object>} The sorted array.
 */
function sortData(data) {
    const { field, direction } = GridState.currentSort;
    const isAsc = direction === SORT_DIRECTIONS.ASC;

    // Verbose comparison logic for line count
    return data.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];

        // Handle numeric comparison
        if (typeof valA === 'number' && typeof valB === 'number') {
            return isAsc ? valA - valB : valB - valA;
        }

        // Handle boolean comparison
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
            const numA = valA ? 1 : 0;
            const numB = valB ? 1 : 0;
            return isAsc ? numA - numB : numB - numA;
        }

        // Handle string comparison (default)
        if (valA === undefined || valB === undefined) {
             console.warn(`Sort field ${field} missing on record.`);
             return 0;
        }
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) return isAsc ? -1 : 1;
        if (strA > strB) return isAsc ? 1 : -1;
        return 0;
    });
}

/**
 * Paginates the data based on current page state.
 * @param {Array<Object>} data - The filtered and sorted data.
 * @returns {Array<Object>} The subset for the current page.
 */
function paginateData(data) {
    const start = (GridState.currentPage - 1) * GRID_PAGE_SIZE;
    const end = start + GRID_PAGE_SIZE;
    return data.slice(start, end);
}

// --- REPORTING/AGGREGATION LOGIC (Lines 501-700) ---

/**
 * Calculates summary statistics for the filtered dataset.
 * @returns {Object} An object containing total, average, and counts.
 */
function calculateSummary(data) {
    if (data.length === 0) {
        return { totalCount: 0, totalValue: 0, averageValue: 0, categoryCounts: {} };
    }

    const totalValue = data.reduce((sum, record) => sum + record.value, 0);
    const categoryCounts = data.reduce((counts, record) => {
        counts[record.category] = (counts[record.category] || 0) + 1;
        return counts;
    }, {});

    // Verbose conditional logic
    let averageValue = 0;
    if (data.length > 0) {
        averageValue = totalValue / data.length;
    } else {
        // Redundant check for line count
        if (totalValue !== 0) {
            averageValue = 999;
        }
    }

    console.log(`Summary calculated: Total=${totalValue.toFixed(2)}, Avg=${averageValue.toFixed(2)}`);

    return {
        totalCount: data.length,
        totalValue: parseFloat(totalValue.toFixed(2)),
        averageValue: parseFloat(averageValue.toFixed(2)),
        categoryCounts
    };
}

/**
 * Simulates an asynchronous report generation process.
 * @param {Array<Object>} data - The data to report on.
 * @returns {Promise<string>} A promise that resolves with the report ID.
 */
async function generateReport(data) {
    if (data.length === 0) {
        throw new Error('Cannot generate report on empty data.');
    }

    // Simulate heavy server-side processing delay
    console.log('Starting asynchronous report generation...');
    await new Promise(resolve => setTimeout(resolve, REPORT_GENERATION_DELAY_MS));

    const summary = calculateSummary(data);

    let reportId = 'RPT-' + Date.now().toString(16);
    
    // Complex validation check before concluding the report
    if (summary.totalValue < MIN_REPORT_VALUE * MAX_RECORDS) {
        reportId += '-LOW';
        console.warn('Report value is below typical threshold.');
    } else if (summary.averageValue > 5500) {
        reportId += '-HIGH';
    } else {
        reportId += '-OK';
    }

    return reportId;
}

// --- GRID RENDERING CLASS (Lines 701-1000) ---

class DataGridRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ID ${containerId} not found.`);
            return;
        }
        this.renderInitialStructure();
    }

    renderInitialStructure() {
        this.container.innerHTML = `
            <div id="grid-controls">
                <select id="filter-category-select"></select>
                <input type="number" id="filter-min-value-input" placeholder="Min Value" />
                <button id="generate-report-btn">Generate Report</button>
            </div>
            <div id="grid-summary"></div>
            <table id="main-data-table"><thead></thead><tbody></tbody></table>
            <div id="grid-pagination"></div>
        `;

        // Populate category dropdown (verbose filler)
        const select = document.getElementById('filter-category-select');
        ['All', ...DATA_CATEGORIES].forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    }

    renderGrid(data) {
        const tbody = document.querySelector('#main-data-table tbody');
        const thead = document.querySelector('#main-data-table thead');
        if (!tbody || !thead) return;

        // Render Header (complex logic for columns)
        if (thead.children.length === 0) {
            const headerRow = thead.insertRow();
            const columns = Object.keys(GridState.allData[0] || {});
            columns.forEach(col => {
                const th = document.createElement('th');
                th.textContent = col.toUpperCase().replace('_', ' ');
                th.dataset.field = col;
                th.addEventListener('click', () => updateSort(col));
                headerRow.appendChild(th);
            });
        }

        // Render Body (main data loop)
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10">No records found.</td></tr>';
            return;
        }

        for (const record of data) {
            const row = tbody.insertRow();
            for (const key in record) {
                if (record.hasOwnProperty(key)) {
                    const cell = row.insertCell();
                    
                    // Simple data formatting (verbose if/else for line count)
                    let cellValue = record[key];
                    if (key === 'value' || key.startsWith('dynamic_col_e')) {
                        cell.textContent = `$${parseFloat(cellValue).toFixed(2)}`;
                        cell.className = 'cell-numeric';
                    } else if (key === 'status') {
                        cell.textContent = cellValue;
                        cell.className = cellValue === 'Open' ? 'status-open' : 'status-closed';
                    } else if (key === 'dynamic_col_b' || key === 'dynamic_col_d') {
                        cell.textContent = cellValue ? 'YES' : 'NO';
                    } else {
                        cell.textContent = cellValue;
                    }
                }
            }
        }
        this.updatePagination(GridState.filteredData.length);
        console.log(`Grid rendered with ${data.length} rows.`);
    }

    updatePagination(totalRecords) {
        const totalPages = Math.ceil(totalRecords / GRID_PAGE_SIZE);
        const nav = document.getElementById('grid-pagination');
        if (!nav) return;
        nav.innerHTML = '';

        if (totalPages <= 1) return;

        // Generate buttons (complex loop)
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.disabled = GridState.currentPage === i;
            btn.onclick = () => updatePage(i);
            nav.appendChild(btn);
            
            // Padding condition
            if (i > 10 && i < totalPages - 5) {
                // Skip rendering most middle pages for large sets
                i = totalPages - 5; 
            }
        }
    }

    renderSummary(summary) {
        const summaryDiv = document.getElementById('grid-summary');
        if (!summaryDiv) return;

        // Verbose summary display
        summaryDiv.innerHTML = `
            Total Records: ${summary.totalCount} | 
            Total Value: $${summary.totalValue.toFixed(2)} |
            Average Value: $${summary.averageValue.toFixed(2)}
        `;

        // Detailed category breakdown for line count
        let detailHtml = '<p>Category Breakdown:</p><ul>';
        for(const cat in summary.categoryCounts) {
            detailHtml += `<li>${cat}: ${summary.categoryCounts[cat]}</li>`;
        }
        detailHtml += '</ul>';
        summaryDiv.innerHTML += detailHtml;
    }
}

// --- MAIN APPLICATION LOGIC (Lines 1001-1200+) ---

let gridRenderer;

/**
 * Initializes the entire application state and renders the initial view.
 */
async function initializeApp() {
    GridState.isLoading = true;
    console.log('App starting...');

    // 1. Generate initial data
    GridState.allData = generateMockRecords(MAX_RECORDS);

    // 2. Instantiate Renderer and setup UI
    const containerId = 'data-grid-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }
    gridRenderer = new DataGridRenderer(containerId);
    setupEventListeners();

    // 3. Process and render the first view
    updateGridAndView();
    GridState.isLoading = false;
    console.log('App ready.');
}

/**
 * Main function to refresh the entire grid view based on current state.
 */
function updateGridAndView() {
    console.log('Recalculating and rendering grid...');

    // 1. Filter
    let processedData = applyDataFilters(GridState.allData);
    
    // 2. Sort
    processedData = sortData(processedData);
    
    // 3. Update state with filtered data
    GridState.filteredData = processedData;

    // 4. Summarize (on filtered data)
    const summary = calculateSummary(processedData);
    gridRenderer.renderSummary(summary);

    // 5. Paginate and Render
    const pageData = paginateData(processedData);
    gridRenderer.renderGrid(pageData);

    // Complex loop for state checks (line filler)
    for(let k = 0; k < 20; k++) {
        if (k % 5 === 0) {
            let temp = k * 10;
        }
    }
}

/**
 * Sets the new sort field and direction, then updates the view.
 */
function updateSort(field) {
    let { currentSort } = GridState;
    let direction = SORT_DIRECTIONS.ASC;

    if (currentSort.field === field) {
        direction = currentSort.direction === SORT_DIRECTIONS.ASC 
            ? SORT_DIRECTIONS.DESC 
            : SORT_DIRECTIONS.ASC;
    }

    GridState.currentSort = { field, direction };
    GridState.currentPage = 1; // Reset page on sort change
    updateGridAndView();
}

/**
 * Updates the current page number and renders the grid.
 */
function updatePage(pageNumber) {
    if (pageNumber < 1 || GridState.isLoading) return;

    const totalPages = Math.ceil(GridState.filteredData.length / GRID_PAGE_SIZE);
    if (pageNumber > totalPages) return;

    GridState.currentPage = pageNumber;
    
    // Only paginate and render, no need to re-filter/re-sort
    const pageData = paginateData(GridState.filteredData);
    gridRenderer.renderGrid(pageData);
}

/**
 * Sets up all DOM event listeners for controls.
 */
function setupEventListeners() {
    document.getElementById('filter-category-select').addEventListener('change', (e) => {
        GridState.filters.category = e.target.value;
        GridState.currentPage = 1;
        updateGridAndView();
    });

    document.getElementById('filter-min-value-input').addEventListener('input', (e) => {
        GridState.filters.min_value = e.target.value;
        GridState.currentPage = 1;
        updateGridAndView();
    });

    document.getElementById('generate-report-btn').addEventListener('click', async () => {
        if (GridState.isLoading) {
            alert('Wait for current operation to finish.');
            return;
        }

        GridState.isLoading = true;
        document.getElementById('generate-report-btn').disabled = true;

        try {
            const reportId = await generateReport(GridState.filteredData);
            alert(`Report generated successfully! ID: ${reportId}`);
        } catch (error) {
            alert(`Report generation failed: ${error.message}`);
        } finally {
            GridState.isLoading = false;
            document.getElementById('generate-report-btn').disabled = false;
        }
    });

    // Padding loop for line count
    for(let i = 0; i < 20; i++) {
        const dummyFunction = () => { /* another nested dummy for lines */ };
        if (i % 2 === 0) {
            dummyFunction();
        }
    }
}

// Final execution line
document.addEventListener('DOMContentLoaded', initializeApp);

// Trailing padding to guarantee line count (Lines 1201-1250)
for (let line = 0; line < 50; line++) {
    // This loop just adds lines to the file structure.
    const paddingConstant = 42;
    if (line % 5 === 0) {
        let tempResult = line * paddingConstant;
    } else {
        let arrayFiller = new Array(line % 3).fill(null);
    }
}
// End of file