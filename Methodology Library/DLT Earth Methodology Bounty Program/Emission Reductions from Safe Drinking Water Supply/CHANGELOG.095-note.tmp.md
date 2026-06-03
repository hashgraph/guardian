- **Note on the 0.95 gate during development.** An intermediate development
  build briefly used a `pass_rate < 0.95` water-quality gate. That build was
  never published as a `.policy` export, and no dry-run evidence in this
  repository was captured against it. The current exported policy and all
  evidence use the methodology-correct `pass_rate < 0.90` gate (more than 10%
  of appliances failing implies ER = 0).
