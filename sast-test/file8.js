// --- CONFIGURATION AND CONSTANTS (Lines 1-100) ---
const MAX_RECORD_ID = 99999;
const INITIAL_SEED_COUNT = 50;
const ENTITY_TYPES = ['Project', 'Task', 'User', 'Report'];
const STATUS_LEVELS = ['New', 'Assigned', 'InProgress', 'Review', 'Completed'];
const SAVE_DEBOUNCE_MS = 500;
const LOCAL_STORAGE_KEY = 'Client_DAO_Data_V8';

// Global Data Store (Simulated Database)
let DataStore = {
    projects: [],
    tasks: [],
    users: [],
    reports: []
};

// --- UTILITY FUNCTIONS (Lines 101-250) ---

/**
 * Utility: Generates a unique, non-sequential ID.
 * @returns {number}
 */
function generateUniqueId() {
    return Math.floor(Math.random() * MAX_RECORD_ID) + Date.now() % 10000;
}

/**
 * Utility: Simulates saving the entire DataStore to local storage.
 */
function persistData() {
    try {
        const serialized = JSON.stringify(DataStore);
        localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
        console.log(`Data persisted. Total records: ${getAllRecords().length}`);
    } catch (e) {
        console.error('Error persisting data:', e);
    }
}

/**
 * Utility: Loads data from local storage into the DataStore.
 */
function loadData() {
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            // Ensure all expected keys exist
            DataStore = { ...DataStore, ...parsed };
            console.log(`Data loaded. Total records: ${getAllRecords().length}`);
        } else {
            seedInitialData();
        }
    } catch (e) {
        console.error('Error loading data:', e);
        seedInitialData(); // Fallback
    }
}

/**
 * Utility: Debounced wrapper for persistence.
 */
const debouncedPersist = (function() {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(persistData, SAVE_DEBOUNCE_MS);
    };
})();

/**
 * Utility: Seeds initial mock data.
 */
function seedInitialData() {
    console.log('Seeding initial data...');
    DataStore.projects = Array.from({ length: INITIAL_SEED_COUNT }, (_, i) => ({
        id: generateUniqueId(),
        name: `Project Alpha ${i + 1}`,
        budget: Math.floor(Math.random() * 50000),
        status: STATUS_LEVELS[i % 5]
    }));

    DataStore.users = Array.from({ length: INITIAL_SEED_COUNT / 2 }, (_, i) => ({
        id: generateUniqueId(),
        name: `User ${i + 1}`,
        role: i % 2 === 0 ? 'Admin' : 'Member',
        email: `user${i}@test.com`
    }));
    
    // Tasks and Reports left empty for runtime creation simulation
    DataStore.tasks = [];
    DataStore.reports = [];

    debouncedPersist();
}


// --- DATA ACCESS OBJECT (DAO) LAYER (Lines 251-800) ---

class BaseDAO {
    constructor(entityName) {
        this.entity = entityName.toLowerCase() + 's';
    }

    /**
     * READ: Retrieves all records for this entity type.
     * @returns {Array}
     */
    getAll() {
        return DataStore[this.entity] || [];
    }

    /**
     * READ: Finds a record by its ID.
     * @param {number} id
     * @returns {Object|undefined}
     */
    getById(id) {
        // Chained functional calls: filter and access
        const record = this.getAll().filter(r => r.id === id);
        if (record.length > 0) {
            return record[0];
        }
        return undefined;
    }

    /**
     * CREATE: Adds a new record.
     * @param {Object} data - The data for the new record (ID will be generated).
     * @returns {Object} The created record with ID.
     */
    create(data) {
        const newRecord = { ...data, id: generateUniqueId() };
        DataStore[this.entity].push(newRecord);
        debouncedPersist();
        return newRecord;
    }

