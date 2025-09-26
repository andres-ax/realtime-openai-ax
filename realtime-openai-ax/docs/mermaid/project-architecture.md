# Arquitectura del Proyecto Realtime-OpenAI-AX

**Última actualización:** 26 de Septiembre, 2025  
**Componentes analizados:** Estructura inicial Next.js  

```mermaid
graph TB
    subgraph "🏗️ ARQUITECTURA HEXAGONAL"
        subgraph "🎯 DOMAIN LAYER"
            E[Entities]
            VO[Value Objects]
            DS[Domain Services]
            DR[Domain Repositories]
            DE[Domain Events]
        end
        
        subgraph "⚡ APPLICATION LAYER"
            UC[Use Cases]
            CMD[Commands]
            QRY[Queries]
            EH[Event Handlers]
            DTO[DTOs]
        end
        
        subgraph "🔧 INFRASTRUCTURE LAYER"
            API[API Adapters]
            DB[Database Adapters]
            UI[UI Components]
            EXT[External Services]
        end
    end
    
    subgraph "🌐 NEXT.JS FRAMEWORK"
        APP[App Router]
        PAGES[Pages]
        COMP[Components]
        API_ROUTES[API Routes]
    end
    
    %% Flujo de dependencias (Hexagonal)
    UI --> UC
    API --> UC
    UC --> DS
    UC --> DR
    CMD --> UC
    QRY --> UC
    EH --> DE
    
    %% Integración con Next.js
    APP --> UI
    PAGES --> UI
    COMP --> UI
    API_ROUTES --> API
    
    style E fill:#e1f5fe
    style VO fill:#e8f5e8
    style DS fill:#fff3e0
    style UC fill:#f3e5f5
    style CMD fill:#ffebee
    style QRY fill:#e0f2f1
```

## 🎯 Patrones Arquitectónicos Objetivo

### 🔷 Capa Domain (DDD)
- **Entities:** Objetos con identidad única
- **Value Objects:** Objetos inmutables sin identidad
- **Domain Services:** Lógica de negocio compleja
- **Domain Events:** Comunicación entre bounded contexts

### ⚡ Capa Application (CQRS)
- **Commands:** Operaciones que modifican estado
- **Queries:** Operaciones de solo lectura
- **Use Cases:** Orquestación de lógica de aplicación
- **Event Handlers:** Procesamiento de eventos de dominio

### 🔧 Capa Infrastructure
- **Adapters:** Implementaciones concretas de puertos
- **External Services:** Integraciones con APIs externas
- **UI Components:** Componentes de interfaz de usuario
- **Database:** Persistencia y acceso a datos

## 📊 Estado Actual
- **Estructura creada:** ✅ Carpetas base configuradas
- **Patrones implementados:** 0/39
- **Próximo paso:** Implementar entidades de dominio básicas
