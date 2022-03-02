# Release Management Plan
This document describes general approach to release management for the Guardian codebase, and contains a detailed sequence of events/actions required for the production of releases. The purpose of this document is to inform the community about the process, and provide guidance to internal teams working on the product.

### Release schedule and numbering

The Guardian development team follows Scrum methodology with 2-week sprints. Software releases are produced on regular cadence every other sprint, i.e every 4 weeks; regardless of the status of features in development. Releases are produced on Mondays at 12:00 EST, following the go/no-go decisition taken at the end-of-sprint review on Friday previous week.

The Guardian uses semantic versioning for releases in the major.minor.build format. Each number incremented sequentially to denote the following changes:
- major: a significant milestone in product lifecycle has been reached
- minor: the release contains notable new capabilities
- build: incremental release brining enhancements and bug fixes

In the future there will likely be backwards compatibility meaning assigned to these changes.

### Release process
The Guardian release process is built around the sprint cycle, where each sprint ends with the codebase in the 'releasable' state. The only difference between the alternating release sprints and non-release sprints is the activities of packaging and uploading artifacts into external repositories.

#### Feature development cycle
An inception-to-release lifecycle of a new enchacement is usually 3 sprints long:
- One sprint (or longer, or shorter) is dedicated to MRD/PRD work by the product team. Developers are not actively working on the feature during this period, their involvement is limited to providing SME (Subject Matter Expert) consulting services to Product.
- Next sprint is dedicated to refining, scoping, estimating, prioritizing and planning features into tasks for the development backlog. This requires collaborative work between development and product.
- The last sprint is implementation of the task.

It can be summarised in the following table:

|          | Sprint 1 | Sprint 2 | Sprint 3 |
| -------- | -------- | -------- | -------- |
| **Product**  | MRD/PRD, business priorities    | Lead refinement, plan    | Monitor, answer question     |
| **Dev**      | Consult Prod   | Refine, scope and estimate     | Implement     |

#### Sprint flow
Product management and stakeholders create MRDs/PRDs for product features outside of the Scrum framework (in Sprint 1 and/or early in Sprint 2). Development starts getting involved in planning with the Refinement Scrum ceremony, during which issues are estimated, split into tasks (if required), discussed and clarified.

The team enters a new sprint with a defined scope: list of estimated and assigned issues ready to be worked on for the next two weeks. 

Daily Scrum ceremony insures that development is synced up on all activites, and any blockers and obstacles are promptly reserved.

Developers submit PRs, which get merged into 'Develop' branch after peer review which also validates that presence of the unit tests covering the new code.

Features are marked as Done when they satisfy the definition of done after the review of the 'acceptance criteria' by the product team and stakeholders.

After the Sprint ended, the Product Owner leads the Sprint Review ceremony on Monday
- Entire team is present
- Stakeholders invited
- Product Owner delivers a sprint report (with charts and statistics of the sprint)
- Developers demo completed features, which includes showing unit tests and documentation (where relevant). For features without exposure through a UI developers will demo the successful run of the unit test.

Following the Sprint Review lead developer tags and merges 'Develop' into 'Main'.

On Tuesday the Product Owner holds a 'Retrospective' meeting where developers discuss between themselves successes/failures of the previous sprint and opportunities for improvements.

#### Release flow

Release sprint contain additional activities:
- Documentation review by the Product Manager
- Unit tests verification by the lead developer
- Demo environment sanity tested by lead developer, product team and/or stakeholders
- Product Manager prepares ChangeLog document
- Product Manager prepares Release notes
- Product Manager tags the release and runs release CI pipeline, following which verifies that it completed successfully and all artefacts got uploaded to the correct repositories
  - Product Manager tags the Develop branch with the new version
  - Product Manager or Lead developer creates a PR and squash-merges into the update from the Develop into the Main branch
  - Product Manager tags the Main branch
  - Produt Manager makes a release in the Main branch
- Product Owner posts community announcements in the discord and slack channels


#### Artifacts list

- Source code archives (in github)
- Docker image (TBD: in Docker Hub)
- Npm packages (TBD: in NPM registry) 
  - Message Broker
  - UI Service
  - Guardian Service
  - MRV Sender Service
- Changelog and release notes (Notes attached to the release label in github)
- User guide and demo guide (.md file in github)


