name: Bug report
description: Report a bug, with enough detail to reproduce it.
type: Bug
body:
  - type: markdown
    attributes:
      value: |
        Please redact keys, `.env` contents, and other secrets from logs and screenshots.

  - type: textarea
    id: summary
    attributes:
      label: Bug summary
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      placeholder: |
        1. First...
        2. Then...
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected result
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual result
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: Guardian version and how you're running it
      placeholder: ex. 3.7.0, Docker Compose
    validations:
      required: true

  - type: textarea
    id: artifacts
    attributes:
      label: Artifacts and considerations
      description: Screenshots, recordings, logs, or anything else that helps.
