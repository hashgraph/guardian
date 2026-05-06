# Mapping Pipeline - Architecture Diagrams

## 1. Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Policy Decode Processor                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Extract & Store Schemas                                     │
│     └─> PolicySchemaImportService                               │
│         └─> policy_schema table                                 │
│                                                                 │
│  2. Execute Mapping Pipeline                                    │
│     └─> MappingPipelineService                                 │
│         │                                                       │
│         ├─→ Step 1: Map Schemas                                 │
│         │   ├─> IMapSchemasStrategy (interface)                │
│         │   ├─→ RuleMapSchemasService                           │
│         │   └─→ AIMapSchemasService                             │
│         │       └─> Factory Provider (configurable)             │
│         │       └─> Environment: MAP_SCHEMAS_METHOD             │
│         │                                                       │
│         └─→ Step 2: Map Fields                                  │
│             ├─> IMapFieldsStrategy (interface)                  │
│             ├─→ RuleMapFieldsService                            │
│             └─→ AIMapFieldsService                              │
│                 └─> Factory Provider (configurable)             │
│                 └─> Environment: MAP_FIELDS_METHOD              │
│                                                                 │
│  3. Store Results                                               │
│     └─> business_view table (businessData)                     │
│         ├─> schemaLabelMap                                      │
│         └─> fieldMap                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Strategy Pattern Flow

```
┌──────────────────────────────────────────────────────────┐
│         Environment Variables                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ MAP_SCHEMAS_METHOD = RULE | AI | CUSTOM            │ │
│  │ MAP_FIELDS_METHOD = RULE | AI | ML                 │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────┐
│         Factory Providers                                │
│  ┌──────────────────┬──────────────────┐               │
│  │  mapSchemas      │   mapFields      │               │
│  │  Provider        │   Provider       │               │
│  ├──────────────────┼──────────────────┤               │
│  │ Reads config     │ Reads config     │               │
│  │ Returns impl     │ Returns impl     │               │
│  └──────────────────┴──────────────────┘               │
└──────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
    ┌────────────┐  ┌────────────┐  ┌───────────┐
    │   RULE     │  │     AI     │  │  CUSTOM   │
    ├────────────┤  ├────────────┤  ├───────────┤
    │ Fast       │  │ Smart      │  │ Your Logic│
    │ No Deps    │  │ LLM Future │  │           │
    └────────────┘  └────────────┘  └───────────┘
         ↓               ↓               ↓
         └───────────────┼───────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│      Injected into MappingPipelineService               │
│     (Implementation is transparent to pipeline)         │
└──────────────────────────────────────────────────────────┘
```

## 3. Data Flow

```
Raw Schemas (ZIP)
    │
    ↓
┌─────────────────────────────────┐
│   PolicySchemaImportService     │
│   Extract schema JSON files     │
└─────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────┐
│      policy_schema table        │
│  ┌─────────────────────────────┐│
│  │ schemaId  | name | document ││
│  │ uuid-1    | Proj | {...}    ││
│  │ uuid-2    | PDD  | {...}    ││
│  │ uuid-3    | MR   | {...}    ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
    │
    ↓ (Read & Convert)
┌─────────────────────────────────┐
│      SchemaInfo[]               │
│  ┌──────────────────────────────┐│
│  │ {                            ││
│  │   id: 'uuid-1'               ││
│  │   name: 'ProjectSchema'      ││
│  │   document: {...}            ││
│  │   rawSchema: {...}           ││
│  │ }                            ││
│  └──────────────────────────────┘│
└─────────────────────────────────┘
    │
    ↓ (STEP 1)
┌─────────────────────────────────┐
│   IMapSchemasStrategy           │
│   (RULE or AI selected)         │
│                                 │
│   Input: SchemaInfo[]           │
│   Logic: Identify schemas       │
│   Output: SchemaLabelMap        │
└─────────────────────────────────┘
    │
    ↓
┌─────────────────────────────────┐
│    SchemaLabelMap               │
│  ┌──────────────────────────────┐│
│  │ {                            ││
│  │   'ProjectSchema': 'uuid-1'  ││
│  │   'PDD': 'uuid-2'            ││
│  │   'MonitoringReport': 'uuid-3'││
│  │ }                            ││
│  └──────────────────────────────┘│
└─────────────────────────────────┘
    │
    ├──→ (STEP 2)
    │   ┌──────────────────────────────┐
    │   │  IMapFieldsStrategy          │
    │   │  (RULE or AI selected)       │
    │   │                              │
    │   │  Input:                      │
    │   │  - schemaMap                 │
    │   │  - schemas                   │
    │   │  - fields                    │
    │   │                              │
    │   │  Logic: Locate fields        │
    │   │  Output: FieldMap            │
    │   └──────────────────────────────┘
    │       │
    │       ↓
    │   ┌──────────────────────────────┐
    │   │      FieldMap                │
    │   │  ┌──────────────────────────┐│
    │   │  │ {                        ││
    │   │  │   'Project Title': {     ││
    │   │  │     schemaId: 'uuid-1'   ││
    │   │  │     path: 'name'         ││
    │   │  │   }                      ││
    │   │  │ }                        ││
    │   │  └──────────────────────────┘│
    │   └──────────────────────────────┘
    │
    ↓
┌─────────────────────────────────────────┐
│    business_view table (update)         │
│    ┌────────────────────────────────────┐│
│    │ businessData: {                    ││
│    │   schemaLabelMap: {...},           ││
│    │   fieldMap: {...}                  ││
│    │ }                                  ││
│    └────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

## 4. Strategy Selection Flow

```
Configuration Layer
    │
    ├─→ Environment Variable: MAP_SCHEMAS_METHOD = "RULE"
    │
    ↓
