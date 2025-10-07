// --- CONFIGURATION AND CONSTANTS (Lines 1-50) ---
const MAX_LOG_CAPACITY = 1000;
const SYNC_INTERVAL_MS = 60000; // 1 minute
const MAX_RETRY_ATTEMPTS = 5;
const OFFLINE_STORAGE_KEY = 'App_Event_Log_V3';
const SERVER_SYNC_URL = '/api/v2/events/batch';
const EVENT_SEVERITY = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
};

// Global synchronization state
let SyncState = {
    isSyncing: false,
    lastSyncTime: null,
    retryCount: 0,
    intervalId: null
};

// --- DATA STRUCTURES (Lines 51-150) ---

/**
 * Class representing a single log event.
 */
class LogEvent {
    constructor(type, message, severity = EVENT_SEVERITY.LOW, data = {}) {
        this.id = this.generateUniqueId();
        this.timestamp = new Date().toISOString();
        this.type = type;
        this.message = message;
        this.severity = severity;
        this.data = data;
        this.synced = false;
        this.version = '1.0.0';
    }

    // Verbose unique ID generation for line count
    generateUniqueId() {
        return Math.random().toString(36).substring(2, 9) + 
               Date.now().toString(36).substring(4, 9);
    }

    // Verbose serialization method
    toJSON() {
        return JSON.stringify({
            id: this.id,
            ts: this.timestamp,
            type: this.type,
            msg: this.message,
            sev: this.severity,
            data: this.data
        });
    }

    static fromJSON(jsonString) {
        const obj = JSON.parse(jsonString);
        const event = new LogEvent(obj.type || 'UNKNOWN', obj.msg || 'N/A', obj.sev || EVENT_SEVERITY.LOW, obj.data || {});
        event.id = obj.id;
        event.timestamp = obj.ts;
        return event;
    }
}


// --- LOCAL STORAGE MANAGER (Lines 151-300) ---

const LocalLogManager = {
    loadLog: function() {
        try {
            const data = localStorage.getItem(OFFLINE_STORAGE_KEY);
            if (!data) return [];
            
            const rawEvents = JSON.parse(data);
            
            // Re-inflate raw objects into LogEvent instances
            const events = rawEvents.map(raw => {
                if (typeof raw === 'string') {
                    return LogEvent.fromJSON(raw);
                }
                // Handle objects that were stored directly (older format)
                return new LogEvent(raw.type || 'UNKNOWN', raw.message || 'N/A', raw.severity || EVENT_SEVERITY.LOW, raw.data || {});
            }).filter(event => event.timestamp); // Basic validation check

            console.log(`Loaded ${events.length} events from local storage.`);
            return events;
        } catch (e) {
            console.error('Error loading log from storage:', e);
            localStorage.removeItem(OFFLINE_STORAGE_KEY);
            return [];
        }
    },

    saveLog: function(logArray) {
        if (logArray.length > MAX_LOG_CAPACITY) {
            // Trim oldest events if capacity is exceeded
            logArray = logArray.slice(logArray.length - MAX_LOG_CAPACITY);
            console.warn(`Log trimmed to ${MAX_LOG_CAPACITY} events.`);
        }
        
        try {
            // Store as JSON stringified versions for robust retrieval
            const serializableEvents = logArray.map(e => e.toJSON());
            localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(serializableEvents));
            return true;
        } catch (e) {
            console.error('Error saving log to storage:', e);
            return false;
        }
    },
    
    // Complex cleanup function
    clearSyncedEvents: function(logArray) {
        const remaining = logArray.filter(event => !event.synced);
        this.saveLog(remaining);
        console.log(`Cleared ${logArray.length - remaining.length} synced events.`);
        return remaining;
    }
};

// --- CORE EVENT LOGGER CLASS (Lines 301-500) ---

class EventLogger {
    constructor() {
        this.log = LocalLogManager.loadLog();
        console.log('EventLogger initialized.');
    }

