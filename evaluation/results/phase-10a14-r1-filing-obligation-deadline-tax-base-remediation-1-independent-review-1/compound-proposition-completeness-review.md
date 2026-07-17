# Compound-Proposition Completeness Review

The implementation evaluates known proposition classes sequentially and fails closed on the first unsupported deterministic class. This prevents the exact Q12/Q30/Q34 payloads from being laundered by a correct adjacent component.

However, compound completeness remains incomplete for the new classes because detection is narrow. Unsupported filing-obligation and filing-deadline components can be missed when phrased as ordinary follow-ups, statement requests, 'submit anything', 'what date applies', or 'is May 15 late'. Estate-tax base conflation can be missed when expressed as 'excess over', 'first PHP 5M tax-free', or 'threshold'.