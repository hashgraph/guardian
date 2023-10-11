# calculateContainerBlock & calculateMathAddOnBlock

## calculateContainerBlock

This Block accepts source VC as input and generates output as new VC document.

### Input Parameters:

#### inputSchema : source VC schema

#### inputFields : array of variables which would be taken from the source VC.

| Variable | Definition                               | Example of Input |
| -------- | ---------------------------------------- | ---------------- |
| name     | Refer to the specified field value       | field0           |
| title    | Title of the operation                   | Summary          |
| value    | Variable to store the value of the field | E0               |

```
"inputFields": [
                    {
                      "name": "field0",
                      "title": "Summary",
                      "value": "E0"
                    },
                ]
```

New variable "E0" would be created with a value set to one from the "field0" in the VC document.

{% hint style="info" %}
"title" is not a mandatory parameter. The value is set automatically as per the user convenience.
{% endhint %}

### Output Parameters

#### outputSchema : output VC schema

#### outputFields : array of variables of output VC, which will be the field with the values from the variables.

| Variable | Definition                                | Example of Input |
| -------- | ----------------------------------------- | ---------------- |
| name     | Variable that refers to specified field   | field0           |
| title    | Title of the operation                    | Summary          |
| value    | Points to the value of specified variable | E1               |

```
outputFields: [
                    {
                      "name": "field0",
                      "title": "Summary",
                      "value": "E1"
                    }
                ]
```

The output variable "field0" will contain the value from the variable "E1".

{% hint style="info" %}
"title" is not a mandatory parameter. The value is set automatically as per the user convenience.
{% endhint %}

## calculateMathAddonBlock

This Block performs mathematical calculations sequentially.

#### equations : array of formulas.

```
"equations": [
                    {
                      "variable": "E1",
                      "formula": "E0*10"
                    }
                ]
```

When above code is executed, a new variable, "E1" will be created which would contain the value of the calculation "E0\*10".

### Example

In the input VC is { "field0" : 5 }

```
		calculateContainerBlock:
			"inputFields": [
				{
				  "name": "field0",
				  "value": "E0"
				}
			]
			"outputFields": [
				{
				  "name": "field0",
				  "value": "E1"
				}
			]
		calculateMathAddon
			"equations": [
				{
				  "variable": "E1",
				  "formula": "E0*10"
				}
			]
```

Then

1. input VC variable "E0" will contain 5 (eg. "E0" = 5)
2. When executed a new variable "E1" will be created with the value "E1" = E0\*10 = 5 \* 10 = 50
3. In the output VC there will be "E1" variable
4. The result will be VC = { "field0" : 50 }