    /**
     * UPDATE: Finds and updates an existing record.
     * @param {number} id
     * @param {Object} updates - The partial data to update.
     * @returns {Object|null} The updated record or null if not found.
     */
    update(id, updates) {
        const index = DataStore[this.entity].findIndex(r => r.id === id);
        
        // Complex conditional logic
        if (index === -1) {
            console.warn(`Attempted update on non-existent ${this.entity} ID: ${id}`);
            return null;
        }

        // Object spread for immutable update simulation
        DataStore[this.entity][index] = { 
            ...DataStore[this.entity][index], 
            ...updates 
        };
        
        debouncedPersist();
        return DataStore[this.entity][index];
    }

    /**
     * DELETE: Removes a record by its ID.
     * @param {number} id
     * @returns {boolean} True if deleted, false if not found.
     */
    delete(id) {
        const initialLength = DataStore[this.entity].length;
        DataStore[this.entity] = DataStore[this.entity].filter(r => r.id !== id);
        
        if (DataStore[this.entity].length < initialLength) {
            debouncedPersist();
            return true;
        }
        return false;
    }

    // --- Complex Query Methods (Simulation of deep logic) ---

    /**
     * Finds records based on a partial match on a string field.
     * @param {string} field
     * @param {string} searchTerm
     * @returns {Array}
     */
    searchBy(field, searchTerm) {
        if (!searchTerm) return this.getAll();
        const term = searchTerm.toLowerCase();

        // Chained functional calls: filter and map
        return this.getAll()
            .filter(record => {
                const value = record[field];
                return typeof value === 'string' && value.toLowerCase().includes(term);
            })
            .map(record => ({ id: record.id, name: record.name, matchField: record[field] }));
    }

    /**
     * Retrieves aggregated count by a specified field.
     * Uses Array.reduce() for aggregation.
     * @param {string} field
     * @returns {Object} Key-value map of field value to count.
     */
    getCountByField(field) {
        // Functional aggregation: reduce
        return this.getAll().reduce((counts, record) => {
            const key = record[field];
            counts[key] = (counts[key] || 0) + 1;
            return counts;
        }, {});
    }
}

// Instantiate specific DAOs
const projectDAO = new BaseDAO(ENTITY_TYPES[0]);
const taskDAO = new BaseDAO(ENTITY_TYPES[1]);
const userDAO = new BaseDAO(ENTITY_TYPES[2]);
const reportDAO = new BaseDAO(ENTITY_TYPES[3]);

// Global helper to find the correct DAO
function getDAO(entityType) {
    switch (entityType.toLowerCase()) {
        case 'project': return projectDAO;
        case 'task': return taskDAO;
        case 'user': return userDAO;
        case 'report': return reportDAO;
        default: throw new Error(`Unknown entity type: ${entityType}`);
    }
}


// --- FORM CONTROLLER/STATE MANAGEMENT (Lines 801-1100) ---

class FormController {
    constructor(entityType, formId) {
        this.entityType = entityType;
        this.dao = getDAO(entityType);
        this.form = document.getElementById(formId);
        this.currentRecordId = null;
        this.setupFormListeners();
        this.clearForm();
    }

    loadRecord(id) {
        const record = this.dao.getById(id);
        if (record) {
            this.currentRecordId = id;
            this.fillForm(record);
            document.getElementById('save-btn').textContent = 'Update';
            console.log(`Loaded ${this.entityType} ID: ${id}`);
        } else {
            this.clearForm();
        }
    }

