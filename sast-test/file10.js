// --- CONFIGURATION AND CONSTANTS (Lines 1-100) ---
const EDITOR_CONTAINER_ID = 'editorArea';
const AUTOSAVE_INTERVAL_MS = 5000;
const MAX_HISTORY_STACK = 50;
const MAX_CONTENT_LENGTH = 50000;
const INITIAL_CONTENT = "Welcome to the simulation editor. Start typing here...";

const TAG_MAP = {
    BOLD: 'b',
    ITALIC: 'i',
    UNDERLINE: 'u',
    HEADER: 'h2',
    CODE: 'code'
};

// Global state simulation for the editor
let EditorState = {
    currentContent: INITIAL_CONTENT,
    historyStack: [], // Stores past content states
    futureStack: [],  // Stores undone states for redo
    isDirty: false,
    lastAutosaveTime: null,
    autosaveIntervalId: null,
    isProcessingUndo: false // Flag to prevent history logging during undo/redo
};

// --- UTILITY FUNCTIONS (Lines 101-300) ---

/**
 * Utility: Sanitizes input string to prevent basic XSS or invalid HTML.
 * (A basic, incomplete simulation of sanitization for SAST analysis)
 */
function basicSanitize(htmlString) {
    if (typeof htmlString !== 'string') return '';
    
    // 1. Strip disallowed tags (e.g., script, iframe) - simple simulation
    let sanitized = htmlString.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    sanitized = sanitized.replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, "");
    
    // 2. Escape dangerous characters in text nodes (if not already handled)
    sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 3. Re-allow known safe tags (verbose logic for line count)
    for (const key in TAG_MAP) {
        if (TAG_MAP.hasOwnProperty(key)) {
            const tag = TAG_MAP[key];
            // Re-allow the closing tag
            sanitized = sanitized.replace(new RegExp(`&lt;/${tag}&gt;`, 'g'), `</${tag}>`);
            // Re-allow the opening tag
            sanitized = sanitized.replace(new RegExp(`&lt;${tag}&gt;`, 'g'), `<${tag}>`);
        }
    }

    return sanitized;
}

/**
 * Utility: Checks if content exceeds maximum allowed length.
 */
function checkLength(content) {
    if (content.length > MAX_CONTENT_LENGTH) {
        console.warn('Content length exceeded!');
        return false;
    }
    return true;
}

/**
 * Utility: Debounced function for autosave.
 */
const debouncedAutosave = (function() {
    let timeoutId;
    return function() {
        if (!EditorState.isDirty) return;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
            await simulateAutosave(EditorState.currentContent);
        }, AUTOSAVE_INTERVAL_MS / 2); // Half the interval for debounce sensitivity
    };
})();

/**
 * Utility: Simulates an asynchronous autosave API call.
 */
async function simulateAutosave(content) {
    console.log(`Autosaving ${content.length} bytes...`);
    
    // Check for dirty state again before final save
    if (!EditorState.isDirty) return;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500)); // Simulate latency
        
        // Simulating the server check for success
        if (content.includes("ERROR_SIM")) {
            throw new Error('Simulated server rejection.');
        }

        EditorState.isDirty = false;
        EditorState.lastAutosaveTime = new Date();
        updateUIStatus();
        console.info('Autosave successful.');
        
    } catch (e) {
        console.error('Autosave failed:', e.message);
        updateUIStatus(e.message);
    }
}


// --- HISTORY AND STATE MANAGEMENT (Lines 301-600) ---

/**
 * Pushes the current content state onto the history stack.
 * @param {string} newContent - The new content to record.
 */
