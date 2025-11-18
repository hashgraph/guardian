---
icon: trash-can-xmark
---

# Deleting Schema

## 1. Overview

When a user attempts to delete a schema from the grid page, a modal window appears to confirm the action and display relevant dependency information.

<figure><img src="../../../.gitbook/assets/image (438) (1).png" alt=""><figcaption></figcaption></figure>

## 2. Functional Details

### 2.1 Deleting Schemas with Child Schemas

When deleting a schema that has child schemas:

* The modal displays a list of all child schemas that can be deleted along with it.
* It also shows which child schemas cannot be deleted due to dependencies on other schemas.
* A checkbox allows the user to choose whether to:
* Delete only the selected schema, or
* Delete the selected scheme and all its child schemas.

<figure><img src="../../../.gitbook/assets/image (439).png" alt=""><figcaption></figcaption></figure>

### 2.2 Deleting Schemas with Parent Dependencies

If the selected schema depends on one or more parent schemas, deletion is not allowed.\
&#x20;In this case:

* The modal displays a warning message explaining that the scheme cannot be deleted due to existing dependencies.

<figure><img src="../../../.gitbook/assets/image (456).png" alt=""><figcaption></figcaption></figure>

### 2.3 Deleting all Schemas

User will now be able to delete all schemas for a particular policy by using "Delete All Schemas" button:

<figure><img src="../../../.gitbook/assets/image (457).png" alt=""><figcaption></figcaption></figure>
