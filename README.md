# Reservas + Notificaciones con Clean Architecture — Grupo 9

Ejercicio de la exposición (Monolito modular vs Microservicios y Clean Architecture).
Es aparte del TPI: solo toma el concepto del módulo M9 Reservas de Viajes.

- **Versión A:** monolito modular, un contenedor. `INotificador` se resuelve en memoria.
- **Versión B:** Notificaciones como servicio separado. `INotificador` se resuelve con un cliente HTTP.
  Si cae Notificaciones, la reserva se crea igual y la notificación queda `PENDIENTE`.

Solo cambia `infrastructure` y la composición (`main`). `domain` y `application` no se tocan.

## Requisitos

Node 20 o superior. Docker solo para levantar las versiones A y B.

```bash
npm install
npm test          # pruebas
npm run typecheck # verifica tipos
```

## Estructura y responsables

```
src/
  domain/                 Persona 1 · entidades, reglas y puertos (no importa nada de afuera)
    Reserva.ts            entidad: estados PENDIENTE / CONFIRMADA / CANCELADA
    ReglaAnticipacion.ts  ventana de anticipación (por defecto 60 min a 30 días, como M9)
    NotificacionPendiente.ts
    ErrorDeDominio.ts     errores con código (FECHA_PASADA, ANTICIPACION_INSUFICIENTE, ...)
    puertos/
      IReservaRepository.ts
      INotificador.ts
      INotificacionPendienteRepository.ts
    index.ts              importar siempre desde acá
  application/            Persona 2 · casos de uso Crear y Cancelar reserva · Persona 4 · reintento
  infrastructure/         Persona 3 · repositorio de reservas · Persona 4 · notificador en memoria
                          Persona 5 · cliente HTTP · Persona 7 · repositorio de pendientes
  api/                    Persona 3 · endpoints crear, cancelar y consultar
  main/                   Persona 1 · composición de dependencias (único lugar que elige implementaciones)
test/
```

**Regla de dependencia:** `api`, `infrastructure` y `main` pueden importar `application` y `domain`;
`application` solo importa `domain`; `domain` no importa nada del proyecto ni de Node (ni `fs`, ni `http`, ni bases).
La Persona 7 lo verifica con una prueba automática.

## Contrato de los puertos (para Personas 2, 3, 4, 5 y 7)

```ts
interface IReservaRepository {
  guardar(reserva: Reserva): Promise<void>;           // inserta o reemplaza por id
  buscarPorId(id: string): Promise<Reserva | null>;
  listarPorCliente(clienteId: string): Promise<Reserva[]>;
}

interface INotificador {
  notificar(n: Notificacion): Promise<void>;          // si no puede entregar, rechaza con ErrorDeNotificacion
}

interface INotificacionPendienteRepository {
  guardar(p: NotificacionPendiente): Promise<void>;   // inserta o reemplaza por id
  listarPendientes(): Promise<NotificacionPendiente[]>;
}
```

Cómo se usan:

- **Crear una reserva:** `Reserva.crear({ id, clienteId, origen, destino, tipoVehiculo, fechaHora }, regla, ahora)`.
  El `id` lo genera el caso de uso (`crypto.randomUUID()`). Si una regla no se cumple, lanza `ErrorDeDominio` con `codigo`.
- **Transiciones:** `reserva.confirmar(ahora)` y `reserva.cancelar(motivo, ahora)`.
- **Repositorios:** guardan `reserva.aProps()` y leen con `Reserva.reconstituir(props)`
  (lo mismo con `NotificacionPendiente`).
- **`ahora`** se pasa siempre como parámetro: en las pruebas se usa una fecha fija.
- **Falla de notificación:** `INotificador.notificar` rechaza con `ErrorDeNotificacion`.
  Quien lo llama crea `NotificacionPendiente.registrar(id, notificacion, error.message, ahora)`
  y la guarda; la reserva ya quedó guardada antes de notificar.
- **Reintento:** `listarPendientes()`, por cada una `notificar(p.notificacion)`;
  si anda, `p.marcarEntregada(ahora)`; si no, `p.registrarIntentoFallido(msg)`; y `guardar(p)`.

