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

{% hint style="info" %}
Note: All the expressions available in [Math.js](https://mathjs.org/docs/) are supported by calculateMathAddOnBlock.
{% endhint %}

<table><thead><tr><th>Operator</th><th>Name</th><th>Syntax</th><th width="140">Associativity</th><th>Example</th><th>Result</th></tr></thead><tbody><tr><td><code>(</code>, <code>)</code></td><td>Grouping</td><td><code>(x)</code></td><td>None</td><td><code>2 * (3 + 4)</code></td><td><code>14</code></td></tr><tr><td><code>[</code>, <code>]</code></td><td>Matrix, Index</td><td><code>[...]</code></td><td>None</td><td><code>[[1,2],[3,4]]</code></td><td><code>[[1,2],[3,4]]</code></td></tr><tr><td><code>{</code>, <code>}</code></td><td>Object</td><td><code>{...}</code></td><td>None</td><td><code>{a: 1, b: 2}</code></td><td><code>{a: 1, b: 2}</code></td></tr><tr><td><code>,</code></td><td>Parameter separator</td><td><code>x, y</code></td><td>Left to right</td><td><code>max(2, 1, 5)</code></td><td><code>5</code></td></tr><tr><td><code>.</code></td><td>Property accessor</td><td><code>obj.prop</code></td><td>Left to right</td><td><code>obj={a: 12}; obj.a</code></td><td><code>12</code></td></tr><tr><td><code>;</code></td><td>Statement separator</td><td><code>x; y</code></td><td>Left to right</td><td><code>a=2; b=3; a*b</code></td><td><code>[6]</code></td></tr><tr><td><code>;</code></td><td>Row separator</td><td><code>[x; y]</code></td><td>Left to right</td><td><code>[1,2;3,4]</code></td><td><code>[[1,2],[3,4]]</code></td></tr><tr><td></td><td>Statement separator</td><td><code>x \n y</code></td><td>Left to right</td><td><code>a=2 \n b=3 \n a*b</code></td><td><code>[2,3,6]</code></td></tr><tr><td><code>+</code></td><td>Add</td><td><code>x + y</code></td><td>Left to right</td><td><code>4 + 5</code></td><td><code>9</code></td></tr><tr><td><code>+</code></td><td>Unary plus</td><td><code>+y</code></td><td>Right to left</td><td><code>+4</code></td><td><code>4</code></td></tr><tr><td><code>-</code></td><td>Subtract</td><td><code>x - y</code></td><td>Left to right</td><td><code>7 - 3</code></td><td><code>4</code></td></tr><tr><td><code>-</code></td><td>Unary minus</td><td><code>-y</code></td><td>Right to left</td><td><code>-4</code></td><td><code>-4</code></td></tr><tr><td><code>*</code></td><td>Multiply</td><td><code>x * y</code></td><td>Left to right</td><td><code>2 * 3</code></td><td><code>6</code></td></tr><tr><td><code>.*</code></td><td>Element-wise multiply</td><td><code>x .* y</code></td><td>Left to right</td><td><code>[1,2,3] .* [1,2,3]</code></td><td><code>[1,4,9]</code></td></tr><tr><td><code>/</code></td><td>Divide</td><td><code>x / y</code></td><td>Left to right</td><td><code>6 / 2</code></td><td><code>3</code></td></tr><tr><td><code>./</code></td><td>Element-wise divide</td><td><code>x ./ y</code></td><td>Left to right</td><td><code>[9,6,4] ./ [3,2,2]</code></td><td><code>[3,3,2]</code></td></tr><tr><td><code>%</code></td><td>Percentage</td><td><code>x%</code></td><td>None</td><td><code>8%</code></td><td><code>0.08</code></td></tr><tr><td><code>%</code></td><td>Addition with Percentage</td><td><code>x + y%</code></td><td>Left to right</td><td><code>100 + 3%</code></td><td><code>103</code></td></tr><tr><td><code>%</code></td><td>Subtraction with Percentage</td><td><code>x - y%</code></td><td>Left to right</td><td><code>100 - 3%</code></td><td><code>97</code></td></tr><tr><td><code>%</code> <code>mod</code></td><td>Modulus</td><td><code>x % y</code></td><td>Left to right</td><td><code>8 % 3</code></td><td><code>2</code></td></tr><tr><td><code>^</code></td><td>Power</td><td><code>x ^ y</code></td><td>Right to left</td><td><code>2 ^ 3</code></td><td><code>8</code></td></tr><tr><td><code>.^</code></td><td>Element-wise power</td><td><code>x .^ y</code></td><td>Right to left</td><td><code>[2,3] .^ [3,3]</code></td><td><code>[8,27]</code></td></tr><tr><td><code>'</code></td><td>Transpose</td><td><code>y'</code></td><td>Left to right</td><td><code>[[1,2],[3,4]]'</code></td><td><code>[[1,3],[2,4]]</code></td></tr><tr><td><code>!</code></td><td>Factorial</td><td><code>y!</code></td><td>Left to right</td><td><code>5!</code></td><td><code>120</code></td></tr><tr><td><code>&#x26;</code></td><td>Bitwise and</td><td><code>x &#x26; y</code></td><td>Left to right</td><td><code>5 &#x26; 3</code></td><td><code>1</code></td></tr><tr><td><code>~</code></td><td>Bitwise not</td><td><code>~x</code></td><td>Right to left</td><td><code>~2</code></td><td><code>-3</code></td></tr><tr><td><code>|</code></td><td>Bitwise or</td><td><code>x | y</code></td><td>Left to right</td><td><code>5 | 3</code></td><td><code>7</code></td></tr><tr><td><code>^|</code></td><td>Bitwise xor</td><td><code>x ^| y</code></td><td>Left to right</td><td><code>5 ^| 2</code></td><td><code>7</code></td></tr><tr><td><code>&#x3C;&#x3C;</code></td><td>Left shift</td><td><code>x &#x3C;&#x3C; y</code></td><td>Left to right</td><td><code>4 &#x3C;&#x3C; 1</code></td><td><code>8</code></td></tr><tr><td><code>>></code></td><td>Right arithmetic shift</td><td><code>x >> y</code></td><td>Left to right</td><td><code>8 >> 1</code></td><td><code>4</code></td></tr><tr><td><code>>>></code></td><td>Right logical shift</td><td><code>x >>> y</code></td><td>Left to right</td><td><code>-8 >>> 1</code></td><td><code>2147483644</code></td></tr><tr><td><code>and</code></td><td>Logical and</td><td><code>x and y</code></td><td>Left to right</td><td><code>true and false</code></td><td><code>false</code></td></tr><tr><td><code>not</code></td><td>Logical not</td><td><code>not y</code></td><td>Right to left</td><td><code>not true</code></td><td><code>false</code></td></tr><tr><td><code>or</code></td><td>Logical or</td><td><code>x or y</code></td><td>Left to right</td><td><code>true or false</code></td><td><code>true</code></td></tr><tr><td><code>xor</code></td><td>Logical xor</td><td><code>x xor y</code></td><td>Left to right</td><td><code>true xor true</code></td><td><code>false</code></td></tr><tr><td><code>=</code></td><td>Assignment</td><td><code>x = y</code></td><td>Right to left</td><td><code>a = 5</code></td><td><code>5</code></td></tr><tr><td><code>?</code> <code>:</code></td><td>Conditional expression</td><td><code>x ? y : z</code></td><td>Right to left</td><td><code>15 > 100 ? 1 : -1</code></td><td><code>-1</code></td></tr><tr><td><code>:</code></td><td>Range</td><td><code>x : y</code></td><td>Right to left</td><td><code>1:4</code></td><td><code>[1,2,3,4]</code></td></tr><tr><td><code>to</code>, <code>in</code></td><td>Unit conversion</td><td><code>x to y</code></td><td>Left to right</td><td><code>2 inch to cm</code></td><td><code>5.08 cm</code></td></tr><tr><td><code>==</code></td><td>Equal</td><td><code>x == y</code></td><td>Left to right</td><td><code>2 == 4 - 2</code></td><td><code>true</code></td></tr><tr><td><code>!=</code></td><td>Unequal</td><td><code>x != y</code></td><td>Left to right</td><td><code>2 != 3</code></td><td><code>true</code></td></tr><tr><td><code>&#x3C;</code></td><td>Smaller</td><td><code>x &#x3C; y</code></td><td>Left to right</td><td><code>2 &#x3C; 3</code></td><td><code>true</code></td></tr><tr><td><code>></code></td><td>Larger</td><td><code>x > y</code></td><td>Left to right</td><td><code>2 > 3</code></td><td><code>false</code></td></tr><tr><td><code>&#x3C;=</code></td><td>Smallereq</td><td><code>x &#x3C;= y</code></td><td>Left to right</td><td><code>4 &#x3C;= 3</code></td><td><code>false</code></td></tr><tr><td><code>>=</code></td><td>Largereq</td><td><code>x >= y</code></td><td>Left to right</td><td><code>2 + 4 >= 6</code></td><td><code>true</code></td></tr></tbody></table>

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
