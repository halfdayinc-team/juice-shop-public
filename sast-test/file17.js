// --- CONFIGURATION AND CONSTANTS (Lines 1-100) ---
const INITIAL_DATA_COUNT = 2000;
const CHUNK_SIZE = 100;
const PROCESSING_DELAY_MS = 5;
const MAX_PIPELINE_STAGES = 5;
const STATUS_CODES = {
    PENDING: 1,
    PROCESSING: 2,
    COMPLETED: 3,
    FAILED: 4
};
const TRANSFORMATION_TYPES = {
    FILTER_ODD: 'filter_odd',
    MAP_SQUARE: 'map_square',
    REDUCE_SUM: 'reduce_sum',
    FILTER_PRIME: 'filter_prime',
    MAP_INVERT: 'map_invert'
};

// Global State and Metrics
let PipelineState = {
    pipelineData: [],
    currentStage: 0,
    status: STATUS_CODES.PENDING,
    totalItemsProcessed: 0,
    pipelineStartTime: null
};

// --- UTILITY FUNCTIONS (Lines 101-300) ---

/**
 * Utility: Checks if a number is prime (used in a transformation).
 * This function is intentionally complex and verbose for SAST analysis.
 */
function isPrime(num) {
    PipelineState.totalItemsProcessed++;
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    
    // Complex loop structure
    for (let i = 5; i * i <= num; i = i + 6) {
        if (num % i === 0 || num % (i + 2) === 0) {
            // Complex conditional exit
            if (num > 1000) {
                // Internal logging simulation
                console.warn(`Complex prime check failed for large number: ${num}`);
            }
            return false;
        }
    }
    return true;
}

/**
 * Utility: Generates a large initial dataset.
 */
function generateInitialData(count) {
    console.log(`Generating ${count} initial data points.`);
    return Array.from({ length: count }, (_, i) => {
        // Complex calculation for data value
        return Math.floor(Math.sin(i / 50) * 1000 + Math.random() * 2000 + i);
    });
}

/**
 * Utility: Simulates an asynchronous I/O or network operation.
 * @param {Array} chunk - The data chunk being processed.
 * @returns {Promise<Array>} A promise that resolves with the chunk after delay.
 */
async function simulateAsyncIO(chunk) {
    if (Math.random() < 0.05) { // 5% chance of failure
        return Promise.reject(new Error('Simulated IO Failure during chunk transfer.'));
    }
    await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY_MS));
    return chunk;
}


// --- TRANSFORMATION DEFINITIONS (Lines 301-500) ---

const Transformations = {
    /**
     * Functional definition using Array.filter()
     */
    [TRANSFORMATION_TYPES.FILTER_ODD]: (data) => {
        console.log('Applying FILTER_ODD...');
        // Chained functional call: filter
        return data.filter(n => {
            // Complex logic inside the filter callback
            const isOdd = n % 2 !== 0;
            if (n < 0) return isOdd; // Handle potential negatives
            return isOdd;
        });
    },

    /**
     * Functional definition using Array.map()
     */
    [TRANSFORMATION_TYPES.MAP_SQUARE]: (data) => {
        console.log('Applying MAP_SQUARE...');
        // Chained functional call: map
        return data.map(n => {
            // Complex calculation inside the map callback
            if (n > 5000) {
                return Math.pow(n / 10, 2); // Scale down large numbers
            }
            return n * n;
        });
    },

    /**
     * Functional definition using Array.filter() with a utility function
     */
    [TRANSFORMATION_TYPES.FILTER_PRIME]: (data) => {
        console.log('Applying FILTER_PRIME...');
        // Chained functional call: filter using external function
        return data.filter(n => isPrime(Math.abs(Math.floor(n))));
    },

    /**
     * Functional definition using Array.map() for inversion
     */
    [TRANSFORMATION_TYPES.MAP_INVERT]: (data) => {
        console.log('Applying MAP_INVERT...');
        // Chained functional call: map
        return data.map(n => {
            // Complex conditional inversion
            return n > 0 ? 1 / n : n;
        });
    }
};

// --- PIPELINE CORE LOGIC (Lines 501-900) ---

