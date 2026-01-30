---
icon: display-chart-up-circle-currency
---

# Formulas Graphical View

## 1. Overview

The Formulas Graphical View enhances the Guardian Policy Configurator by providing a visual diagram of formula-related components and a detailed side panel with contextual information about the selected node.

At its core, this feature provides:

* Status-based visual highlighting of formula-related fields and components according to their value state in the VC (“Missing”, “Default”, “Suggested”, “Not null”).
* A contextual side panel that shows the current VC value, value status chip, field description, schema name, parent schemas, and related formula metadata.
* Structured rendering of JSON / object values as formatted, collapsible JSON with a short preview and an expandable detailed view.
* A dedicated “Technical details” section that can be toggled to reveal the field path and auto-detected value type without overloading the main view.

It is available inside the "View Formula" dialog as the "Diagram" tab and is designed to help policy authors understand how formulas, variables, schema fields, and linked document values are connected.

<figure><img src="../../../../.gitbook/assets/unknown (4) (1).png" alt=""><figcaption></figcaption></figure>

## 2. Purpose

The purpose of this feature is to make complex formula configurations easier to inspect and debug by:

* Visualizing formula-related components as a graph with blocks.
* Highlighting the value status for linked fields (“Missing”, “Default”, “Suggested”, “Not null”).
* Showing document context (“schema”, “parent schemas”, “field path”) for each node.
* Providing a clear representation of the node value, including formatted JSON preview for object/array content&#x20;
* Display formula-specific metadata
* Group technical metadata into a collapsible "Technical details" subsection

## 3. Location

After a VC document has been created, the Formulas Diagram view can be accessed as follows:

1. Open the VC and click View Document.
2. In the Form View, locate the field that has an attached formula.
3. Click the formula (fx) icon next to this field.
4.  In the View Formula dialog that opens, switch to the Diagram tab.

    <figure><img src="../../../../.gitbook/assets/unknown (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 4. Graphical view

The main area of the "Diagram" tab displays a graph of components built from the FormulasTree navigation structure.

Key characteristics:

* Each node represents a "component" item in the navigation tree ( variable, formula, text, schema).
* Nodes are connected based on the underlying navigation tree to reflect component hierarchy.
* Nodes are styled according to the value status of their linked field (Missing, Default, Suggested, Not null), except for constants, which are never highlighted.

<figure><img src="../../../../.gitbook/assets/unknown (2) (1) (1).png" alt=""><figcaption></figcaption></figure>

## 5. Value Status

For nodes that are linked to an input field, the system calculates a value status and uses it to style both the node in the graph and the badge in the side panel. The **Not null** status is applied only to the node styling and is not displayed as a badge in the side panel.

| Status    | Color  | Description                                                                 |
| --------- | ------ | --------------------------------------------------------------------------- |
| Missing   | Red    | The linked value is empty                                                   |
| Default   | Yellow | The linked value equals the schema default value.                           |
| Suggested | Orange | The linked value equals the schema suggested value.                         |
| Not null  | Green  | The linked value is present and does not match default or suggested values. |

<figure><img src="../../../../.gitbook/assets/unknown (3) (1) (1).png" alt=""><figcaption></figcaption></figure>

## 6. Side Panel – Node Details

When a user selects a node in the graph, a side panel on the right displays detailed information about that node.

The panel includes the following sections (when data is available):

* **Title** – a combined label based on node type and name (e.g., "Variable: income").
* **Value** – the current value from the linked VC field, plus a status badge (Missing, Default, Suggested).
* **Field description** – description from the schema field definition.
* **Formula** – rendered using math-live for formula nodes.
* **Constant value** – displayed for constant nodes.
* **Text** – displayed for text nodes.
* **Node description** – description taken from the formula tree node payload. The label is prefixed with the node type (e.g., “Formula description”, “Constant description”, “Text description”).
* **Schema** – the name of the schema derived from the schema chain.
* **Parent schemas** – all parent schema titles in the chain, if any.
* **Technical details** – collapsible section with “Field value type” and “Field path”.

<figure><img src="../../../../.gitbook/assets/unknown (4) (1) (1).png" alt=""><figcaption></figcaption></figure>

## 7. Value – JSON Rendering

The "Value" section is responsible for displaying the actual value of the linked field and its status.

Behavior:

* If the value is a primitive (string, number, boolean), it is shown as plain text.
* If the value is an object or an array , it is rendered as formatted JSON inside a dedicated container.
* By default, the JSON container shows only a limited height.
* A "Show more / Show less" toggle controls the expanded state and switches the JSON container between a compact and expanded height.

<figure><img src="../../../../.gitbook/assets/unknown (5) (1).png" alt=""><figcaption></figcaption></figure>

## 8. Demo Video

[Youtube](https://youtu.be/i6dLrYfP7r4?si=3mtSmkOR26mjLy20\&t=115)