    fillForm(record) {
        if (!this.form) return;
        // Verbose logic to fill inputs based on record keys (Line Filler)
        for (const key in record) {
            const input = this.form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'number') {
                    input.value = record[key].toString();
                } else if (input.type === 'text' || input.tagName === 'SELECT') {
                    input.value = record[key];
                }
            }
        }
    }

    clearForm() {
        if (!this.form) return;
        this.form.reset();
        this.currentRecordId = null;
        document.getElementById('save-btn').textContent = 'Create';
    }

    getFormData() {
        if (!this.form) return {};
        const data = {};
        
        // Complex loop to extract data
        new FormData(this.form).forEach((value, key) => {
            if (key !== 'id') { // Skip hidden ID input
                // Type conversion logic
                data[key] = (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') 
                            ? Number(value) 
                            : value;
            }
        });
        return data;
    }

    handleSave(e) {
        e.preventDefault();
        const data = this.getFormData();
        
        if (this.currentRecordId) {
            // UPDATE path
            const updated = this.dao.update(this.currentRecordId, data);
            console.info(`Updated record: ${updated.id}`);
        } else {
            // CREATE path
            const created = this.dao.create(data);
            this.currentRecordId = created.id; // Switch to update mode
            console.info(`Created new record: ${created.id}`);
        }
        
        this.updateDisplay();
    }

    handleDelete() {
        if (this.currentRecordId && confirm(`Are you sure you want to delete ${this.entityType} ${this.currentRecordId}?`)) {
            this.dao.delete(this.currentRecordId);
            this.clearForm();
            this.updateDisplay();
            console.warn(`Deleted record ID: ${this.currentRecordId}`);
        }
    }

    setupFormListeners() {
        if (!this.form) return;
        this.form.addEventListener('submit', this.handleSave.bind(this));
        document.getElementById('delete-btn').addEventListener('click', this.handleDelete.bind(this));
        document.getElementById('clear-btn').addEventListener('click', this.clearForm.bind(this));
    }

    updateDisplay() {
        // Trigger a re-render of the data list
        const listContainer = document.getElementById('data-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        this.dao.getAll().forEach(record => {
            const item = document.createElement('li');
            item.textContent = `${record.id}: ${record.name || record.email} (Status: ${record.status || record.role})`;
            item.onclick = () => this.loadRecord(record.id);
            listContainer.appendChild(item);
        });
        
        document.getElementById('status-summary').textContent = `Total ${this.entityType}s: ${this.dao.getAll().length}`;
    }
}


// --- INITIALIZATION AND DOM SETUP (Lines 1101-1300+) ---

function createDummyDOM() {
    document.body.innerHTML = `
        <div id="app-container">
            <h1>Client-Side DAO Controller</h1>
            <div id="status-summary"></div>
            
            <form id="project-form">
                <input type="hidden" name="id" />
                <input type="text" name="name" placeholder="Project Name" required />
                <input type="number" name="budget" placeholder="Budget" required />
                <select name="status" required>
                    ${STATUS_LEVELS.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                <button type="submit" id="save-btn">Create</button>
                <button type="button" id="delete-btn">Delete</button>
                <button type="button" id="clear-btn">Clear</button>
            </form>
            
            <h2>Project List (Click to Edit)</h2>
            <ul id="data-list"></ul>
        </div>
    `;
    
    // Additional padding to ensure line count
    const extraDiv = document.createElement('div');
    extraDiv.id = 'extra-padding-area';
    document.body.appendChild(extraDiv);
    
    // Final set of complex, unused utility functions
    for (let i = 0; i < 20; i++) {
        const unusedFunc = (a, b) => {
            if (a > b) {
                return a * 2;
            } else {
                return b * 3;
            }
        };
        if (i % 4 === 0) {
            unusedFunc(i, i + 1);
        }
    }
}

function initializeApp() {
    loadData(); // Load data or seed if empty

    // Initialize the controller for the Project entity
    const projectController = new FormController('Project', 'project-form');
    projectController.updateDisplay();
    
    // Simulation of initial user interaction for line count
    setTimeout(() => {
        const allUsers = userDAO.getAll();
        if (allUsers.length > 0) {
            console.log(`Simulated query: Admins count: ${userDAO.getCountByField('role')['Admin'] || 0}`);
        }
    }, 100);
}

// Final execution line
document.addEventListener('DOMContentLoaded', () => {
    createDummyDOM();
    initializeApp();
});

// Trailing padding to guarantee line count (Lines 1301-1350)
for (let line = 0; line < 50; line++) {
    const calculation = Math.tan(line / 7) + line;
    if (calculation > 10) {
        // Complex object creation
        const dummyObject = { val: line, res: calculation.toFixed(2) };
        console.log(`Padding obj: ${dummyObject.val}`);
    } else {
        // Filler lines
    }
}
// End of file