ConfigService.get('MAP_SCHEMAS_METHOD')
    │
    ├─→ "RULE"
    │
    ↓
switch (method.toUpperCase())
    ├─→ case 'RULE': new RuleMapSchemasService()
    ├─→ case 'AI': new AIMapSchemasService()
    └─→ default: new RuleMapSchemasService()
    │
    ↓
Injection Token: MAP_SCHEMAS_STRATEGY_TOKEN
    │
    ├─→ Provider instantiates service
    │
    ↓
NestJS DI Container
    │
    ├─→ Stores provider instance
    │
    ↓
@Inject(MAP_SCHEMAS_STRATEGY_TOKEN)
    │
    ├─→ Resolves to the configured implementation
    │
    ↓
MappingPipelineService
    │
    └─→ Receives strategy; calls execute()
        (Implementation is unknown to pipeline!)
```

## 5. File Structure

```
src/worker/mapping/
│
├── 📄 types.ts
│   └─ SchemaLabelMap, FieldMap, SchemaInfo, FieldDescriptor
│
├── 📁 interfaces/
│   └─ 📄 strategies.interface.ts
│      └─ IMapSchemasStrategy, IMapFieldsStrategy
│
├── 📁 tokens/
│   └─ 📄 mapping.tokens.ts
│      └─ Injection tokens, method types, defaults
│
├── 📁 strategies/
│   │
│   ├─ 📁 map-schemas/
│   │  ├─ 📄 rule-map-schemas.service.ts
│   │  └─ 📄 ai-map-schemas.service.ts
│   │
│   └─ 📁 map-fields/
│      ├─ 📄 rule-map-fields.service.ts
│      └─ 📄 ai-map-fields.service.ts
│
├── 📁 providers/
│   ├─ 📄 map-schemas.provider.ts
│   └─ 📄 map-fields.provider.ts
│
├── 📄 mapping-pipeline.service.ts
│   └─ Orchestration (Step 1 + Step 2)
│
├── 📄 mapping.module.ts
│   └─ NestJS module (imports, providers, exports)
│
├── 📄 ARCHITECTURE.md
│   └─ Comprehensive documentation
│
└── 📄 QUICK_START.md
   └─ Quick reference and examples
```

## 6. Dependency Injection Graph

```
┌────────────────────────────────────────────────┐
│         ConfigService (Global)                 │
│    (Reads environment variables)               │
└────────────────────────────────────────────────┘
    ↑                           ↑
    │                           │
    └─────────────┬─────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ↓                 ↓
    ┌─────────────┐   ┌─────────────┐
    │  Schemas    │   │   Fields    │
    │  Provider   │   │  Provider   │
    └─────────────┘   └─────────────┘
         ↓                 ↓
    ┌─────────────┐   ┌─────────────┐
    │  Strategy   │   │  Strategy   │
    │  Impl.      │   │  Impl.      │
    └─────────────┘   └─────────────┘
         ↑                 ↑
         │        ┌────────┘
         │        │
         ↓        ↓
┌─────────────────────────────────────┐
│  MappingPipelineService             │
│  (Orchestration)                    │
└─────────────────────────────────────┘
         ↑
         │
         │
┌─────────────────────────────────────┐
│  PolicyDecodeProcessor              │
│  (Uses pipeline)                    │
└─────────────────────────────────────┘
```

## 7. How to Add a New Strategy

```
┌─────────────────┐
│  1. Implement   │
│  Interface      │
│  IMapXxxStrategy│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  2. Create      │
│  NewXxxService  │
│  in strategies/ │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  3. Register in │
│  Factory        │
│  Provider       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  4. Set Env Var │
│  XXX_METHOD=... │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│  5. Done!               │
│  Pipeline uses it auto  │
│  No other changes       │
└─────────────────────────┘
```

## 8. Test Scenarios

```
Test 1: Rule-Based Mapping
    Configuration: MAP_SCHEMAS_METHOD=RULE, MAP_FIELDS_METHOD=RULE
    ├─→ RuleMapSchemasService
    ├─→ RuleMapFieldsService
    └─→ Fast, deterministic results

Test 2: AI-Based Mapping
    Configuration: MAP_SCHEMAS_METHOD=AI, MAP_FIELDS_METHOD=AI
    ├─→ AIMapSchemasService
    ├─→ AIMapFieldsService
    └─→ Falls back to rule-based (LLM not integrated yet)

Test 3: Hybrid
    Configuration: MAP_SCHEMAS_METHOD=RULE, MAP_FIELDS_METHOD=AI
    ├─→ RuleMapSchemasService
    ├─→ AIMapFieldsService
    └─→ Mix of strategies

Test 4: Custom Implementation
    Configuration: MAP_FIELDS_METHOD=ML
    ├─→ MLMapFieldsService (custom)
    ├─→ Loaded from factory
    └─→ Used in pipeline automatically
```

---

**Legend:**
- `→` = Data flow or dependency
- `├→` = Branch
- `↓` = Sequence
- `📄` = File
- `📁` = Directory