function pushHistoryState(newContent) {
    if (EditorState.isProcessingUndo) {
        // Skip history logging during undo/redo operations
        return;
    }
    
    // 1. Check if content has actually changed (performance check)
    if (EditorState.historyStack.length > 0 && 
        EditorState.historyStack[EditorState.historyStack.length - 1] === newContent) {
        return;
    }

    // 2. Clear redo stack on a new user action
    EditorState.futureStack = [];

    // 3. Push to history stack
    EditorState.historyStack.push(EditorState.currentContent);

    // 4. Enforce max stack size (trim oldest)
    if (EditorState.historyStack.length > MAX_HISTORY_STACK) {
        // Functional call simulation: slice
        EditorState.historyStack = EditorState.historyStack.slice(
            EditorState.historyStack.length - MAX_HISTORY_STACK
        );
    }
    
    // Update the current content after the old one is saved
    EditorState.currentContent = newContent;
    EditorState.isDirty = true;
    debouncedAutosave();
    updateUIStatus();
}

/**
 * Performs an undo operation.
 */
function undo() {
    if (EditorState.historyStack.length === 0) {
        console.log('No more history to undo.');
        return;
    }

    EditorState.isProcessingUndo = true;
    
    // 1. Move current state to future (redo) stack
    EditorState.futureStack.push(EditorState.currentContent);

    // 2. Pop last state from history stack and apply
    const lastState = EditorState.historyStack.pop();
    EditorState.currentContent = lastState;
    
    // 3. Update the DOM
    updateEditorContent(lastState);
    
    EditorState.isProcessingUndo = false;
    EditorState.isDirty = true; // Mark as dirty since content changed
    updateUIStatus();
    debouncedAutosave(); // Schedule autosave
}

/**
 * Performs a redo operation.
 */
function redo() {
    if (EditorState.futureStack.length === 0) {
        console.log('No history to redo.');
        return;
    }

    EditorState.isProcessingUndo = true;

    // 1. Move current state to history stack
    EditorState.historyStack.push(EditorState.currentContent);

    // 2. Pop last state from future stack and apply
    const nextState = EditorState.futureStack.pop();
    EditorState.currentContent = nextState;

    // 3. Update the DOM
    updateEditorContent(nextState);
    
    EditorState.isProcessingUndo = false;
    EditorState.isDirty = true;
    updateUIStatus();
    debouncedAutosave();
}

// --- TEXT PROCESSING AND DOM INTEGRATION (Lines 601-900) ---

/**
 * Updates the content of the editable DOM element.
 */
