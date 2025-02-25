class BipartiteMatchingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.setASize = 3;
        this.setBSize = 4;
        this.nodeRadius = 20;
        this.nodes = { A: [], B: [] };
        this.edges = [];
        this.highlightedEdges = new Set();
        
        // Interaction states
        this.isDragging = false;
        this.draggedNode = null;
        this.isEditingWeight = false;
        this.editingEdge = null;
        this.lastTap = 0; // For handling double taps on mobile
        
        // Initialize game
        this.resizeCanvas();
        this.initializeGraph();
        
        // Event listeners for both mouse and touch
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.handleEnd(e));
        
        // Global click/touch handler for weight editing
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        document.addEventListener('touchend', (e) => this.handleGlobalClick(e));
        
        // Input listeners
        document.getElementById('setASize').addEventListener('change', (e) => this.handleSizeChange('A', e));
        document.getElementById('setBSize').addEventListener('change', (e) => this.handleSizeChange('B', e));
        document.getElementById('resetGraph').addEventListener('click', () => this.resetGraph());
        document.getElementById('checkMatching').addEventListener('click', () => this.checkMatching());
    }

    resizeCanvas() {
        const container = document.getElementById('canvasContainer');
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.draw();
    }

    initializeGraph() {
        // Clear existing state
        this.nodes = { A: [], B: [] };
        this.edges = [];
        this.highlightedEdges = new Set();

        // Create nodes for set A
        const ySpacingA = this.canvas.height / (this.setASize + 1);
        for (let i = 0; i < this.setASize; i++) {
            this.nodes.A.push({
                x: this.canvas.width * 0.25,
                y: ySpacingA * (i + 1),
                label: `A${i + 1}`,
                set: 'A'
            });
        }

        // Create nodes for set B
        const ySpacingB = this.canvas.height / (this.setBSize + 1);
        for (let i = 0; i < this.setBSize; i++) {
            this.nodes.B.push({
                x: this.canvas.width * 0.75,
                y: ySpacingB * (i + 1),
                label: `B${i + 1}`,
                set: 'B'
            });
        }

        // Create edges with random weights
        for (let i = 0; i < this.setASize; i++) {
            for (let j = 0; j < this.setBSize; j++) {
                const weight1 = this.generateWeight();
                const weight2 = this.generateWeight();
                this.edges.push({
                    from: { set: 'A', index: i },
                    to: { set: 'B', index: j },
                    weight1: weight1,
                    weight2: weight2,
                    highlighted: false
                });
            }
        }

        this.updateScore();
        this.draw();
    }

    generateWeight() {
        // 25-50% chance of weight being close to 0
        if (Math.random() < 0.375) {
            return Number((Math.random() * 0.2 - 0.1).toFixed(2));
        }
        return Number((Math.random() * 2 - 1).toFixed(2));
    }
    getEventPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        // Handle both mouse and touch events
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    findNodeAtPosition(pos) {
        // Check set A
        for (let i = 0; i < this.nodes.A.length; i++) {
            const node = this.nodes.A[i];
            if (Math.hypot(node.x - pos.x, node.y - pos.y) < this.nodeRadius) {
                return { set: 'A', index: i };
            }
        }
        // Check set B
        for (let i = 0; i < this.nodes.B.length; i++) {
            const node = this.nodes.B[i];
            if (Math.hypot(node.x - pos.x, node.y - pos.y) < this.nodeRadius) {
                return { set: 'B', index: i };
            }
        }
        return null;
    }

    findEdgeAtPosition(pos) {
        for (let i = 0; i < this.edges.length; i++) {
            const edge = this.edges[i];
            const fromNode = this.nodes[edge.from.set][edge.from.index];
            const toNode = this.nodes[edge.to.set][edge.to.index];
            
            // Check if click/touch is near edge weight text
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            // Larger touch target for mobile
            const touchRadius = 20;
            if (Math.hypot(midX - pos.x, midY - pos.y) < touchRadius) {
                return i;
            }
        }
        return -1;
    }

    handleStart(e) {
        e.preventDefault(); // Prevent scrolling on mobile
        const pos = this.getEventPos(e);
        
        // Check for node dragging
        const node = this.findNodeAtPosition(pos);
        if (node) {
            this.isDragging = true;
            this.draggedNode = node;
            return;
        }

        // Check for edge interaction
        const edgeIndex = this.findEdgeAtPosition(pos);
        if (edgeIndex !== -1) {
            const now = Date.now();
            
            // Handle double tap/click for weight editing
            if (now - this.lastTap < 300 && this.lastEdgeClicked === edgeIndex) {
                this.startEdgeWeightEdit(edgeIndex, pos);
            } else {
                // Single tap/click - toggle highlight if valid
                if (this.canHighlightEdge(edgeIndex)) {
                    this.toggleEdgeHighlight(edgeIndex);
                    this.updateScore();
                }
            }
            
            this.lastTap = now;
            this.lastEdgeClicked = edgeIndex;
        }
    }

    handleMove(e) {
        e.preventDefault();
        if (this.isDragging && this.draggedNode) {
            const pos = this.getEventPos(e);
            const node = this.nodes[this.draggedNode.set][this.draggedNode.index];
            
            // Keep node within canvas bounds
            node.x = Math.max(this.nodeRadius, Math.min(this.canvas.width - this.nodeRadius, pos.x));
            node.y = Math.max(this.nodeRadius, Math.min(this.canvas.height - this.nodeRadius, pos.y));
            
            this.draw();
        }
    }

    handleEnd(e) {
        e.preventDefault();
        this.isDragging = false;
        this.draggedNode = null;
    }

    handleGlobalClick(e) {
        // Handle clicking/tapping outside of weight edit
        if (this.isEditingWeight && !e.target.classList.contains('weight-input')) {
            this.isEditingWeight = false;
            this.editingEdge = null;
            this.removeWeightInput();
            this.draw();
        }
    }

    startEdgeWeightEdit(edgeIndex, pos) {
        if (this.isEditingWeight) {
            return;
        }

        this.isEditingWeight = true;
        this.editingEdge = edgeIndex;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.1';
        input.min = '-1';
        input.max = '1';
        input.classList.add('weight-input');
        
        const edge = this.edges[edgeIndex];
        input.value = ((edge.weight1 + edge.weight2) / 2).toFixed(2);
        
        // Position input over the edge weight
        input.style.position = 'absolute';
        input.style.left = `${pos.x - 30}px`;
        input.style.top = `${pos.y - 10}px`;
        
        input.addEventListener('blur', () => this.handleWeightInputComplete(input));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        document.body.appendChild(input);
        input.focus();
    }
      handleWeightInputComplete(input) {
        if (this.editingEdge !== null) {
            const value = Math.max(-1, Math.min(1, Number(input.value)));
            const edge = this.edges[this.editingEdge];
            // Split the total weight between the two directed edges
            edge.weight1 = value / 2;
            edge.weight2 = value / 2;
            this.updateScore();
        }
        this.removeWeightInput();
        this.isEditingWeight = false;
        this.editingEdge = null;
        this.draw();
    }

    removeWeightInput() {
        const input = document.querySelector('.weight-input');
        if (input) {
            input.remove();
        }
    }

    handleSizeChange(set, e) {
        const value = parseInt(e.target.value);
        if (value >= 1 && value <= 10) {
            if (set === 'A') {
                this.setASize = value;
            } else {
                this.setBSize = value;
            }
            this.initializeGraph();
        }
    }

    resetGraph() {
        this.initializeGraph();
    }

    updateScore() {
        let totalScore = 0;
        for (let edgeIndex of this.highlightedEdges) {
            const edge = this.edges[edgeIndex];
            totalScore += edge.weight1 + edge.weight2;
        }
        document.getElementById('currentScore').textContent = totalScore.toFixed(2);
    }

    checkMatching() {
        const maxScore = this.findMaximumMatching();
        const currentScore = Array.from(this.highlightedEdges)
            .reduce((sum, edgeIndex) => {
                const edge = this.edges[edgeIndex];
                return sum + edge.weight1 + edge.weight2;
            }, 0);
        
        alert(Math.abs(currentScore - maxScore) < 0.01 ? 
            "Correct! This is the maximum matching!" : 
            "Not quite - there's a better matching possible!");
    }

    findMaximumMatching() {
        // Hungarian algorithm implementation
        const n = Math.max(this.setASize, this.setBSize);
        const weights = Array(n).fill().map(() => Array(n).fill(-Infinity));
        
        // Fill weight matrix
        for (let i = 0; i < this.setASize; i++) {
            for (let j = 0; j < this.setBSize; j++) {
                const edgeIndex = i * this.setBSize + j;
                weights[i][j] = this.edges[edgeIndex].weight1 + this.edges[edgeIndex].weight2;
            }
        }
        
        // Run Hungarian algorithm
        return this.hungarianAlgorithm(weights);
    }

    hungarianAlgorithm(weights) {
        const n = weights.length;
        const u = Array(n).fill(0);
        const v = Array(n).fill(0);
        const match = Array(n).fill(-1);
        
        for (let i = 0; i < n; i++) {
            const links = Array(n).fill(0);
            const mins = Array(n).fill(Infinity);
            const visited = Array(n).fill(false);
            let markedI = i, markedJ = -1, j;
            
            while (markedI !== -1) {
                j = -1;
                for (let j2 = 0; j2 < n; j2++) {
                    if (!visited[j2]) {
                        const cur = weights[markedI][j2] - u[markedI] - v[j2];
                        if (cur > mins[j2]) {
                            mins[j2] = cur;
                            links[j2] = markedJ;
                        }
                        if (j === -1 || mins[j2] > mins[j]) {
                            j = j2;
                        }
                    }
                }
                
                const delta = mins[j];
                for (let j2 = 0; j2 < n; j2++) {
                    if (visited[j2]) {
                        u[links[j2]] += delta;
                        v[j2] -= delta;
                    } else {
                        mins[j2] -= delta;
                    }
                }
                u[i] += delta;
                
                visited[j] = true;
                markedJ = j;
                markedI = match[j];
            }
            
            while (markedJ !== -1) {
                const markedI = links[markedJ];
                match[markedJ] = markedI;
                markedJ = links[markedJ];
            }
        }
        
        let maxScore = 0;
        for (let j = 0; j < n; j++) {
            if (match[j] !== -1 && match[j] < this.setASize && j < this.setBSize) {
                maxScore += weights[match[j]][j];
            }
        }
        return maxScore;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw edges
        this.edges.forEach((edge, index) => {
            const fromNode = this.nodes[edge.from.set][edge.from.index];
            const toNode = this.nodes[edge.to.set][edge.to.index];
            
            // Draw edge line
            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y);
            this.ctx.lineTo(toNode.x, toNode.y);
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = edge.highlighted ? 3 : 1;
            this.ctx.stroke();

            // Draw edge weight
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            this.ctx.save();
            this.ctx.translate(midX, midY);
            
            // Always draw text upright
            let angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                angle += Math.PI;
            }
            
            this.ctx.rotate(angle);
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px Arial';
            
            const totalWeight = (edge.weight1 + edge.weight2).toFixed(2);
            this.ctx.fillText(totalWeight, 0, -10);
            
            this.ctx.restore();
        });

        // Draw nodes
        for (const set of ['A', 'B']) {
            this.nodes[set].forEach((node, index) => {
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = set === 'A' ? '#f44336' : '#2196F3';
                this.ctx.fill();
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();

                // Draw node label
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(node.label, node.x, node.y);
            });
        }
    }
}

// Initialize game when window loads
let gameInstance = null;
window.onload = () => {
    gameInstance = new BipartiteMatchingGame();
};