## Composición de dependencias (`src/main`)

`src/main/composicion.ts` es el único lugar donde se eligen las implementaciones y se inyectan en los casos de uso.
`src/main/config.ts` es el único que lee variables de entorno.

```ts
const deps = componer(leerConfig(process.env));
// deps: { reservas, pendientes, notificador, crearReserva, consultarReserva, listarPendientes }
```

Pasar de la versión A a la B es solo `MODO_NOTIFICACIONES=http` + `NOTIFICACIONES_URL`.

Nombres acordados (la composición los importa así):

| Quién | Archivo | Clase / función | Constructor |
|---|---|---|---|
| Lara | `src/application/CrearReserva.ts` | `CrearReserva` | `(reservas, notificador, pendientes, regla, reloj)` |
| Lara | `src/application/ConsultarReserva.ts` | `ConsultarReserva` | `(reservas)` |
| Lara | `src/application/ListarPendientes.ts` | `ListarPendientes` | `(pendientes)` |
| Valentino | `src/infrastructure/ReservaRepositoryEnMemoria.ts` | `ReservaRepositoryEnMemoria` | `()` |
| Valentino | `src/infrastructure/NotificacionPendienteRepositoryEnMemoria.ts` | `NotificacionPendienteRepositoryEnMemoria` | `()` |
| Valentino | `src/api/app.ts` | `crearApp` | `({ crearReserva, consultarReserva, listarPendientes })` |
| Valentino | `src/main/server.ts` | — | `componer(leerConfig(process.env))` y escucha en `config.puerto` |
| Oriana | `src/infrastructure/NotificadorEnMemoria.ts` | `NotificadorEnMemoria` | `()` |
| Oriana | `src/notificaciones/server.ts` | — | `POST /notificaciones` en el puerto 3001 |
| Bianca | `src/infrastructure/NotificadorHttp.ts` | `NotificadorHttp` | `(urlBase, timeoutMs)` |

Uso de los casos de uso (para la API):

- `crearReserva.ejecutar({ clienteId, origen, destino, tipoVehiculo, fechaHora })` → `Promise<Reserva>` (CONFIRMADA).
  `fechaHora` es `Date`: la API convierte el string del body con `new Date(...)`. Si una regla no se cumple, rechaza con `ErrorDeDominio`.
- `consultarReserva.ejecutar(id)` → `Promise<Reserva | null>` (`null` → 404).
- `listarPendientes.ejecutar()` → `Promise<NotificacionPendiente[]>`.
- Para responder JSON: `reserva.aProps()` y `pendiente.aProps()`.
- El body de `POST /notificaciones` es un objeto `Notificacion` del dominio: `{ reservaId, destinatario, tipo, mensaje }`.

`reloj` es `() => Date`. Si falla `notificar`, el caso de uso guarda la notificación como PENDIENTE (acordado).
Hasta que estén todas estas clases, `npm run typecheck` marca los imports faltantes de `composicion.ts`; `npm test` anda igual.

Traducción sugerida de errores a HTTP (Persona 3): `DATOS_INVALIDOS`, `FECHA_PASADA`,
`ANTICIPACION_INSUFICIENTE`, `ANTICIPACION_EXCEDIDA`, `MOTIVO_REQUERIDO` → 422;
`TRANSICION_INVALIDA` → 409; reserva inexistente → 404.

## Variables de entorno (las lee solo `main`)

| Variable | Por defecto | Para qué |
|---|---|---|
| `ANTICIPACION_MINIMA_MINUTOS` | 60 | Regla de anticipación |
| `ANTICIPACION_MAXIMA_DIAS` | 30 | Regla de anticipación |
| `MODO_NOTIFICACIONES` | `memoria` | `memoria` (versión A) o `http` (versión B) |
| `NOTIFICACIONES_URL` | — | URL del servicio en la versión B (obligatoria si es `http`) |
| `NOTIFICACIONES_TIMEOUT_MS` | 2000 | Timeout del cliente HTTP (versión B) |
| `PUERTO` | 3000 | Puerto de la API |
