# calculateContainerBlock & calculateMathAddOnBlock

## calculateContainerBlock

### Properties

| Block Property | Definition                                                                              | Example Input                                                            |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Type           | Type of workflow logic block.                                                           | **calculateContainer**Block (Can't be changed).                          |
| inputSchema    | source VC schema                                                                        |                                                                          |
| inputFields    | array of variables which would be taken from the source VC                              | <p>"name": "field0", </p><p>"title": "Summary", </p><p>"value": "E0"</p> |
| Title          | The value is set automatically for user convenience                                     | Input                                                                    |
| outputSchema   | output VC schema                                                                        |                                                                          |
| outputFields   | array of variables of output VC, which will be field with the values from the variables | <p>"name": "field0", </p><p>"title": "Summary", </p><p>"value": "E1"</p> |
| Title          | The value is set automatically for user convenience                                     | Output                                                                   |

## calculateMathAddonBlock

### Properties

| Block Property | Definition                    | Example Input                                      |
| -------------- | ----------------------------- | -------------------------------------------------- |
| Type           | Type of workflow logic block. | **calculateMathAddon**Block (Can't be changed).    |
| equations      | array of formulas             | <p>"variable": "E1", </p><p>"formula": "E0*10"</p> |

### Example

```
in the input VC is { "field0": 5 }
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
	Then 
		1 input VC variable "E0" will contain 5 (e.g. "E0" = 5)
		2 when executed a new variable "E1" will be created with the value "E1" = E0*10 = 5 * 10 = 50
		3 in the output VC there will be "E1" variable
	The result will be VC = { "field0": 50 }
```

