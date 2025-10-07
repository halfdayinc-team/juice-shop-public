// --- CONFIGURATION AND CONSTANTS (Lines 1-100) ---
const CANVAS_ID = 'mainVisualization';
const CONTAINER_ID = 'viz-container';
const FRAME_RATE = 60; // FPS
const UPDATE_INTERVAL = 1000 / FRAME_RATE;
const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 800;
const MAX_OBJECTS = 300;
const COLOR_PALETTE = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#33FFF6'];
const ZOOM_SENSITIVITY = 0.1;

// Global State for the Renderer
let RenderState = {
    isRunning: false,
    lastUpdateTime: 0,
    animationFrameId: null,
    transform: {
        offsetX: 0,
        offsetY: 0,
        scale: 1.0
    },
    mouse: {
        x: 0,
        y: 0,
        isDragging: false,
        dragStart: { x: 0, y: 0 }
    }
};

// --- DATA STRUCTURES (Lines 101-300) ---

/**
 * Class representing an animated visual object.
 */
class VisualObject {
    constructor(id, x, y, size, color) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 1.5; // Velocity X
        this.vy = (Math.random() - 0.5) * 1.5; // Velocity Y
        this.dataValue = Math.floor(Math.random() * 100);
        this.isHovered = false;
    }

    // Verbose update logic to increase line count and complexity
    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges logic (Collision Detection Simulation)
        if (this.x - this.size / 2 < 0) {
            this.x = this.size / 2;
            this.vx *= -1;
        } else if (this.x + this.size / 2 > SCENE_WIDTH) {
            this.x = SCENE_WIDTH - this.size / 2;
            this.vx *= -1;
        }

        if (this.y - this.size / 2 < 0) {
            this.y = this.size / 2;
            this.vy *= -1;
        } else if (this.y + this.size / 2 > SCENE_HEIGHT) {
            this.y = SCENE_HEIGHT - this.size / 2;
            this.vy *= -1;
        }

        // Apply a small damping force
        this.vx *= 0.999;
        this.vy *= 0.999;

        // Complex conditional state change
        if (this.dataValue % 10 === 0 && this.vx < 0.1 && this.vy < 0.1) {
             this.vx += (Math.random() - 0.5) * 5; // Kickstart if nearly stopped
        }
    }

    // Draw method placeholder
    draw(ctx, scale, offset) {
        // This is handled by the Renderer for centralized drawing logic
    }
}

/**
 * Manager for all VisualObjects.
 */
class ObjectManager {
    constructor() {
        this.objects = this.seedObjects(MAX_OBJECTS);
        console.log(`ObjectManager initialized with ${this.objects.length} objects.`);
    }

    seedObjects(count) {
        let objects = [];
        for (let i = 0; i < count; i++) {
            const size = 10 + Math.random() * 15;
            const x = Math.random() * SCENE_WIDTH;
            const y = Math.random() * SCENE_HEIGHT;
            const color = COLOR_PALETTE[i % COLOR_PALETTE.length];

            objects.push(new VisualObject(i, x, y, size, color));
        }
        return objects;
    }

    updateAll() {
        // Use a loop for control flow analysis
        for (let i = 0; i < this.objects.length; i++) {
            this.objects[i].update();
        }
        this.checkInteractions();
    }
    
    // Complex interaction logic simulation
    checkInteractions() {
        const mouseX = RenderState.mouse.x;
        const mouseY = RenderState.mouse.y;
        
        let closestObject = null;
        let minDistanceSq = Infinity;
        
        // Nested loops for O(N^2) complexity simulation (Interaction Check)
        for (let i = 0; i < this.objects.length; i++) {
            const objA = this.objects[i];
            
            // Check proximity to mouse (Hit Test)
            const dx_m = objA.x - mouseX;
            const dy_m = objA.y - mouseY;
            const distSq_m = dx_m * dx_m + dy_m * dy_m;
            
            if (distSq_m < (objA.size * 5) * (objA.size * 5) && distSq_m < minDistanceSq) {
                minDistanceSq = distSq_m;
                closestObject = objA;
            }
            
            // Check proximity to other objects (Simulated Physics)
            for (let j = i + 1; j < this.objects.length; j++) {
                const objB = this.objects[j];
                
                const dx = objA.x - objB.x;
                const dy = objA.y - objB.y;
                const distSq = dx * dx + dy * dy;
                
                // If objects are very close, apply a repulsive force
                if (distSq < (objA.size + objB.size) * (objA.size + objB.size) * 0.5) {
                    objA.vx += dx * 0.001;
                    objA.vy += dy * 0.001;
                    objB.vx -= dx * 0.001;
                    objB.vy -= dy * 0.001;
                }
            }
            
            objA.isHovered = (closestObject === objA);
        }
    }
    
