# Migration Architecture Diagram

## Before Migration (Monorepo)

```
┌────────────────────────────────────────────────────────────────┐
│                    atma-backend (monorepo)                     │
│                  github.com/PetaTalenta/backend                │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ api-gateway  │  │admin-service │  │analysis-worker│       │
│  │   (folder)   │  │   (folder)   │  │   (folder)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │documentation │  │  chatbot     │  │ notification  │       │
│  │   -service   │  │  -service    │  │  -service     │       │
│  │   (folder)   │  │   (folder)   │  │   (folder)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  + auth-service, archive-service, assessment-service, etc.    │
└────────────────────────────────────────────────────────────────┘
```

## After Migration (Submodules)

```
┌────────────────────────────────────────────────────────────────┐
│                    atma-backend (main repo)                    │
│                  github.com/PetaTalenta/backend                │
│                          (PUBLIC)                               │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ api-gateway  │  │admin-service │  │analysis-worker│       │
│  │ (submodule)  │  │ (submodule)  │  │ (submodule)   │       │
│  │      ├───────┼──┤      ├───────┼──┤      ├────────┤       │
│  └──────┼───────┘  └──────┼───────┘  └──────┼────────┘       │
│         │                 │                  │                 │
│         ▼                 ▼                  ▼                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │documentation │  │  chatbot     │  │ notification  │       │
│  │   -service   │  │  -service    │  │  -service     │       │
│  │ (submodule)  │  │ (submodule)  │  │ (submodule)   │       │
│  │      ├───────┼──┤      ├───────┼──┤      ├────────┤       │
│  └──────┼───────┘  └──────┼───────┘  └──────┼────────┘       │
│         │                 │                  │                 │
│  + auth-service, archive-service, assessment-service, etc.    │
└─────────┼─────────────────┼──────────────────┼─────────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  api-gateway    │ │  admin-service  │ │analysis-worker  │
│  (own repo)     │ │  (own repo)     │ │  (own repo)     │
│  PetaTalenta/   │ │  PetaTalenta/   │ │  PetaTalenta/   │
│  api-gateway    │ │  admin-service  │ │  analysis-worker│
│  (PUBLIC)       │ │  (PUBLIC)       │ │  (PUBLIC)       │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ documentation   │ │  chatbot        │ │  notification   │
│  -service       │ │  -service       │ │  -service       │
│  (own repo)     │ │  (own repo)     │ │  (own repo)     │
│  PetaTalenta/   │ │  PetaTalenta/   │ │  PetaTalenta/   │
│  documentation  │ │  chatbot        │ │  notification   │
│  -service       │ │  -service       │ │  -service       │
│  (PUBLIC)       │ │  (PUBLIC)       │ │  (PUBLIC)       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Git Submodule Relationship

```
Main Repository: github.com/PetaTalenta/backend
│
├─ .gitmodules (tracks all submodules)
│
├─ api-gateway/ @ commit abc123
│  └─ → github.com/PetaTalenta/api-gateway
│
├─ admin-service/ @ commit def456
│  └─ → github.com/PetaTalenta/admin-service
│
├─ analysis-worker/ @ commit ghi789
│  └─ → github.com/PetaTalenta/analysis-worker
│
├─ documentation-service/ @ commit jkl012
│  └─ → github.com/PetaTalenta/documentation-service
│
├─ chatbot-service/ @ commit mno345
│  └─ → github.com/PetaTalenta/chatbot-service
│
└─ notification-service/ @ commit pqr678
   └─ → github.com/PetaTalenta/notification-service
```

## Workflow: Making Changes

```
Developer Workflow:

1. Clone Main Repo
   ┌────────────────┐
   │ git clone      │
   │ --recursive    │
   └───────┬────────┘
           │
           ▼
   ┌────────────────┐
   │ All submodules │
   │ are cloned too │
   └────────────────┘

2. Work on a Service
   ┌────────────────┐
   │ cd api-gateway │
   └───────┬────────┘
           │
           ▼
   ┌────────────────┐
   │ Make changes   │
   │ git commit     │
   │ git push       │
   └───────┬────────┘
           │
           ▼
   ┌────────────────────┐
   │ Changes pushed to  │
   │ api-gateway repo   │
   └────────────────────┘

3. Update Main Repo
   ┌────────────────┐
   │ cd ..          │
   │ git add        │
   │ api-gateway    │
   └───────┬────────┘
           │
           ▼
   ┌────────────────┐
   │ git commit -m  │
   │ "Update sub"   │
   │ git push       │
   └───────┬────────┘
           │
           ▼
   ┌────────────────────┐
   │ Main repo points   │
   │ to new commit      │
   └────────────────────┘
```

## Benefits Comparison

```
┌─────────────────────┬─────────────────┬──────────────────────┐
│     Feature         │   Monorepo      │   Submodules         │
├─────────────────────┼─────────────────┼──────────────────────┤
│ Single Clone        │       ✅        │    ✅ (--recursive)  │
│ Independent Version │       ❌        │        ✅            │
│ Separate CI/CD      │       ❌        │        ✅            │
│ Per-Service Access  │       ❌        │        ✅            │
│ Smaller Repo Size   │       ❌        │        ✅            │
│ Team Focus          │       ❌        │        ✅            │
│ Public Visibility   │   All/Nothing   │    Per Repository    │
└─────────────────────┴─────────────────┴──────────────────────┘
```

## Repository Structure After Migration

```
atma-backend/
├── .git/                        # Main repo git
├── .gitmodules                  # Submodule configuration
│
├── api-gateway/                 # Submodule
│   ├── .git                     # → Points to PetaTalenta/api-gateway
│   ├── src/
│   └── package.json
│
├── admin-service/               # Submodule
│   ├── .git                     # → Points to PetaTalenta/admin-service
│   ├── src/
│   └── package.json
│
├── analysis-worker/             # Submodule
│   ├── .git                     # → Points to PetaTalenta/analysis-worker
│   ├── src/
│   └── package.json
│
├── documentation-service/       # Submodule
│   ├── .git                     # → Points to PetaTalenta/documentation-service
│   ├── src/
│   └── package.json
│
├── chatbot-service/             # Submodule
│   ├── .git                     # → Points to PetaTalenta/chatbot-service
│   ├── src/
│   └── package.json
│
├── notification-service/        # Submodule
│   ├── .git                     # → Points to PetaTalenta/notification-service
│   ├── src/
│   └── package.json
│
├── auth-service/                # Remains in main repo
├── archive-service/             # Remains in main repo
├── assessment-service/          # Remains in main repo
│
├── docker-compose.yml           # Still works with submodules
└── package.json                 # Main repo config
```

## .gitmodules File Example

```ini
[submodule "api-gateway"]
    path = api-gateway
    url = https://github.com/PetaTalenta/api-gateway.git

[submodule "admin-service"]
    path = admin-service
    url = https://github.com/PetaTalenta/admin-service.git

[submodule "analysis-worker"]
    path = analysis-worker
    url = https://github.com/PetaTalenta/analysis-worker.git

[submodule "documentation-service"]
    path = documentation-service
    url = https://github.com/PetaTalenta/documentation-service.git

[submodule "chatbot-service"]
    path = chatbot-service
    url = https://github.com/PetaTalenta/chatbot-service.git

[submodule "notification-service"]
    path = notification-service
    url = https://github.com/PetaTalenta/notification-service.git
```
