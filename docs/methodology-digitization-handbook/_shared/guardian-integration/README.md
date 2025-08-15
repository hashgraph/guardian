# ⚙️ Guardian Integration

> Integration system for linking handbook content with existing Guardian documentation

## Overview

This system ensures that handbook content properly references existing Guardian documentation from `docs/SUMMARY.md` rather than duplicating information, while maintaining focus on methodology digitization context.

## Guardian Documentation Structure Analysis

Based on `docs/SUMMARY.md`, the following Guardian documentation sections are relevant for methodology digitization:

### Core Architecture References

```markdown
## Architecture Documentation
- [Guardian Architecture](../../../guardian/architecture/README.md)
- [Deep Dive Architecture](../../../guardian/architecture/reference-architecture.md)
- [High Level Architecture](../../../guardian/architecture/architecture-2.md)
- [Policies, Projects and Topics Mapping](../../../guardian/architecture/schema-architecture.md)
```

### Policy Workflow Engine References

```markdown
## Policy Workflow Documentation
- [Available Policy Workflow Blocks](../../../guardian/standard-registry/policies/policy-creation/introduction/README.md)
- [Policy Creation using UI](../../../guardian/standard-registry/policies/policy-creation/policy-demo.md)
- [Policy Workflow Creation Guide](../../../guardian/standard-registry/policies/policy-creation/creating-a-policy-through-policy-configurator/README.md)
```

### Schema System References

```markdown
## Schema Documentation
- [Available Schema Types](../../../guardian/standard-registry/schemas/available-schema-types.md)
- [Schema Creation using UI](../../../guardian/standard-registry/schemas/creating-system-schema-using-ui.md)
- [Schema APIs](../../../guardian/standard-registry/schemas/schema-creation-using-apis/README.md)
- [Schema Versioning & Deprecation](../../../guardian/standard-registry/schemas/schema-versioning-and-deprecation-policy.md)
```

### User Management References

```markdown
## User Management Documentation
- [Multi-User Roles](../../../guardian/readme/environments/multi-session-consistency-according-to-environment.md)
- [User Guide Glossary](../../../guardian/readme/guardian-glossary.md)
```

### Installation and Setup References

```markdown
## Setup Documentation
- [Installation Guide](../../../guardian/readme/getting-started/README.md)
- [Prerequisites](../../../guardian/readme/getting-started/prerequisites.md)
- [Building from Source](../../../guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/README.md)
- [Environment Parameters](../../../guardian/readme/getting-started/installation/setting-up-environment-parameters.md)
```

## Integration Patterns

### Environment Setup Integration Pattern

```markdown
## Guardian Documentation Integration for Setup

### Development Environment Setup Section
Instead of rewriting setup instructions:

{% hint style="info" %}
**Guardian Setup**: For complete Guardian platform setup instructions, see the [Installation Guide](../../../guardian/readme/getting-started/README.md).
{% endhint %}

**Methodology-Specific Setup Considerations**:
- [User input required: Specific setup requirements for methodology development]
- [User input required: Additional tools needed for methodology work]
- [User input required: Environment configuration for methodology testing]

**Quick Setup Validation**:
1. Follow the [Prerequisites](../../../guardian/readme/getting-started/prerequisites.md) guide
2. Complete [Building from Source](../../../guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/README.md)
3. Verify methodology development capabilities: [User input required]
```

### Methodology Understanding Integration Pattern

```markdown
## Guardian Documentation Integration for Methodology Context

### Methodology Domain Knowledge Context
This content focuses on methodology understanding. For Guardian platform details, see:

- [Guardian Architecture](../../../guardian/architecture/README.md) - How Guardian supports methodology implementation
- [Policy Workflow Blocks](../../../guardian/standard-registry/policies/policy-creation/introduction/README.md) - Available blocks for methodology workflow
- [Schema Types](../../../guardian/standard-registry/schemas/available-schema-types.md) - Data structures for methodology requirements

**Methodology-Specific Context**: [User input required for methodology-specific domain knowledge]
```

### Platform Overview Integration Pattern

```markdown
## Guardian Documentation Integration for Platform Overview

### Architecture Overview Section
{% hint style="info" %}
**Detailed Architecture**: For comprehensive Guardian architecture documentation, see [Guardian Architecture](../../../guardian/architecture/README.md).
{% endhint %}

**Methodology Developer Focus**:
This section highlights Guardian architecture aspects most relevant to methodology digitization:

1. **Service Architecture for Methodologies**
   - [Link to detailed architecture docs](../../../guardian/architecture/reference-architecture.md)
   - [User input required: How methodologies use Guardian services]

2. **Data Flow for Methodology Workflows**
   - [Link to data flow documentation](../../../guardian/architecture/schema-architecture.md)
   - [User input required: Methodology data flow examples]
```

