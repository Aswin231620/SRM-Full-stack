// test_api.js — run with: node test_api.js
const http = require('http');

const payload = JSON.stringify({
  data: [
    "A->B", "A->C", "B->D", "C->E", "E->F",
    "X->Y", "Y->Z", "Z->X",
    "P->Q", "Q->R",
    "G->H", "G->H", "G->I",
    "hello", "1->2", "A->"
  ]
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/bfhl',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  },
  (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const result = JSON.parse(body);
      console.log(JSON.stringify(result, null, 2));

      // ── Automated checks ──
      const ok = [];
      const fail = [];

      function check(label, actual, expected) {
        const a = JSON.stringify(actual);
        const e = JSON.stringify(expected);
        if (a === e) ok.push(label);
        else fail.push(`${label}: got ${a}, expected ${e}`);
      }

      check("invalid_entries", result.invalid_entries, ["hello", "1->2", "A->"]);
      check("duplicate_edges", result.duplicate_edges, ["G->H"]);
      check("summary.total_trees", result.summary.total_trees, 3);
      check("summary.total_cycles", result.summary.total_cycles, 1);
      check("summary.largest_tree_root", result.summary.largest_tree_root, "A");
      check("hierarchies count", result.hierarchies.length, 4);

      // Check hierarchy A
      const hA = result.hierarchies.find(h => h.root === "A");
      check("A depth", hA && hA.depth, 4);
      check("A has_cycle absent", hA && hA.has_cycle, undefined);
      check("A tree", hA && hA.tree, {"A":{"B":{"D":{}},"C":{"E":{"F":{}}}}});

      // Check hierarchy X (cycle)
      const hX = result.hierarchies.find(h => h.root === "X");
      check("X has_cycle", hX && hX.has_cycle, true);
      check("X tree empty", hX && hX.tree, {});
      check("X no depth", hX && hX.depth, undefined);

      // Check hierarchy P
      const hP = result.hierarchies.find(h => h.root === "P");
      check("P depth", hP && hP.depth, 3);
      check("P tree", hP && hP.tree, {"P":{"Q":{"R":{}}}});

      // Check hierarchy G
      const hG = result.hierarchies.find(h => h.root === "G");
      check("G depth", hG && hG.depth, 2);
      check("G tree", hG && hG.tree, {"G":{"H":{},"I":{}}});

      console.log("\n══════════════ TEST RESULTS ══════════════");
      console.log(`✅ PASSED: ${ok.length}`);
      ok.forEach(t => console.log(`   ✔ ${t}`));
      if (fail.length) {
        console.log(`❌ FAILED: ${fail.length}`);
        fail.forEach(t => console.log(`   ✘ ${t}`));
      } else {
        console.log("\n🎉 ALL TESTS PASSED — output matches expected spec exactly!");
      }
    });
  }
);

req.write(payload);
req.end();