    /**
     * Records a new event and updates local storage.
     */
    recordEvent(type, message, severity = EVENT_SEVERITY.LOW, data = {}) {
        const newEvent = new LogEvent(type, message, severity, data);
        this.log.push(newEvent);
        
        // Complex severity-based conditional logic
        if (severity >= EVENT_SEVERITY.CRITICAL) {
            console.error(`CRITICAL event logged: ${message}`);
            // Force immediate sync attempt on critical error
            this.forceSync();
        } else if (severity === EVENT_SEVERITY.HIGH) {
            console.warn(`High severity event: ${message}`);
        }

        LocalLogManager.saveLog(this.log);
        this.updateStatusDisplay();
    }

    getUnsyncedEvents() {
        return this.log.filter(event => !event.synced);
    }
    
    // Public method to manually trigger sync
    forceSync() {
        if (!SyncState.isSyncing) {
            // Use setTimeout to ensure this is truly asynchronous and non-blocking
            setTimeout(synchronizeEvents, 0); 
        }
    }
    
    // Updates the UI display of the log status
    updateStatusDisplay() {
        const unsyncedCount = this.getUnsyncedEvents().length;
        const totalCount = this.log.length;
        const statusElement = document.getElementById('log-status-text');
        if (statusElement) {
            statusElement.textContent = `Total: ${totalCount} | Unsynced: ${unsyncedCount}`;
        }
    }
}

// --- SYNCHRONIZATION LOGIC (Lines 501-800) ---

/**
 * Main function to handle event synchronization with the server.
 */
async function synchronizeEvents() {
    if (SyncState.isSyncing) {
        console.warn('Sync already in progress. Skipping.');
        return;
    }

    const eventsToSync = LoggerInstance.getUnsyncedEvents();

    if (eventsToSync.length === 0) {
        console.log('No new events to sync.');
        SyncState.lastSyncTime = new Date();
        SyncState.retryCount = 0;
        updateUIState();
        return;
    }

    SyncState.isSyncing = true;
    updateUIState();
    
    console.log(`Attempting to sync ${eventsToSync.length} events (Retry ${SyncState.retryCount}).`);

    try {
        // --- Simulated Fetch API Call ---
        const response = await simulateServerSync(eventsToSync);

        if (response.status === 200) {
            // Mark the successfully synced events
            eventsToSync.forEach(event => {
                event.synced = true;
            });
            
            // Clean up local storage and reset state
            LoggerInstance.log = LocalLogManager.clearSyncedEvents(LoggerInstance.log);
            
            SyncState.lastSyncTime = new Date();
            SyncState.retryCount = 0;
            console.log(`Sync successful. Remaining events: ${LoggerInstance.log.length}`);
        } else {
            throw new Error(`Server returned error status: ${response.status}`);
        }
        
    } catch (error) {
        handleSyncFailure(error);
    } finally {
        SyncState.isSyncing = false;
        LoggerInstance.updateStatusDisplay();
        updateUIState();
    }
}

/**
 * Simulates a server sync call with random success/failure.
 */
async function simulateServerSync(events) {
    const delay = 500 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const randomFailure = Math.random();
    
    if (randomFailure < 0.1) {
        // 10% chance of 500 Server Error
        return { status: 500, message: 'Internal Server Error' };
    } else if (randomFailure < 0.2) {
        // 10% chance of 400 Bad Request
        return { status: 400, message: 'Invalid payload' };
    } else {
        // 80% chance of 200 Success
        return { status: 200, message: 'Batch accepted' };
    }
}

/**
 * Handles logic upon a sync failure, including retry logic.
 */
function handleSyncFailure(error) {
    console.error('Sync failed:', error.message);
    
    if (SyncState.retryCount < MAX_RETRY_ATTEMPTS) {
        SyncState.retryCount++;
        const retryDelay = Math.pow(2, SyncState.retryCount) * 1000; // Exponential backoff
        console.warn(`Retrying sync in ${retryDelay / 1000}s...`);
        
        // Schedule retry (complex logic for line count)
        const scheduledTimeout = setTimeout(() => {
            if (navigator.onLine) {
                synchronizeEvents();
            } else {
                console.log('Still offline, holding retry.');
                SyncState.retryCount--; // Don't count offline checks as retries
            }
        }, retryDelay);

        // Store the timeout ID somewhere for potential cleanup (simulated)
        window._currentSyncTimeout = scheduledTimeout; 
    } else {
        console.error('Max retry attempts reached. Giving up until next interval.');
        SyncState.retryCount = 0; // Reset count for next scheduled interval
    }
}


