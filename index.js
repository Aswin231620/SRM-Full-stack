/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SRM Full Stack Engineering Challenge — POST /bfhl
 * Hierarchical Graph Processor with Cycle Detection
 *
 * Author: Update USER_ID, EMAIL_ID, COLLEGE_ROLL_NUMBER below
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());                                      // allow cross-origin calls
app.use(express.json());                              // parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // serve frontend

// ─── Identity (TODO: replace with your actual credentials) ──────────────────────
const USER_ID             = "johndoe_17091999";
const EMAIL_ID            = "john.doe@college.edu";
const COLLEGE_ROLL_NUMBER = "21CS1001";

// ─── Regex: exactly one uppercase letter, arrow, one uppercase letter ───────────
const VALID_EDGE_RE = /^[A-Z]->[A-Z]$/;

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /bfhl
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    // Guard: body must contain a data array
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'Invalid request. Expected JSON body: { "data": ["A->B", ...] }'
      });
    }

    // ── Phase 1 — Validate, de-duplicate, collect invalids ─────────────────
    const invalidEntries = [];   // entries that fail format check
    const duplicateEdges = [];   // repeated edge strings (each listed once)
    const seenEdgeKeys   = new Set();
    const seenDupKeys    = new Set();
    const acceptedEdges  = [];   // {parent, child} after format + dedup pass

    for (let i = 0; i < data.length; i++) {
      const raw     = typeof data[i] === 'string' ? data[i] : String(data[i]);
      const trimmed = raw.trim();

      // Rule 1 — format check: single uppercase -> single uppercase
      if (!VALID_EDGE_RE.test(trimmed)) {
        invalidEntries.push(raw);
        continue;
      }

      const [parent, child] = trimmed.split('->');

      // Rule 1 — self-loop is invalid
      if (parent === child) {
        invalidEntries.push(raw);
        continue;
      }

      const key = `${parent}->${child}`;

      // Rule 2 — duplicate edge detection
      if (seenEdgeKeys.has(key)) {
        if (!seenDupKeys.has(key)) {
          duplicateEdges.push(key);
          seenDupKeys.add(key);
        }
        continue;
      }

      seenEdgeKeys.add(key);
      acceptedEdges.push({ parent, child });
    }

    // ── Phase 2 — Build graph with multi-parent enforcement ────────────────
    //
    //   childOf:  child → first parent   (enforces single-parent rule)
    //   adj:      parent → [children]    (directed adjacency)
    //   allNodes: every node that participates in an accepted edge
    //
    const childOf  = new Map();   // child → parent (first encountered)
    const adj      = new Map();   // parent → [child, ...]
    const allNodes = new Set();

    for (const { parent, child } of acceptedEdges) {
      allNodes.add(parent);
      allNodes.add(child);

      // Ensure adjacency entry exists
      if (!adj.has(parent)) adj.set(parent, []);

      // Multi-parent rule: if child already has a parent, silently discard
      if (childOf.has(child)) continue;

      childOf.set(child, parent);
      adj.get(parent).push(child);
    }

    // Make sure every node has an adjacency entry (leaf nodes too)
    for (const n of allNodes) {
      if (!adj.has(n)) adj.set(n, []);
    }

    // ── Phase 3 — Find connected components (undirected BFS) ───────────────
    //
    //   Build undirected view of accepted edges only (from childOf map)
    //   Each component is processed independently.
    //
    const undirAdj = new Map();
    for (const n of allNodes) undirAdj.set(n, new Set());

    for (const [child, parent] of childOf.entries()) {
      undirAdj.get(parent).add(child);
      undirAdj.get(child).add(parent);
    }

    const visited    = new Set();
    const components = [];  // Array of Set<node>

    // Walk nodes in sorted order so component ordering is deterministic
    const sortedNodes = [...allNodes].sort();

    for (const start of sortedNodes) {
      if (visited.has(start)) continue;

      const comp  = new Set();
      const queue = [start];

      while (queue.length > 0) {
        const node = queue.shift();
        if (visited.has(node)) continue;
        visited.add(node);
        comp.add(node);
        for (const nbr of undirAdj.get(node)) {
          if (!visited.has(nbr)) queue.push(nbr);
        }
      }
      components.push(comp);
    }

    // ── Phase 4 — Analyse each component ───────────────────────────────────

    /**
     * hasCycle — DFS with recursion-stack to detect back-edges.
     * Only walks nodes within the given component set.
     */
    function hasCycle(compNodes) {
      const vis = new Set();
      const rec = new Set();

      function dfs(u) {
        vis.add(u);
        rec.add(u);
        for (const v of (adj.get(u) || [])) {
          if (!compNodes.has(v)) continue;   // stay within component
          if (!vis.has(v)) {
            if (dfs(v)) return true;
          } else if (rec.has(v)) {
            return true;                     // back-edge → cycle
          }
        }
        rec.delete(u);
        return false;
      }

      for (const n of compNodes) {
        if (!vis.has(n)) {
          if (dfs(n)) return true;
        }
      }
      return false;
    }

    /**
     * buildTree — recursively construct the nested object representation.
     *
     * Example: root A with children B,C  →  { "A": { "B": {...}, "C": {...} } }
     */
    function buildTree(node) {
      const children = adj.get(node) || [];
      const obj = {};
      for (const ch of children) {
        obj[ch] = buildTree(ch);
      }
      return obj;
    }

    /**
     * calcDepth — number of nodes on the longest root-to-leaf path.
     *
     * A single node has depth 1.  A→B→C has depth 3.
     */
    function calcDepth(node) {
      const children = adj.get(node) || [];
      if (children.length === 0) return 1;
      let maxChild = 0;
      for (const ch of children) {
        maxChild = Math.max(maxChild, calcDepth(ch));
      }
      return 1 + maxChild;
    }

    // ── Build hierarchies array ──────────────────────────────────────────────
    const hierarchies = [];

    for (const comp of components) {
      const sorted = [...comp].sort();

      // Root = node that never appears as a child within accepted edges
      const roots = sorted.filter(n => !childOf.has(n));

      // If every node is a child (pure cycle), pick lex smallest
      const root = roots.length > 0 ? roots[0] : sorted[0];

      if (hasCycle(comp)) {
        // Cyclic component — no tree, no depth
        hierarchies.push({
          root,
          tree:      {},
          has_cycle: true
        });
      } else {
        // Acyclic tree
        const tree  = { [root]: buildTree(root) };
        const depth = calcDepth(root);
        hierarchies.push({ root, tree, depth });
      }
    }

    // ── Phase 5 — Summary ──────────────────────────────────────────────────
    const trees  = hierarchies.filter(h => !h.has_cycle);
    const cycles = hierarchies.filter(h =>  h.has_cycle);

    let largestRoot = null;
    let maxDepth    = -1;

    for (const t of trees) {
      if (
        t.depth > maxDepth ||
        (t.depth === maxDepth && t.root < largestRoot)
      ) {
        maxDepth    = t.depth;
        largestRoot = t.root;
      }
    }

    // ── Final response ─────────────────────────────────────────────────────
    return res.json({
      user_id:             USER_ID,
      email_id:            EMAIL_ID,
      college_roll_number: COLLEGE_ROLL_NUMBER,
      hierarchies,
      invalid_entries:     invalidEntries,
      duplicate_edges:     duplicateEdges,
      summary: {
        total_trees:       trees.length,
        total_cycles:      cycles.length,
        largest_tree_root: largestRoot
      }
    });

  } catch (err) {
    console.error('POST /bfhl error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Start server
// ═══════════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
  console.log(`API endpoint  → POST http://localhost:${PORT}/bfhl`);
});
