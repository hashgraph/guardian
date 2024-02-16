# 📒 Artifacts

Artifacts can be represented as JSON files. JSON (JavaScript Object Notation) is a lightweight data-interchange format that is widely used for storing and exchanging structured data.

**Policy JSON File**: This file represents a policy and contains information such as the policy name, description, conditions, actions, parameters, and any associated metadata. It defines the rules and logic that need to be enforced. For example:

```
{
  "name": "Access Control Policy",
  "description": "Controls access to sensitive data",
  "conditions": {
    "userRole": "admin",
    "location": "internal"
  },
  "actions": {
    "blockAccess": true
  },
  "parameters": {
    "expirationDate": "2023-06-30"
  },
  "metadata": {
    "createdBy": "John Doe",
    "createdOn": "2023-05-31"
  }
}

```

**Workflow JSON File**: This file represents a workflow and defines the sequence of tasks or actions to be performed. It includes information such as task names, dependencies, triggers, and any associated data or parameters. For example:

```
{
  "name": "Employee Onboarding Workflow",
  "tasks": [
    {
      "name": "Assign Manager",
      "dependencies": [],
      "actions": [
        {
          "type": "assignUser",
          "user": "manager1"
        }
      ]
    },
    {
      "name": "Send Welcome Email",
      "dependencies": ["Assign Manager"],
      "actions": [
        {
          "type": "sendEmail",
          "to": "employee@example.com",
          "subject": "Welcome to the company!"
        }
      ]
    }
  ]
}

```