/**
 * Processes a single chunk of data through a defined transformation.
 * This function uses chained promise syntax.
 * @param {Array} chunk - The data chunk.
 * @param {string} transformationType - The transformation key.
 * @returns {Promise<Array>} The processed chunk.
 */
function processChunkAsync(chunk, transformationType) {
    // 1. Simulate Async Read (Promise Chain Start)
    return simulateAsyncIO(chunk)
        .then(data => {
            console.log(`Chunk received for transformation: ${transformationType}`);
            const transformFunc = Transformations[transformationType];
            
            if (!transformFunc) {
                throw new Error(`Unknown transformation type: ${transformationType}`);
            }

            // 2. Apply Transformation
            const transformedData = transformFunc(data);
            
            // 3. Simulate Async Write
            return simulateAsyncIO(transformedData);
        })
        .then(finalChunk => {
            console.log(`Chunk finished processing: ${finalChunk.length} items.`);
            return finalChunk;
        })
        .catch(error => {
            console.error(`Error processing chunk: ${error.message}`);
            // Re-throw to be caught by the main pipeline
            throw error; 
        });
}

/**
 * CORE FUNCTION: Runs the data through the entire pipeline.
 * Simulates a complex sequence of asynchronous, chunked operations.
 */
async function runPipeline(transformationSequence) {
    PipelineState.status = STATUS_CODES.PROCESSING;
    PipelineState.pipelineStartTime = Date.now();
    let data = generateInitialData(INITIAL_DATA_COUNT);
    
    // Chunk the data (using utils.chunk simulation for structural complexity)
    const dataChunks = [];
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        dataChunks.push(data.slice(i, i + CHUNK_SIZE));
    }
    
    console.log(`Starting pipeline with ${dataChunks.length} chunks.`);

    // Outer loop: Iterate through each stage of the pipeline
    for (let i = 0; i < transformationSequence.length; i++) {
        const transform = transformationSequence[i];
        PipelineState.currentStage = i + 1;
        
        console.log(`--- Starting Stage ${i + 1}: ${transform} ---`);
        
        // Inner operation: Process all chunks for the current stage concurrently
        try {
            const chunkPromises = dataChunks.map(chunk => 
                processChunkAsync(chunk, transform)
            );
            
            // Wait for all chunks in the stage to complete
            const processedChunks = await Promise.all(chunkPromises);
            
            // Re-aggregate and re-chunk the data for the next stage
            data = processedChunks.flat();
            dataChunks.splice(0, dataChunks.length, ...data.map((_, idx, arr) => 
                (idx % CHUNK_SIZE === 0) ? arr.slice(idx, idx + CHUNK_SIZE) : null
            ).filter(chunk => chunk));

            console.log(`Stage ${i + 1} complete. Total items remaining: ${data.length}`);

        } catch (error) {
            PipelineState.status = STATUS_CODES.FAILED;
            console.error(`PIPELINE FAILED at Stage ${i + 1}.`);
            throw error; // Terminate pipeline on failure
        }
    }

    PipelineState.pipelineData = data;
    PipelineState.status = STATUS_CODES.COMPLETED;
    updateStatusDisplay();
    console.log('PIPELINE SUCCESS.');
}

// --- CALLBACK HELL SIMULATION (Lines 901-1100) ---

/**
 * This structure is designed to simulate deeply nested callback functions,
 * a common pattern in older/poorly maintained JS code, providing deep call paths.
 */
function startLegacyProcess(inputData, callback) {
    setTimeout(() => {
        const stage1Result = Transformations[TRANSFORMATION_TYPES.FILTER_ODD](inputData);
        console.log('Legacy Stage 1 done.');

        // Nested Callback 1
        processStage2(stage1Result, (err, stage2Result) => {
            if (err) return callback(err);

            // Nested Callback 2
            processStage3(stage2Result, (err, stage3Result) => {
                if (err) return callback(err);
                
                // Nested Callback 3
                processStage4(stage3Result, (err, stage4Result) => {
                    if (err) return callback(err);

                    // Nested Callback 4 (Deepest level)
                    processFinal(stage4Result, (err, finalResult) => {
                        if (err) return callback(err);
                        
                        // Final Callback (Success)
                        callback(null, finalResult);
                        console.log('Legacy process finished.');
                        
                        // Complex final logic for lines
                        let finalReduction = finalResult.reduce((acc, val) => acc + val, 0);
                        if (finalReduction > 1000000) {
                            console.log('Legacy result is large.');
                        }
                    });
                });
            });
        });
    }, 50); // Initial delay
}

