# R18 Assertion-Change Review

The R18 test changed from requiring reason non_tax_object_veto to accepting non_tax_object_veto or non_tax_object_role_veto. The decision assertion remains non-ALLOW and a veto reason remains required, so a false ALLOW would not pass. However, the change weakens specific precedence observability and is recorded as P2-IR19-006.
