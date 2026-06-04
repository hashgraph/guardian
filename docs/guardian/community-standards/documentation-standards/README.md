---
if: visitor.claims.unsigned.isBetaUser === true
---

# Documentation Standards

Guardian docs are organized around a simple principle: every page has one job. A page that tries to explain a concept, walk through a task, and provide a full specification all at once ends up doing none of them well. Readers looking for a quick reference have to wade through prose. Readers following steps get distracted by background theory. Content becomes hard to maintain because changes to one concern ripple through unrelated content on the same page.

To avoid this, every page in the Guardian docs is written as one of four types.

### The four page types

**Concept** pages explain what something is and why it exists. They build the mental model a reader needs before they can use a feature effectively. They do not contain steps.

**Task** pages walk through one discrete action with a clear end state. They assume the reader already understands the concept and just needs to know what to do. They are written in steps and always end with a Result section that confirms success.

**Reference** pages provide a complete, scannable specification of a thing — schema fields, API parameters, status values, configuration options. They are organized for lookup, not for reading top to bottom.

**Guide** pages take the reader through a multi-phase goal from start to finish. They are longer than task pages, organized into named parts with checkpoints, and live in the Guides tab rather than the Docs tab.

### Why this matters for contributors

Knowing the type before you write determines everything about how you write it. A concept page written in steps is confusing. A task page that opens with three paragraphs of background loses the reader who just needs to know what button to click. Choosing the type first is the most important decision you make when authoring a page.

If you find yourself writing a page that seems to need both a concept section and a task section, that is a signal you have two pages, not one. The concept page becomes the parent in GitBook, and the task page sits as a child beneath it.

### How pages relate to each other

Pages of different types are linked through the Related section at the bottom of each page. A concept page links forward to its task page. A task page links back to its concept page and forward to any relevant reference. A guide links to the concept pages that provide background and the task pages that cover individual steps in more detail.

This cross-linking is what makes the docs navigable without requiring every page to be self-contained. A reader who arrives at a task page from search does not need the concept page in front of them — but the link is there if they need it.

### Related

* [page-templates](page-templates/ "mention")
