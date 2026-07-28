---
description: How to contribute a reference page to the Guardian docs
tags:
  - template
---

# Reference Template

{% hint style="info" %}
**Reference Template**\
Use for: complete specifications of a thing — schema fields, API parameters, status values, configuration options. Reference pages are scannable, not narrative. If an explanation starts to grow into more than a sentence or two, it belongs in a concept page instead. Link to the concept page from the Related section.

**Reference Page Title** _Name the thing being specified — e.g. "Policy schema properties", "Token configuration fields", "Block completion event payload"_
{% endhint %}

***

One sentence. What this is and where it is used.

#### Properties

| Property       | Type    | Required | Default | Description  |
| -------------- | ------- | -------- | ------- | ------------ |
| property\_name | string  | Yes      | —       | What it does |
| property\_name | boolean | No       | false   | What it does |

#### Valid values

Document constrained value sets here — enumerations, allowed states, status codes. Remove this section if all values are free-form.

| Value | Description   |
| ----- | ------------- |
| value | What it means |

#### Example

```json
{
  "property": "value"
}
```

#### Notes

Anything that does not fit the tables but affects how this is used. Keep brief. If a note expands into a fuller explanation, it belongs in the concept page instead.

#### Related

* Concept: what this is for
* Task: how to use this
* Reference: related spec

***
