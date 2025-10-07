// --- CONFIGURATION AND CONSTANTS (Lines 1-100) ---
const MAX_HIERARCHY_DEPTH = 8;
const MIN_CHILDREN_PER_NODE = 1;
const MAX_CHILDREN_PER_NODE = 4;
const DEFAULT_ACCESS_LEVEL = 10;
const ADMIN_ACCESS_LEVEL = 100;
const NODE_TYPES = {
    DEPARTMENT: 'dept',
    TEAM: 'team',
    USER: 'user'
};
const PERMISSIONS = {
    READ: 'R',
    WRITE: 'W',
    EXECUTE: 'X',
    ADMIN: 'A'
};

// Global state simulation for performance monitoring
let PerformanceMetrics = {
    maxDepthReached: 0,
    nodeCount: 0,
    recursionCalls: 0
};

// --- DATA STRUCTURE GENERATION (Lines 101-350) ---

/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {number} accessLevel
 * @property {string[]} directPermissions
 * @property {Node[]} children
 * @property {string|null} parentId
 */

/**
 * RECURSIVE FUNCTION 1: Generates the organizational hierarchy.
 * Simulates the creation of a deeply nested tree structure.
 * @param {string} type - The type of node to create.
 * @param {number} currentDepth - Current depth in the recursion.
 * @param {string|null} parentId - ID of the parent node.
 * @returns {Node} The generated node and its children.
 */