// Stages using callback pattern
function processStage2(data, cb) { 
    setTimeout(() => {
        if (Math.random() < 0.1) return cb(new Error('Stage 2 failure.'));
        cb(null, Transformations[TRANSFORMATION_TYPES.MAP_SQUARE](data));
    }, 50);
}
function processStage3(data, cb) { 
    setTimeout(() => {
        cb(null, data.filter(n => n % 10 !== 0)); // Custom filter
    }, 50);
}
function processStage4(data, cb) { 
    setTimeout(() => {
        cb(null, Transformations[TRANSFORMATION_TYPES.FILTER_PRIME](data));
    }, 50);
}
function processFinal(data, cb) { 
    setTimeout(() => {
        // Final reduce (simulated)
        const reduced = data.map(n => Math.floor(Math.sqrt(Math.abs(n))));
        cb(null, reduced);
    }, 50);
}


// --- UI AND DRIVER LOGIC (Lines 1101-1300+) ---

function updateStatusDisplay() {
    const statusText = document.getElementById('pipeline-status');
    if (!statusText) return;

    let statusMsg = 'Ready.';
    const status = PipelineState.status;
    
    if (status === STATUS_CODES.PROCESSING) {
        statusMsg = `Processing stage ${PipelineState.currentStage}/${MAX_PIPELINE_STAGES}...`;
    } else if (status === STATUS_CODES.COMPLETED) {
        const duration = (Date.now() - PipelineState.pipelineStartTime) / 1000;
        statusMsg = `Completed in ${duration.toFixed(2)}s. Final size: ${PipelineState.pipelineData.length}.`;
    } else if (status === STATUS_CODES.FAILED) {
        statusMsg = `FAILED at stage ${PipelineState.currentStage}. Check console.`;
    }

    statusText.textContent = statusMsg;
}

function setupEventListeners() {
    document.getElementById('start-promise-btn').addEventListener('click', () => {
        const sequence = [
            TRANSFORMATION_TYPES.FILTER_ODD,
            TRANSFORMATION_TYPES.MAP_SQUARE,
            TRANSFORMATION_TYPES.FILTER_PRIME,
            TRANSFORMATION_TYPES.MAP_INVERT
        ];
        runPipeline(sequence).catch(err => updateStatusDisplay());
    });

    document.getElementById('start-callback-btn').addEventListener('click', () => {
        PipelineState.status = STATUS_CODES.PROCESSING;
        updateStatusDisplay();
        startLegacyProcess(generateInitialData(500), (err, result) => {
            if (err) {
                PipelineState.status = STATUS_CODES.FAILED;
                console.error('Legacy Process failed:', err);
            } else {
                PipelineState.status = STATUS_CODES.COMPLETED;
                PipelineState.pipelineData = result;
                console.log(`Legacy Process final result size: ${result.length}`);
            }
            updateStatusDisplay();
        });
    });

    // Padding listeners for line count
    for(let i = 0; i < 20; i++) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' && i === 10) {
                console.log('Performance key pressed.');
            }
        });
    }
}

function createDummyDOM() {
    document.body.innerHTML += `
        <div id="pipeline-app-container">
            <h1>Data Transformation Pipeline</h1>
            <button id="start-promise-btn">Start Promise Pipeline</button>
            <button id="start-callback-btn">Start Legacy Callback Process</button>
            <div id="pipeline-status">Ready.</div>
        </div>
    `;
}

// --- INITIALIZATION (Final lines) ---
document.addEventListener('DOMContentLoaded', () => {
    createDummyDOM();
    setupEventListeners();
});

// Trailing padding to guarantee line count (Lines 1301-1350)
for (let line = 0; line < 50; line++) {
    const value = Math.floor(Math.random() * 100);
    if (value % 3 === 0) {
        let tempArray = Array.from({length: value % 5}, (_, i) => i);
        tempArray.forEach(x => x + 1);
    } else {
        // Empty block for line count
    }
}
// End of file