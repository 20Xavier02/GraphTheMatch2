class BipartiteMatchingGame {
   constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Game state
    this.setASize = 2;
    this.setBSize = 3;
    this.nodeRadius = 20;
    this.nodes = { A: [], B: [] };
    this.edges = [];
    this.highlightedEdges = new Set();
    
    // Interaction states
    this.isDragging = false;
    this.draggedNode = null;
    this.isEditingWeight = false;
    this.editingEdge = null;
    this.lastTap = 0;
    this.lastEdgeClicked = null;
    
    // Initialize game
    this.resizeCanvas();
    this.initializeGraph();
    
    // Create max score display
    const scoreDisplay = document.querySelector('.score-display');
    if (!document.getElementById('maxScore')) {
        const maxScoreDiv = document.createElement('div');
        maxScoreDiv.innerHTML = `Max Score: <span id="maxScore">?</span>`;
        scoreDisplay.appendChild(maxScoreDiv);
    }
    
    // Create win message element
    if (!document.getElementById('winMessage')) {
        const winMessageDiv = document.createElement('div');
        winMessageDiv.id = 'winMessage';
        winMessageDiv.style.display = 'none';
        scoreDisplay.appendChild(winMessageDiv);
    }
    
    // Event listeners
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
    
    // Global click/touch handler
    document.addEventListener('click', (e) => this.handleGlobalClick(e));
    document.addEventListener('touchend', (e) => this.handleGlobalClick(e));
    
    // Button handlers
    document.getElementById('toggleInstructions').addEventListener('click', () => this.toggleInstructions());
    document.getElementById('resetGraph').addEventListener('click', () => this.resetGraph());
    document.getElementById('checkMatching').addEventListener('click', () => this.checkMatching());
    
    // Size input handlers
    document.getElementById('setASize').addEventListener('change', (e) => this.handleSizeChange('A', e));
    document.getElementById('setBSize').addEventListener('change', (e) => this.handleSizeChange('B', e));
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
    if (Math.random() < 0.375) {
        // 37.5% chance of weight being close to 0
        return Number((Math.random() * 0.2 - 0.1).toFixed(2));
    }
    // Generate weight between -0.9 and 0.9 to avoid rounding issues
    return Number((Math.random() * 1.8 - 0.9).toFixed(2));
}

    getEventPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
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
        for (let i = 0; i < this.nodes.A.length; i++) {
            const node = this.nodes.A[i];
            if (Math.hypot(node.x - pos.x, node.y - pos.y) < this.nodeRadius) {
                return { set: 'A', index: i };
            }
        }
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
            
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            if (Math.hypot(midX - pos.x, midY - pos.y) < 20) {
                return i;
            }
        }
        return -1;
    }
        handleStart(e) {
        e.preventDefault();
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
            
            if (now - this.lastTap < 300 && edgeIndex === this.lastEdgeClicked) {
                // Double tap - edit weight
                this.startEdgeWeightEdit(edgeIndex, pos);
            } else {
                // Single tap - toggle highlight
                if (this.canHighlightEdge(edgeIndex)) {
                    this.toggleEdgeHighlight(edgeIndex);
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
        if (this.isEditingWeight && !e.target.classList.contains('weight-input')) {
            this.handleWeightInputComplete(document.querySelector('.weight-input'));
        }
    }

   startEdgeWeightEdit(edgeIndex, pos) {
       if (this.isEditingWeight) {
           return;
       }
   
       this.isEditingWeight = true;
       this.editingEdge = edgeIndex;
       
       const input = document.createElement('input');
       input.type = 'text';
       input.classList.add('weight-input');
       
       const edge = this.edges[edgeIndex];
       input.value = (edge.weight1 + edge.weight2).toFixed(2);
       
       const rect = this.canvas.getBoundingClientRect();
       input.style.position = 'absolute';
       input.style.left = `${pos.x + rect.left - 30}px`;
       input.style.top = `${pos.y + rect.top - 10}px`;
       
       input.addEventListener('mousedown', (e) => e.stopPropagation());
       input.addEventListener('touchstart', (e) => e.stopPropagation());
       input.addEventListener('touchend', (e) => e.stopPropagation());
       
       input.addEventListener('keydown', (e) => {
           e.stopPropagation();
           if (e.key === 'Enter') {
               this.handleWeightInputComplete(input);
           }
       });
   
       document.body.appendChild(input);
       
       setTimeout(() => {
           input.focus();
           input.setSelectionRange(0, input.value.length);
       }, 50);
   
       // Handle click/touch outside
       const handleOutside = (e) => {
           if (!input.contains(e.target)) {
               this.handleWeightInputComplete(input);
               document.removeEventListener('mousedown', handleOutside);
               document.removeEventListener('touchstart', handleOutside);
           }
       };
   
       setTimeout(() => {
           document.addEventListener('mousedown', handleOutside);
           document.addEventListener('touchstart', handleOutside);
       }, 100);
   }

    handleWeightInputComplete(input) {
       if (this.editingEdge !== null && input) {
           let value = parseFloat(input.value);
           
           // If invalid, generate random weight
           if (isNaN(value) || value < -1 || value > 1) {
               value = this.generateWeight();
           } else {
               value = Number(value.toFixed(2));
           }
           
           const edge = this.edges[this.editingEdge];
           edge.weight1 = value / 2;
           edge.weight2 = value / 2;
           
           // Update both scores immediately
           this.updateScore();
           const maxScore = this.findMaximumMatching();
           document.getElementById('maxScore').textContent = maxScore.toFixed(2);
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

    canHighlightEdge(edgeIndex) {
        const edge = this.edges[edgeIndex];
        if (edge.highlighted) {
            return true; // Can always unhighlight
        }

        if (this.highlightedEdges.size >= Math.min(this.setASize, this.setBSize)) {
            return false;
        }

        for (let highlightedEdgeIndex of this.highlightedEdges) {
            const highlightedEdge = this.edges[highlightedEdgeIndex];
            if (this.nodesOverlap(edge, highlightedEdge)) {
                return false;
            }
        }
        return true;
    }

    nodesOverlap(edge1, edge2) {
        return (
            (edge1.from.set === edge2.from.set && edge1.from.index === edge2.from.index) ||
            (edge1.to.set === edge2.to.set && edge1.to.index === edge2.to.index)
        );
    }
        toggleEdgeHighlight(edgeIndex) {
        if (this.edges[edgeIndex].highlighted) {
            this.edges[edgeIndex].highlighted = false;
            this.highlightedEdges.delete(edgeIndex);
        } else {
            this.edges[edgeIndex].highlighted = true;
            this.highlightedEdges.add(edgeIndex);
        }
        this.updateScore();
        this.draw();
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
    try {
        const maxScore = Math.max(0, this.findMaximumMatching());
        const currentScore = Array.from(this.highlightedEdges)
            .reduce((sum, edgeIndex) => {
                const edge = this.edges[edgeIndex];
                return sum + edge.weight1 + edge.weight2;
            }, 0);
        
        document.getElementById('maxScore').textContent = maxScore.toFixed(2);
        
        if (Math.abs(currentScore - maxScore) < 0.01) {
            const winMessage = document.getElementById('winMessage');
            if (winMessage) {
                winMessage.textContent = "You win! This is the best matching available.";
                winMessage.style.display = 'block';
            } else {
                alert("Correct! This is the maximum matching!");
            }
        }
    } catch (error) {
        console.error('Error in checkMatching:', error);
    }
}

   findMaximumMatching() {
       let maxScore = -Infinity;
       const edges = this.edges;
       
       // Try all possible combinations of edges
       for (let i = 0; i < this.setBSize; i++) {
           for (let j = 0; j < this.setBSize; j++) {
               if (j === i) continue;
               for (let k = 0; k < this.setBSize; k++) {
                   if (k === i || k === j) continue;
                   
                   const score = 
                       (edges[i].weight1 + edges[i].weight2) +
                       (edges[this.setBSize + j].weight1 + edges[this.setBSize + j].weight2) +
                       (edges[2 * this.setBSize + k].weight1 + edges[2 * this.setBSize + k].weight2);
                   maxScore = Math.max(maxScore, score);
               }
           }
       }
       
       return maxScore;
   }

    hungarianAlgorithm(weights) {
       const n = weights.length;
       const lx = Array(n).fill(0);
       const ly = Array(n).fill(0);
       const match = Array(n).fill(-1);
       
       // Initialize lx with maximum weights from each row
       for (let i = 0; i < n; i++) {
           lx[i] = Math.max(...weights[i]);
       }
       
       for (let k = 0; k < n; k++) {
           let p = Array(n).fill(-1);
           let used = Array(n).fill(false);
           
           let j1 = 0;
           while (j1 < n) {
               if (match[j1] === -1) break;
               j1++;
           }
           if (j1 >= n) continue;
           
           let queue = [j1];
           used[j1] = true;
           let j2;
           
           do {
               j2 = -1;
               j1 = queue[queue.length - 1];
               let delta = Infinity;
               
               for (let j = 0; j < n; j++) {
                   if (!used[j]) {
                       let cur = lx[k] + ly[j] - weights[k][j];
                       if (cur < delta) {
                           delta = cur;
                           j2 = j;
                       }
                   }
               }
               
               if (j2 !== -1) {
                   if (delta > 0) {
                       for (let j = 0; j < n; j++) {
                           if (used[j]) ly[j] -= delta;
                       }
                       lx[k] += delta;
                   }
                   queue.push(j2);
                   used[j2] = true;
                   p[j2] = j1;
               }
           } while (j2 !== -1 && match[j2] === -1);
           
           if (j2 !== -1) {
               let cur = j2;
               while (cur !== -1) {
                   let prev = p[cur];
                   let next = match[prev];
                   match[cur] = k;
                   cur = next;
               }
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

    resetGraph() {
        this.initializeGraph();
        document.getElementById('maxScore').textContent = '?';
        document.getElementById('winMessage').style.display = 'none';
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
            document.getElementById('maxScore').textContent = '?';
            document.getElementById('winMessage').style.display = 'none';
        }
    }

    toggleInstructions() {
        const instructionsOverlay = document.querySelector(".instructions-overlay");
        const gameCanvas = document.getElementById("gameCanvas");
        const toggleButton = document.getElementById("toggleInstructions");

        if (instructionsOverlay.style.display === "none" || instructionsOverlay.style.display === "") {
            instructionsOverlay.style.display = "flex";
            gameCanvas.classList.add("hidden");
            toggleButton.textContent = "Resume Game";
        } else {
            instructionsOverlay.style.display = "none";
            gameCanvas.classList.remove("hidden");
            toggleButton.textContent = "Instructions";
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw edges
        this.edges.forEach((edge, index) => {
            const fromNode = this.nodes[edge.from.set][edge.from.index];
            const toNode = this.nodes[edge.to.set][edge.to.index];
            
            this.ctx.beginPath();
            this.ctx.moveTo(fromNode.x, fromNode.y);
            this.ctx.lineTo(toNode.x, toNode.y);
            this.ctx.strokeStyle = edge.highlighted ? '#000' : '#666';
            this.ctx.lineWidth = edge.highlighted ? 3 : 1;
            this.ctx.stroke();

            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            this.ctx.save();
            this.ctx.translate(midX, midY);
            
            let angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                angle += Math.PI;
            }
            
            this.ctx.rotate(angle);
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = edge.highlighted ? '#000' : '#666';
            this.ctx.font = edge.highlighted ? 'bold 14px Arial' : '14px Arial';
            
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
window.addEventListener('load', () => {
    new BipartiteMatchingGame();
});