## Reference Integration Templates

### Documentation Link Template

```markdown
## [Guardian Feature] for Methodology Development

{% hint style="info" %}
**Complete Documentation**: For full details on [Guardian Feature], see [Link to Guardian Docs](../../../guardian/path/to/docs.md).
{% endhint %}

**Methodology Context**: [How this feature applies to methodology digitization]

**VM0033 Example**: [User input required: Specific VM0033 application]

**Key Points for Methodology Developers**:
- [Methodology-specific consideration 1]
- [Methodology-specific consideration 2]
- [Methodology-specific consideration 3]

**Next Steps**: [How this prepares for methodology implementation]
```

### Cross-Reference Template

```markdown
## Related Guardian Documentation

For deeper understanding of concepts covered in this section:

### Core Documentation
- **[Feature Name]**: [Link](../../../guardian/path/to/docs.md) - [Brief description of relevance]
- **[Feature Name]**: [Link](../../../guardian/path/to/docs.md) - [Brief description of relevance]

### API References
- **[API Category]**: [Link](../../../guardian/path/to/api-docs.md) - [Relevance to methodology work]

### Advanced Topics
- **[Advanced Feature]**: [Link](../../../guardian/path/to/advanced-docs.md) - [When this becomes relevant]
```

## Content Integration Guidelines

### What to Link vs. What to Explain

#### Always Link (Don't Duplicate)

* Guardian installation procedures
* Complete API documentation
* Comprehensive feature explanations
* Technical architecture details
* User interface guides

#### Provide Methodology Context For

* How Guardian features apply to methodology digitization
* VM0033-specific implementation examples
* Methodology developer workflow considerations
* Integration points between Guardian and methodology requirements

### Integration Quality Checklist

```markdown
## Guardian Integration Quality Checklist

For each Guardian reference:
- [ ] Links to existing documentation rather than duplicating
- [ ] Provides methodology-specific context
- [ ] Explains relevance to VM0033 implementation
- [ ] Maintains focus on methodology digitization
- [ ] Includes user input requirements for examples
- [ ] Validates links are current and functional
```

## Maintenance Procedures

### Link Validation

```bash
#!/bin/bash
# Validate Guardian documentation links in Part I

echo "Validating Guardian documentation links..."

# Check all Guardian documentation references
find docs/methodology-digitization-handbook/part-1 -name "*.md" -exec grep -l "\.\.\/\.\.\/\.\.\/guardian\/" {} \; | while read file; do
    echo "Checking Guardian links in $file"
    # Extract and validate Guardian documentation links
    grep -o "\.\.\/\.\.\/\.\.\/guardian\/[^)]*" "$file" | while read link; do
        if [ ! -f "docs/guardian/${link#../../../guardian/}" ]; then
            echo "BROKEN LINK: $link in $file"
        fi
    done
done

echo "Guardian link validation complete"
```

### Documentation Sync Process

```markdown
## Guardian Documentation Sync Process

### Monthly Sync
1. Review docs/SUMMARY.md for structural changes
2. Validate all Guardian documentation links
3. Update broken or moved references
4. Check for new relevant documentation

### Quarterly Review
1. Assess new Guardian features for methodology relevance
2. Update integration patterns as needed
3. Review user feedback on documentation usefulness
4. Optimize cross-reference effectiveness

### Annual Assessment
1. Comprehensive review of Guardian documentation integration
2. Update integration templates and patterns
3. Assess methodology developer needs evolution
4. Plan integration improvements
```

## User Input Integration

### Guardian-Specific User Input Requirements

```markdown
## Guardian Implementation Details Requiring User Input

### Environment Setup Content
- [ ] Current Guardian setup requirements for methodology development
- [ ] Specific tools and configurations needed for methodology work
- [ ] Guardian platform capabilities relevant to methodology digitization
- [ ] Screenshots of current Guardian interface

### Methodology Understanding Content
- [ ] How methodologies map to Guardian documentation structure
- [ ] Specific Guardian features used in methodology implementation
- [ ] Guardian workflow patterns relevant to methodologies

### Platform Overview Content
- [ ] Current Guardian architecture screenshots
- [ ] Methodology implementation details in Guardian
- [ ] Specific Guardian capabilities used for methodologies
- [ ] User interface examples from methodology implementations
```

***

{% hint style="success" %}
**Integration Success**: This system ensures handbook content leverages existing Guardian documentation effectively while maintaining focus on methodology digitization and implementation.
{% endhint %}
