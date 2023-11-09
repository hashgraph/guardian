# 📂 Tools

Tools are a separate integrated constituents of Policies which have their internals (blocks, events, and schemas) isolated from the rest of the policy via an interfaces through which Tools can interoperate with the rest of the content of Policies.

Tool are similar to Modules, with an exception of:

1. Unlike Modules, Tools do not get wholly embedded into Policies, instead Policies contain links (i.e. references) to tools.
2. Standard Registry cannot edit Tools added to the Policy, except for their external interfaces
3. Tools can contain other Tools.
