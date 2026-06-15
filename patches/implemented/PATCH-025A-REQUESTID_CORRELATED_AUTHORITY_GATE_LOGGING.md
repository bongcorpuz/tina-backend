# PATCH-025A RequestId-Correlated Authority Gate Logging

## Objective

Make `PATCH_024C_POST_SOURCECARD` logs searchable by requestId without changing business logic, authority logic, retrieval, or source-card selection.

## Implementation

Before:

```js
console.log("[PATCH_024C_POST_SOURCECARD]", {
  requestId: requestId || traceId,
  sourceCardCount: finalSourceCards.length,
  beforeLength: _024c4Before.length,
  afterLength: _outputAnswer.length,
  changed: _024c4Before.length !== _outputAnswer.length
});
```

After:

```js
const _024c4CorrelationId = requestId || traceId || "missing-request-id";
console.log(`[PATCH_024C_POST_SOURCECARD requestId=${_024c4CorrelationId}]`, {
  marker: "PATCH_024C_POST_SOURCECARD",
  requestId: _024c4CorrelationId,
  traceId: traceId || null,
  sourceCardCount: finalSourceCards.length,
  beforeLength: _024c4Before.length,
  afterLength: _outputAnswer.length,
  changed: _024c4Before.length !== _outputAnswer.length
});
```

## Scope

- Changed log correlation only.
- Preserved authority stripping behavior.
- Preserved retrieval behavior.
- Preserved source-card selection behavior.
- Preserved final answer payload behavior.

## Validation

- Targeted PATCH-024C/PATCH-025A regression: passed.
- `npm test`: passed.
- `npm run guard:files`: passed.