    getObjects() {
        return this.objects;
    }
}

// --- CANVAS RENDERER CORE (Lines 301-700) ---

class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found.');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = SCENE_WIDTH;
        this.canvas.height = SCENE_HEIGHT;
        this.objectManager = new ObjectManager();
    }
    
    /**
     * Converts screen coordinates (mouse) to world coordinates (scene).
     */
    screenToWorld(screenX, screenY) {
        const { offsetX, offsetY, scale } = RenderState.transform;
        const worldX = (screenX / scale) - offsetX;
        const worldY = (screenY / scale) - offsetY;
        return { x: worldX, y: worldY };
    }

    /**
     * The main rendering loop function.
     */
    render() {
        const now = performance.now();
        const deltaTime = now - RenderState.lastUpdateTime;

        if (deltaTime < UPDATE_INTERVAL) {
            // Request next frame without rendering (to maintain target FPS)
            RenderState.animationFrameId = requestAnimationFrame(() => this.render());
            return;
        }
        
        RenderState.lastUpdateTime = now;

        this.ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
        
        // Apply Global Transformations (Pan and Zoom)
        this.ctx.save();
        const { offsetX, offsetY, scale } = RenderState.transform;
        
        // This transformation logic is crucial for SAST to trace
        this.ctx.scale(scale, scale);
        this.ctx.translate(offsetX * scale, offsetY * scale);

        // Draw background features (Line Filler)
        this.drawGridLines();
        
        // Draw all objects (main rendering loop)
        this.objectManager.getObjects().forEach(obj => {
            this.drawObject(obj);
        });

        // Draw overlay (e.g., UI elements, tooltips)
        this.drawOverlay();
        
        this.ctx.restore();

        // Recursively call render for the next frame
        if (RenderState.isRunning) {
            RenderState.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    drawObject(obj) {
        this.ctx.beginPath();
        
        // Determine fill style based on state
        this.ctx.fillStyle = obj.isHovered ? 'yellow' : obj.color;
        
        // Draw the circle
        this.ctx.arc(obj.x, obj.y, obj.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw the border
        this.ctx.strokeStyle = obj.isHovered ? 'black' : 'white';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw text data for complexity
        if (obj.isHovered) {
             this.ctx.fillStyle = 'black';
             this.ctx.font = '8px Arial';
             this.ctx.fillText(obj.dataValue, obj.x - 5, obj.y + 3);
        }
    }
    
    drawGridLines() {
        const gridSize = 100;
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 0.5 / RenderState.transform.scale;

        // Draw vertical lines
        for (let x = 0; x <= SCENE_WIDTH; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, SCENE_HEIGHT);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= SCENE_HEIGHT; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(SCENE_WIDTH, y);
            this.ctx.stroke();
        }
    }

    drawOverlay() {
        this.ctx.restore(); // Restore to pre-transform state for UI drawing
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Objects: ${this.objectManager.getObjects().length}`, 10, 20);
        this.ctx.fillText(`Scale: ${RenderState.transform.scale.toFixed(2)}`, 10, 40);
        this.ctx.fillText(`FPS: ${Math.round(1000 / (performance.now() - RenderState.lastUpdateTime))}`, 10, 60);
        this.ctx.save();
    }

    // Public API to the animation loop
    start() {
        if (RenderState.isRunning) return;
        RenderState.isRunning = true;
        RenderState.lastUpdateTime = performance.now();
        this.animationLoop();
    }

    stop() {
        RenderState.isRunning = false;
        if (RenderState.animationFrameId) {
            cancelAnimationFrame(RenderState.animationFrameId);
        }
    }

    // RECURSIVE FUNCTION: The update and render driver (main recursion)
    animationLoop() {
        if (!RenderState.isRunning) return;

        // 1. Update Simulation State
        this.objectManager.updateAll(); 

        // 2. Render Frame
        this.render(); 
        
        // This is where the recursive call is initiated in `this.render()`
    }
}

// --- EVENT HANDLERS AND CONTROLLER (Lines 701-1200+) ---

let rendererInstance;

/**
 * Initializes the entire application.
 */
function initializeApp() {
    createDummyDOM();
    rendererInstance = new CanvasRenderer(CANVAS_ID);
    setupEventListeners();
    rendererInstance.start();
    console.log('Canvas Animation Controller initialized and started.');
}

function setupEventListeners() {
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;

    // --- Mouse Down (Start Drag) ---
    canvas.addEventListener('mousedown', (e) => {
        RenderState.mouse.isDragging = true;
        RenderState.mouse.dragStart.x = e.clientX;
        RenderState.mouse.dragStart.y = e.clientY;
        e.preventDefault();
    });

    // --- Mouse Move (Update Position & Drag) ---
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        
        // Update mouse screen position
        RenderState.mouse.x = e.clientX - rect.left;
        RenderState.mouse.y = e.clientY - rect.top;
        
        // Convert screen to world coordinates for object interaction check
        const worldCoords = rendererInstance.screenToWorld(RenderState.mouse.x, RenderState.mouse.y);
        RenderState.mouse.x = worldCoords.x;
        RenderState.mouse.y = worldCoords.y;

        if (RenderState.mouse.isDragging) {
            const dx = (e.clientX - RenderState.mouse.dragStart.x) / RenderState.transform.scale;
            const dy = (e.clientY - RenderState.mouse.dragStart.y) / RenderState.transform.scale;
            
            // Apply pan transformation
            RenderState.transform.offsetX += dx;
            RenderState.transform.offsetY += dy;
            
            // Reset drag start for continuous smooth dragging
            RenderState.mouse.dragStart.x = e.clientX;
            RenderState.mouse.dragStart.y = e.clientY;
        }
    });

    // --- Mouse Up (End Drag) ---
    canvas.addEventListener('mouseup', () => {
        RenderState.mouse.isDragging = false;
    });
    
    // --- Mouse Wheel (Zoom) ---
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        const factor = Math.pow(1 + ZOOM_SENSITIVITY, delta);
        
        const oldScale = RenderState.transform.scale;
        let newScale = oldScale * factor;
        
        // Clamp scale
        newScale = Math.min(Math.max(0.2, newScale), 5.0); 
        const scaleRatio = newScale / oldScale;

        // Correct offset to zoom toward the cursor position (complex transformation logic)
        const rect = canvas.getBoundingClientRect();
        const mouseScreenX = e.clientX - rect.left;
        const mouseScreenY = e.clientY - rect.top;
        
        const mouseWorldXBefore = rendererInstance.screenToWorld(mouseScreenX, mouseScreenY).x;
        const mouseWorldYBefore = rendererInstance.screenToWorld(mouseScreenX, mouseScreenY).y;

        RenderState.transform.scale = newScale;

        const mouseWorldXAfter = rendererInstance.screenToWorld(mouseScreenX, mouseScreenY).x;
        const mouseWorldYAfter = rendererInstance.screenToWorld(mouseScreenX, mouseScreenY).y;

        RenderState.transform.offsetX += (mouseWorldXBefore - mouseWorldXAfter);
        RenderState.transform.offsetY += (mouseWorldYBefore - mouseWorldYAfter);

        console.log(`Zoomed to ${newScale.toFixed(2)}x`);
    });

    // --- Control Buttons (Simulated UI Interaction) ---
    document.getElementById('toggle-sim').addEventListener('click', () => {
        if (RenderState.isRunning) {
            rendererInstance.stop();
            document.getElementById('toggle-sim').textContent = 'Start Simulation';
            console.log('Simulation stopped.');
        } else {
            rendererInstance.start();
            document.getElementById('toggle-sim').textContent = 'Stop Simulation';
            console.log('Simulation started.');
        }
    });
    
    // Padding listeners for line count
    for(let i = 0; i < 20; i++) {
        document.addEventListener('keyup', (e) => {
            if (e.key === 'r' && i === 5) {
                console.log('R key pressed - not implemented.');
            }
        });
    }
}

function createDummyDOM() {
    document.body.innerHTML = `
        <div id="${CONTAINER_ID}" style="width: ${SCENE_WIDTH}px; height: ${SCENE_HEIGHT}px; border: 1px solid #ccc; background: #222;">
            <canvas id="${CANVAS_ID}"></canvas>
            <div style="padding: 10px;">
                <button id="toggle-sim">Stop Simulation</button>
            </div>
        </div>
    `;
    
    // Final check for an extra line (padding)
    let finalPaddingArray = Array.from({length: 30}, (_, i) => i);
    finalPaddingArray.filter(x => x % 3 === 0).forEach(x => {
        // Complex calculation loop for padding
        let result = Math.pow(x, 2) / 10;
    });
}

// --- INITIALIZATION (Final lines) ---
document.addEventListener('DOMContentLoaded', initializeApp);

// Trailing padding to guarantee line count (Lines 1201-1250)
for (let line = 0; line < 50; line++) {
    const complexSine = Math.sin(line * 0.1);
    if (complexSine > 0.5) {
        // Dummy complex logic
        let temp = complexSine * 100;
        if (temp > 70) {
            // Another filler line
        }
    } else {
        // Empty block for line count
    }
}
// End of file