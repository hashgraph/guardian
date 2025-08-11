---
icon: layer-group
---

# Schema Editing through JSON

Schemas can be defined/changed by editing their JSON definitions

<figure><img src="../../../.gitbook/assets/image (103).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Schema JSON definition contains the following editable fields

1. **name** – schema name
2. **description** – schema description
3. **entity** – schema type (NONE, VC, EVC)
4. **fields** – schema fields array
   1. **key** – key (name) of the field
   2. **title** – field title
   3. **description** – schema description (visible to the user)
   4. **required** – field visibility/type (Auto Calculate, Hidden, Required, None)
   5. **type** – field value tipe (Number, String, Enum, …) or the sub-schema reference (#be764ef6-…)
   6. **isArray** – boolean field (true\false) determining whether the field is an array
   7. **property** – optional field mapping onto the corresponding property from dMRV framework ([https://interworkalliance.github.io/TokenTaxonomyFramework/dmrv/spec/](https://interworkalliance.github.io/TokenTaxonomyFramework/dmrv/spec/))
   8. **private** – if the field is private (only relevant for ‘selective disclosure’ EVCs)
   9. **enum** – array of options, or reference to an array of options
   10. **textSize** – size of the text (only for Help Text)
   11. **textColor** – color of the text (only for Help Text)
   12. **textBold** – if the text is bold (only for Help Text)
   13. **pattern** – regular expression to format the inputted text (only relevant for Strings)
   14. **expression** – formula for calculating field values (only for ‘Auto Calculate’ fields)
   15. **unit** – fixed Prefix or Postfix (only for Prefix or Postfix)
   16. **example** – example values for the field
   17. **default** – default value for the field
   18. **suggest** – suggested value for the field
5. **conditions** – schema name
   1. **if** – conditions for displaying the fields (only equality is supported)
      1. **field** – key (name) of the field
      2. **value** – comparison value for the field value
   2. **then** – array of fields which is shown when the condition resolves to true (the same format as _fields_)
   3. **else** – array of fields which is shown when the condition resolves to false (the same format as _fields_)