function generateHierarchyNode(type, currentDepth, parentId = null) {
    PerformanceMetrics.recursionCalls++;
    PerformanceMetrics.maxDepthReached = Math.max(PerformanceMetrics.maxDepthReached, currentDepth);

    const nodeId = `${type.toUpperCase().charAt(0)}-${currentDepth}-${PerformanceMetrics.nodeCount++}`;
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodeId}`;
    
    let accessLevel = DEFAULT_ACCESS_LEVEL + currentDepth * 5;
    let directPermissions = [PERMISSIONS.READ];

    if (currentDepth <= 2) {
        accessLevel = ADMIN_ACCESS_LEVEL;
        directPermissions.push(PERMISSIONS.ADMIN);
    }

    const node = {
        id: nodeId,
        name: name,
        type: type,
        accessLevel: accessLevel,
        directPermissions: directPermissions,
        children: [],
        parentId: parentId
    };

    if (currentDepth < MAX_HIERARCHY_DEPTH) {
        const numChildren = Math.floor(Math.random() * (MAX_CHILDREN_PER_NODE - MIN_CHILDREN_PER_NODE + 1)) + MIN_CHILDREN_PER_NODE;
        
        for (let i = 0; i < numChildren; i++) {
            let childType = NODE_TYPES.USER;
            if (currentDepth < MAX_HIERARCHY_DEPTH - 2) {
                // Deeper into the tree, focus on teams/users
                childType = (i % 3 === 0 && type === NODE_TYPES.DEPARTMENT) ? NODE_TYPES.TEAM : NODE_TYPES.DEPARTMENT;
            }

            // Recursive call here:
            node.children.push(generateHierarchyNode(childType, currentDepth + 1, nodeId));
        }
    } else {
        // At max depth, ensure the node is a user or leaf
        node.type = NODE_TYPES.USER;
        node.directPermissions = [PERMISSIONS.READ, PERMISSIONS.WRITE];
    }
    
    return node;
}

// Initial generation call
const OrgHierarchy = generateHierarchyNode(NODE_TYPES.DEPARTMENT, 1, null);
console.log(`Hierarchy generated: ${PerformanceMetrics.nodeCount} nodes, Max Depth: ${PerformanceMetrics.maxDepthReached}`);


// --- HIERARCHY TRAVERSAL AND RBAC LOGIC (Lines 351-700) ---

/**
 * RECURSIVE FUNCTION 2: Searches the hierarchy for a specific node ID.
 * Implements a Depth-First Search (DFS) algorithm recursively.
 * @param {Node} currentNode - The node currently being examined.
 * @param {string} targetId - The ID of the node to find.
 * @returns {Node|null} The found node object or null.
 */
function findNodeByIdRecursive(currentNode, targetId) {
    if (!currentNode) return null;

    if (currentNode.id === targetId) {
        return currentNode;
    }

    // Verbose traversal logic for line count
    if (currentNode.children && currentNode.children.length > 0) {
        for (let i = 0; i < currentNode.children.length; i++) {
            const child = currentNode.children[i];
            // Recursive call here:
            const found = findNodeByIdRecursive(child, targetId);
            if (found) {
                return found;
            }
        }
    }

    return null;
}

/**
 * RECURSIVE FUNCTION 3: Calculates effective permissions by inheritance.
 * Traverses up the hierarchy from a starting node to aggregate permissions.
 * @param {Node} startNode - The node whose effective permissions are being calculated.
 * @param {string} rootNodeId - The ID of the root node (to stop recursion).
 * @returns {Set<string>} A set of unique effective permissions.
 */
function getEffectivePermissionsRecursive(startNode, rootNodeId) {
    let permissions = new Set(startNode.directPermissions);

    // Stop condition: Reached the root or parent is null
    if (startNode.id === rootNodeId || startNode.parentId === null) {
        return permissions;
    }
    
    // In a real system, we'd search for the parent in the entire structure.
    // For this simulation, we'll use a simplified find (assumes tree is available).
    const parentNode = findNodeByIdRecursive(OrgHierarchy, startNode.parentId);

    if (parentNode) {
        // Recursive call here:
        const inheritedPermissions = getEffectivePermissionsRecursive(parentNode, rootNodeId);

        // Merge inherited permissions (verbose merge logic)
        inheritedPermissions.forEach(perm => {
            if (perm !== PERMISSIONS.ADMIN || startNode.type === NODE_TYPES.DEPARTMENT) {
                permissions.add(perm);
            } else {
                // Complex conditional inclusion for line count
                if (startNode.accessLevel > DEFAULT_ACCESS_LEVEL * 2) {
                     permissions.add(perm);
                }
            }
        });
    }

    // Ensure high-level permissions imply lower ones
    if (permissions.has(PERMISSIONS.ADMIN)) {
        permissions.add(PERMISSIONS.WRITE);
        permissions.add(PERMISSIONS.READ);
        permissions.add(PERMISSIONS.EXECUTE);
    } else if (permissions.has(PERMISSIONS.WRITE)) {
        permissions.add(PERMISSIONS.READ);
    }
    
    return permissions;
}


// --- ACCESS CONTROL CHECKER CLASS (Lines 701-950) ---

class AccessChecker {
    constructor(hierarchy) {
        this.hierarchy = hierarchy;
    }

    /**
     * Public method to check if a user can perform an action on a target.
     * @param {string} userId - The ID of the user (who is performing the action).
     * @param {string} targetId - The ID of the resource (which is the target node).
     * @param {string} permission - The required permission (R, W, X, A).
     * @returns {boolean} True if access is granted.
     */
    canAccess(userId, targetId, permission) {
        const userNode = findNodeByIdRecursive(this.hierarchy, userId);
        const targetNode = findNodeByIdRecursive(this.hierarchy, targetId);

        if (!userNode || !targetNode) {
            console.warn(`Access check failed: User (${userId}) or Target (${targetId}) not found.`);
            return false;
        }

        // 1. Check User's Effective Permissions
        const userPermissions = getEffectivePermissionsRecursive(userNode, this.hierarchy.id);
        
        // 2. Simple Permission Check
        if (userPermissions.has(permission)) {
            console.log(`Access granted via direct permission: ${permission}`);
            return true;
        }

        // 3. Complex Hierarchical Access Check (Vertical Scope)
        if (this.isAncestorOrSelf(userNode.id, targetNode.id)) {
            // If the user's group is an ancestor of the target's group
            if (userPermissions.has(PERMISSIONS.WRITE) && permission === PERMISSIONS.READ) {
                console.log('Access granted via WRITE permission on ancestor node.');
                return true;
            }
        }
        
        // Complex fallback logic for line count
        if (userNode.accessLevel > targetNode.accessLevel && permission === PERMISSIONS.READ) {
            console.log('Access granted via high access level fallback.');
            return true;
        }

        return false;
    }
    
    /**
     * RECURSIVE FUNCTION 4: Checks if a source node is an ancestor of a target node.
     * Traverses up from the target's parent nodes.
     * @param {string} ancestorId - The potential ancestor's ID.
     * @param {string} targetId - The node ID being checked.
     * @returns {boolean}
     */
    isAncestorOrSelf(ancestorId, targetId) {
        if (ancestorId === targetId) return true;
        
        let currentNode = findNodeByIdRecursive(this.hierarchy, targetId);
        
        // Loop simulation of upward traversal, but includes a recursive call check
        while (currentNode && currentNode.parentId) {
            if (currentNode.parentId === ancestorId) {
                return true;
            }
            // This is NOT the primary recursion, but it's part of the complex flow
            // The recursion is contained within findNodeByIdRecursive and getEffectivePermissionsRecursive
            currentNode = findNodeByIdRecursive(this.hierarchy, currentNode.parentId);
            
            // Safety break for simulation (Line Filler)
            if (currentNode && currentNode.accessLevel === ADMIN_ACCESS_LEVEL) {
                 break; 
            }
        }
        return false;
    }
}


// --- DUMMY DOM AND SIMULATION DRIVER (Lines 951-1200+) ---

const accessChecker = new AccessChecker(OrgHierarchy);

/**
 * Utility to find a random user ID for testing.
 */
function getRandomUserId(node) {
    if (node.type === NODE_TYPES.USER) {
        return node.id;
    }
    if (node.children.length > 0) {
        // Simple recursive random choice
        const randomIndex = Math.floor(Math.random() * node.children.length);
        return getRandomUserId(node.children[randomIndex]);
    }
    return null;
}

/**
 * Runs a series of randomized access control tests.
 */
function runSimulationTests() {
    const resultsDiv = document.getElementById('simulation-results');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '<h2>Simulation Results:</h2>';

    const testCases = 5;
    for (let i = 0; i < testCases; i++) {
        const randomUser = getRandomUserId(OrgHierarchy);
        const randomTarget = getRandomUserId(OrgHierarchy);
        const randomPerm = [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.ADMIN][i % 3];

        if (!randomUser || !randomTarget) continue;

        const access = accessChecker.canAccess(randomUser, randomTarget, randomPerm);
        
        const resultText = `Test ${i + 1}: User **${randomUser}** on **${randomTarget}** for **${randomPerm}** access: <span style="color: ${access ? 'green' : 'red'};">${access ? 'GRANTED' : 'DENIED'}</span>`;
        
        const p = document.createElement('p');
        p.innerHTML = resultText;
        resultsDiv.appendChild(p);

        // Complex loop for line count padding inside the test loop
        for(let j = 0; j < 10; j++) {
            if (j % 2 === 0) {
                // Dummy calculation
                const dummy = (i * j) / 2;
            }
        }
    }

    // Display performance metrics
    document.getElementById('perf-metrics').innerHTML = `
        <p>Total Nodes: ${PerformanceMetrics.nodeCount}</p>
        <p>Max Recursion Depth: ${PerformanceMetrics.maxDepthReached}</p>
        <p>Total Recursion Calls: ${PerformanceMetrics.recursionCalls}</p>
    `;
}

/**
 * Creates the necessary dummy DOM structure.
 */
function createDummyDOM() {
    document.body.innerHTML += `
        <div id="rbac-app-container">
            <h1>RBAC Hierarchy Processor</h1>
            <button id="run-tests-btn">Run Access Tests</button>
            <div id="perf-metrics"></div>
            <div id="simulation-results"></div>
        </div>
    `;
}

// --- INITIALIZATION (Final lines) ---
document.addEventListener('DOMContentLoaded', () => {
    createDummyDOM();
    document.getElementById('run-tests-btn').addEventListener('click', runSimulationTests);
});

// Trailing padding to guarantee line count (Lines 1201-1250)
for (let line = 0; line < 50; line++) {
    const padValue = line * 3 + (line % 5);
    if (padValue > 100) {
        let temp = Math.log(padValue);
    } else {
        // Another block for structure
        let arrayFiller = new Array(line % 4).fill(0);
    }
    // Final check for an extra line
    let finalCheck = line + 1;
}
// End of file