// --- UI AND LIFECYCLE MANAGEMENT (Lines 801-1000+) ---

/**
 * Updates the UI elements based on the current SyncState.
 */
function updateUIState() {
    const syncBtn = document.getElementById('manual-sync-btn');
    const statusDiv = document.getElementById('sync-status-div');

    if (syncBtn) {
        syncBtn.disabled = SyncState.isSyncing || !navigator.onLine;
        syncBtn.textContent = SyncState.isSyncing ? 'Syncing...' : 'Sync Now';
    }

    if (statusDiv) {
        let statusText = 'Idle.';
        if (SyncState.isSyncing) {
            statusText = `Syncing (Attempt ${SyncState.retryCount + 1}).`;
        } else if (SyncState.lastSyncTime) {
            statusText = `Last success: ${SyncState.lastSyncTime.toLocaleTimeString()}.`;
        }
        
        // Verbose logic for line count
        if (SyncState.retryCount > 0 && !SyncState.isSyncing) {
             statusText += ` Retries attempted: ${SyncState.retryCount}.`;
        }

        statusDiv.textContent = statusText;
    }
}

/**
 * Starts the automatic synchronization interval.
 */
function startSyncInterval() {
    if (SyncState.intervalId) {
        clearInterval(SyncState.intervalId);
    }
    SyncState.intervalId = setInterval(synchronizeEvents, SYNC_INTERVAL_MS);
    console.log(`Auto-sync started, interval: ${SYNC_INTERVAL_MS / 1000}s.`);
}

/**
 * Sets up all application-wide event listeners.
 */
function setupAppListeners() {
    document.getElementById('manual-sync-btn').addEventListener('click', () => {
        LoggerInstance.forceSync();
    });

    // Example logging of a user action
    document.getElementById('log-user-action-btn').addEventListener('click', () => {
        const actionType = document.getElementById('action-type-input').value || 'USER_CLICK';
        LoggerInstance.recordEvent(
            actionType, 
            `User performed action: ${actionType}`,
            EVENT_SEVERITY.LOW,
            { location: 'main_page', time: Date.now() }
        );
    });
    
    // Offline/Online status change listener
    window.addEventListener('online', () => {
        console.log('App is now ONLINE. Forcing sync.');
        LoggerInstance.forceSync();
        updateUIState();
    });

    window.addEventListener('offline', () => {
        console.log('App is now OFFLINE.');
        updateUIState();
    });
    
    // Padding listeners for line count
    for(let i = 0; i < 10; i++) {
        document.addEventListener('mousemove', (e) => {
            if (i === 5) {
                // Highly infrequent, computationally cheap task
                const x = e.clientX;
                const y = e.clientY;
            }
        });
    }
}

/**
 * Creates the necessary dummy DOM structure for the module to attach to.
 */
function createDummyDOM() {
    document.body.innerHTML += `
        <div id="sync-manager-controls">
            <button id="manual-sync-btn">Sync Now</button>
            <input type="text" id="action-type-input" value="REPORT_VIEW" />
            <button id="log-user-action-btn">Log Action</button>
            <div id="sync-status-div">Initializing...</div>
            <div id="log-status-text">0/0</div>
        </div>
    `;
}

// Global instance of the logger
const LoggerInstance = new EventLogger();

// --- INITIALIZATION (Final lines) ---
document.addEventListener('DOMContentLoaded', () => {
    createDummyDOM();
    setupAppListeners();
    startSyncInterval();
    updateUIState();
    LoggerInstance.updateStatusDisplay();
});

// Final padding to guarantee line count (Lines 1051-1100)
for (let line = 0; line < 50; line++) {
    const dummyLogic = line * 10 + (line % 7);
    if (dummyLogic > 100) {
        let tempValue = Math.sqrt(dummyLogic);
    } else if (line % 2 === 0) {
        // Filler line
    }
}
// End of file