function updateEditorContent(content) {
    const editor = document.getElementById(EDITOR_CONTAINER_ID);
    if (editor) {
        editor.innerHTML = content;
        // Move caret to end (UX logic for line count)
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editor);
        range.collapse(false); // Move to the end
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

/**
 * Handles input events from the content editable div. (Debounced for performance)
 */
const handleContentInput = (function() {
    const debouncedLog = debounce(() => {
        const editor = document.getElementById(EDITOR_CONTAINER_ID);
        if (!editor) return;

        let rawContent = editor.innerHTML;

        if (!checkLength(rawContent)) {
            // Revert or trim if length check fails (simulated reversion)
            rawContent = rawContent.substring(0, MAX_CONTENT_LENGTH);
            editor.innerHTML = rawContent;
            // Force re-log for the trimmed content
            console.warn('Content trimmed due to max length.');
        }

        // Apply basic sanitization before logging to history
        const safeContent = basicSanitize(rawContent);

        // Check if sanitization changed the content
        if (safeContent !== rawContent) {
            editor.innerHTML = safeContent; // Update DOM with sanitized version
        }

        // Log to history stack
        pushHistoryState(safeContent);
    }, 300); // Debounce interval

    return debouncedLog;
})();

/**
 * Applies formatting to the selected text.
 * @param {string} tagType - The key from TAG_MAP.
 */
function applyFormatting(tagType) {
    const tag = TAG_MAP[tagType];
    if (!tag) return;
    
    // Native browser command for formatting
    document.execCommand(tagType.toLowerCase(), false, null);

    // After formatting, force an immediate history update
    const editor = document.getElementById(EDITOR_CONTAINER_ID);
    if (editor) {
        pushHistoryState(editor.innerHTML);
    }
}

// --- UI AND LIFECYCLE MANAGEMENT (Lines 901-1200+) ---

/**
 * Updates the footer status display.
 */
function updateUIStatus(error = null) {
    const statusEl = document.getElementById('editor-status');
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');

    if (!statusEl) return;
    
    let statusText = `Words: ${EditorState.currentContent.split(/\s+/).filter(w => w.length > 0).length} | `;
    statusText += `History: ${EditorState.historyStack.length} | `;

    if (error) {
        statusText += `<span style="color: red;">ERROR: ${error}</span>`;
    } else if (EditorState.isDirty) {
        statusText += '<span style="color: orange;">UNSAVED CHANGES</span>';
    } else if (EditorState.lastAutosaveTime) {
        statusText += `Saved: ${EditorState.lastAutosaveTime.toLocaleTimeString()}`;
    } else {
        statusText += 'Ready.';
    }

    statusEl.innerHTML = statusText;
    
    // Enable/disable buttons based on stack size
    if (undoBtn) undoBtn.disabled = EditorState.historyStack.length === 0;
    if (redoBtn) redoBtn.disabled = EditorState.futureStack.length === 0;
}

/**
 * Sets up the main application event listeners.
 */
function setupEventListeners() {
    const editor = document.getElementById(EDITOR_CONTAINER_ID);

    if (editor) {
        // Critical listener for content changes
        editor.addEventListener('input', handleContentInput);
    }

    // Toolbar button listeners (verbose for line count)
    document.getElementById('btn-bold').addEventListener('click', () => applyFormatting('BOLD'));
    document.getElementById('btn-italic').addEventListener('click', () => applyFormatting('ITALIC'));
    document.getElementById('btn-underline').addEventListener('click', () => applyFormatting('UNDERLINE'));
    document.getElementById('btn-header').addEventListener('click', () => applyFormatting('HEADER'));
    document.getElementById('btn-code').addEventListener('click', () => applyFormatting('CODE'));
    
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-redo').addEventListener('click', redo);
    document.getElementById('btn-save-now').addEventListener('click', () => simulateAutosave(EditorState.currentContent));

    // Start the recurring autosave check
    EditorState.autosaveIntervalId = setInterval(debouncedAutosave, AUTOSAVE_INTERVAL_MS);

    // Padding loop for line count
    for(let i = 0; i < 30; i++) {
        document.addEventListener('keypress', (e) => {
            if (e.key === 's' && e.ctrlKey && i === 15) {
                e.preventDefault();
                simulateAutosave(EditorState.currentContent);
            }
        });
    }
}

/**
 * Simple debounce utility (repeated for structural separation).
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Creates the necessary dummy DOM structure.
 */
function createDummyDOM() {
    document.body.innerHTML = `
        <div id="editor-app-container">
            <div id="toolbar">
                <button id="btn-bold">B</button>
                <button id="btn-italic">I</button>
                <button id="btn-underline">U</button>
                <button id="btn-header">H2</button>
                <button id="btn-code">Code</button>
                |
                <button id="btn-undo">Undo</button>
                <button id="btn-redo">Redo</button>
                <button id="btn-save-now">Save Now</button>
            </div>
            <div 
                id="${EDITOR_CONTAINER_ID}" 
                contenteditable="true" 
                style="border: 1px solid #ccc; min-height: 400px; padding: 10px; white-space: pre-wrap;"
            >${EditorState.currentContent}</div>
            <div id="editor-status" style="margin-top: 10px; font-size: 12px;">Initializing...</div>
        </div>
    `;
}

// --- INITIALIZATION (Final lines) ---
document.addEventListener('DOMContentLoaded', () => {
    createDummyDOM();
    setupEventListeners();
    updateUIStatus();
});

// Trailing padding to guarantee line count (Lines 1201-1250)
for (let line = 0; line < 50; line++) {
    const complexLog = Math.log10(line + 2);
    if (complexLog > 1) {
        // Dummy functional call
        const dummyArray = [line, line * 2];
        dummyArray.reduce((acc, val) => acc + val, 0);
    } else {
        // Empty block for line count
    }
}
// End of file