# Evidence And Hash Reconciliation

Executor R5 manifest entries recomputed exactly for listed files:

- f171ee784f2d5378d278278fe192eb094a227b5636c4d85ce1ccd1c51131be99 *evaluation/results/phase-10a14-r5/PRE-EXECUTION-MANIFEST.md
- df1245fd02f863a72ef9aa00bbd42374da137bc3c6f47533f22eeda916357bb8 *evaluation/results/phase-10a14-r5/official-amendment-chain.md
- d9ac905336fb50a1e84a4df25c175b2788237a0824fa2faf6a954855a53b8ecd *evaluation/results/phase-10a14-r5/source-availability-inventory.md
- dab5fefdd853036557a5d8ef779fd4a0a6b89ce2b1a93e33a22839bdc6f25631 *evaluation/results/phase-10a14-r5/phase-10a14-r5-result.json
- b08048c0bd5e89aa9e4acda19b5f2cb1277b00d0ac18342172c28ce2e06aaec6 *evaluation/results/phase-10a14-r5/deterministic-gate-cycle1.txt
- 2e5c2cbff6d3edc80c01af8f0b866e84c931d09830dc9f6d89db5f998c260db0 *evaluation/results/phase-10a14-r5/deterministic-gate-cycle2.txt
- 8af6d42b329f3c36ed77da8f005aae66fbe9467908352dd3d4da2657b3648a83 *evaluation/results/phase-10a14-r5/live-matrix.txt
- 7eef3bf084256730883c5619f077200ffde7d6aab8edd21b74d8047e5c7ec182 *evaluation/results/phase-10a14-r5/staging-gate-cycle1.txt
- 39de006a9e432b5c89adc4d191b55467de36e368d8cefb6e68713609e2760651 *evaluation/results/phase-10a14-r5/staging-gate-cycle2.txt
- e05e022aff7bd60ee0d3af96f86b37c7141df0c15987a236ab1aa438f9c9a0bc *PHASE-10A14-R5-SECTION-51-CURRENT-LAW-CHAIN-IMPERATIVE-FILING-AND-COMPLETE-EVIDENCE-REMEDIATION-1_REPORT.md
- 532e6c81b7653e73ce39da17c84984ab255f6d75905e4b159d6c4fbfd750b2a4 *section51-authority-chain.js

Controlling reconciliation:

- Report/result/live matrix agree that public source cards show chainReviewed=false.
- Report/result/live matrix agree substituted filing did not verify in the R5 matrix.
- Report/result agree complete all-26 and prior-safeguard packages were not completed by executor.
- Committed deterministic cycle 2 shows a scope-guard failure due cycle-1 log being untracked at executor time; fresh independent clean-tree deterministic cycles passed 195/0 twice.
- Staging evidence is now independently verified 7/0 twice after preserving the restricted sandbox reachability failure.
