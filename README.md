# Omnibaas


⚠️ **Current status:** Early Proof of Concept. APIs and configuration format may change.

Omnibaas is a provider-agnostic Infrastructure-as-Code compiler for Baas services:

>##                                    **Describe once. Deploy anywhere.**
                            
                                           backend.yaml
                                                │
                                                ▼
                                        Omnibaas Terraformer
                                                │
                                                ▼
                                         Provider adapter
                                                │
                                    ┌───────────┴───────────┐
                                    ▼           ▼           ▼
                                Appwrite    Supabase    PostgreSQL
      
Nowadays Baas services are strongly growing in popularity, especially thanks to no-code and AI development tools that choose to use them, but there's a problem, once your application is built around a BaaS provider, **migrating to another one becomes increasingly difficult, even if pricing, reliability, or available features change over time**, despite most BaaS providers share the same core features.

**If you share my vision and want to contribute to the development of the projecty, please leave a star :)**

Omnibaas wants to let the developer (or the LLM) write a universal schema for his backend and deploy it on whatever platform he prefers, whenever he wants to. At the moment Omnibaas is structured as follows:
- `backend.yaml`: this is the core of Omnibaas, it defines your backend structures
- The terraformer: validates, compares, plans and deploys your backend infrastructure
- Adapters: These are essentially connectors, written in a common format known by the terraformer

### `backend.yaml`
This file defines the schema of your backend (basically like .prisma file for prisma ORM ;) ), it is intended to be written in a YAML format. At the moment you can define: 
- Auth methods that you want to enable on your baas provider
- dbs (and if you want them to be enabled to user or not)
- tables and fields with four types of data(string, number, boolean, datetime) and required attribute ("?" at the end of the field key) 

I left a `backend.yaml` sample for you.

### The terraformer
Create a new Instance of the Terraformer Class to start using Omnibaas, at the moment it expose 4 methods:
- validate: pass it a new configuration to validate it through zod and be sure to avoid annoying errors later
- **introspect**: translate your current provider configuration in Omnibaas format 
- plan: pass your current and future configurations to get a summary of what the terraformer will do and the implementation plan
    summary example:

    `Following auth methods will be disabled: magic-url, email-otp, anonymous, invites, jwt
Following dbs will be created: db1, db2
Models restaurant, hotel of db1 DB will be created
Models photo, video of db2 DB will be created`

- **apply**: pass it your implementation plan and let the terraformer do the rest for you 

You can find a clear example of terraformer usage in example.ts
Terraformer class is basically **provider agnostic**, the adapters act like bridges between it and backend providers. With this structure it would be possible to call the introspect method for a provider and re-apply its configuration on another (maybe cheaper or faster) in seconds.

#### Adapters
At the moment I've written only the adapter for appwrite baas (`/adapters/appwrite.ts`). Adapter class MUST expose methods described in adapter interface in `/types/types.ts`. You need to connect Omnibaas to your Baas ? Just go ahead and write your adapter.

## Roadmap

✅ Appwrite adapter

🚧 Add support to more types

🚧 Firebase adapter

🚧 Supabase adapter

⬜ Add storage support

⬜ PostgreSQL adapter(long-term)

Omnibaas structure is born to be community driven, so do not hesitate in opening issues or pull requests.
Want to support a new provider? Implement the `adapter` interface and open a pull request. Every provider extends the ecosystem for everyone. :)

---

MIT

TypeScript

Status: PoC

Contributions Welcome

---
