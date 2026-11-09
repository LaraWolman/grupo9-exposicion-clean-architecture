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

El proyecto está dividido en capas para separar
la lógica de negocio de las implementaciones técnicas.

### Organización del proyecto

- `src/domain/`: entidades, reglas de negocio y puertos. Lara.
- `src/application/`: casos de uso de reservas. Lara.
- `src/infrastructure/`: repositorios y notificadores.
  Valentino, Oriana y Bianca.
- `src/api/`: API de Reservas. Valentino.
- `src/main/`: configuración y conexión de componentes. Lara.
- `src/notificaciones/`: servicio HTTP independiente. Oriana.
- `test/arquitectura/`: pruebas de dependencias. Oriana.

Irina se encarga de Docker, los archivos Compose y
los escenarios de demostración.

### Regla de dependencia

Las dependencias deben apuntar hacia las capas internas:

- Domain no puede depender de Application,
  Infrastructure, API, Main ni de Node.js.
- Application puede utilizar Domain y sus propios
  componentes, pero no las capas externas.
- Infrastructure implementa los puertos definidos
  en Domain.
- Main conecta las implementaciones necesarias
  para ejecutar cada versión.

### Verificación automática

La regla se comprueba mediante:

`test/arquitectura/dependencias.test.ts`

Para ejecutar la prueba:

    npx tsx --test test/arquitectura/dependencias.test.ts

Se verificó que la prueba detecta importaciones
prohibidas. Al introducir temporalmente un import
de Express dentro de Domain, la prueba falló
correctamente.


## Contrato de los puertos

Los puertos son interfaces definidas por Lara en Domain.
Permiten que los casos de uso trabajen sin depender
directamente de las implementaciones técnicas.

### IReservaRepository

Permite guardar y consultar las reservas.

```ts
interface IReservaRepository {
  guardar(reserva: Reserva): Promise<void>;
  buscarPorId(id: string): Promise<Reserva | null>;
  listarPorCliente(clienteId: string): Promise<Reserva[]>;
}
```

### INotificador

Define cómo se entrega una notificación.

```ts
interface INotificador {
  notificar(notificacion: Notificacion): Promise<void>;
}
```

La notificación contiene:
- reservaId: identificador de la reserva.
- destinatario: cliente que recibe el aviso.
- tipo: RESERVA_CREADA o RESERVA_CANCELADA.
- mensaje: contenido de la notificación.

En la versión A se utiliza NotificadorEnMemoria.
En la versión B se utiliza NotificadorHttp.

Ambas implementaciones cumplen la misma interfaz.

Si la entrega falla, el notificador informa el error
mediante ErrorDeNotificacion.

### INotificacionPendienteRepository

Permite guardar y consultar las notificaciones
que no pudieron entregarse.

```ts
interface INotificacionPendienteRepository {
  guardar(p: NotificacionPendiente): Promise<void>;
  listarPendientes(): Promise<NotificacionPendiente[]>;
}
```

### Funcionamiento de las reservas y notificaciones

1. El cliente solicita la creación de una reserva.
2. El caso de uso valida los datos y guarda la reserva.
3. Se intenta enviar una notificación.
4. Si funciona, la notificación se muestra en consola.
5. Si falla, la reserva permanece guardada y
   se registra la notificación como pendiente.

Los repositorios son en memoria, por lo que los datos
no se conservan cuando se reinicia la aplicación.

Esta versión no incluye cancelación de reservas
ni reintentos automáticos de notificaciones.


## Composición de dependencias (`src/main`)

Lara se encarga de conectar los componentes del proyecto.


En la versión A, Reservas utiliza `NotificadorEnMemoria`
para mostrar las notificaciones dentro de la misma aplicación.

La composición de dependencias se realiza mediante:

```ts
const deps = await componer(leerConfig(process.env));
// deps: { reservas, pendientes, notificador, crearReserva, consultarReserva, listarPendientes }
```


En la versión B, Reservas utiliza `NotificadorHttp`
para comunicarse con el servicio independiente de Notificaciones.

La implementación se elige mediante `MODO_NOTIFICACIONES`,
sin modificar las reglas de negocio.

### Componentes y archivos

| Quién | Archivo | Clase / función | Constructor |
|---|---|---|---|
| Lara | `src/application/CrearReserva.ts` | `CrearReserva` | `(reservas, notificador, pendientes, regla, reloj)` |
| Lara | `src/application/ConsultarReserva.ts` | `ConsultarReserva` | `(reservas)` |
| Lara | `src/application/ListarPendientes.ts` | `ListarPendientes` | `(pendientes)` |
| Valentino | `src/infrastructure/ReservaRepositoryEnMemoria.ts` | `ReservaRepositoryEnMemoria` | `()` |
| Valentino | `src/infrastructure/NotificacionPendienteRepositoryEnMemoria.ts` | `NotificacionPendienteRepositoryEnMemoria` | `()` |
| Valentino | `src/api/app.ts` | `crearApp` | `({ crearReserva, consultarReserva, listarPendientes })` |
| Valentino | `src/main/server.ts` | Servidor de Reservas | `componer(leerConfig(process.env))` y escucha en `config.puerto` |
| Oriana | `src/infrastructure/NotificadorEnMemoria.ts` | `NotificadorEnMemoria` | `()` |
| Oriana | `src/notificaciones/server.ts` | Servicio de Notificaciones | `POST /notificaciones` en el puerto 3001 |
| Bianca | `src/infrastructure/NotificadorHttp.ts` | `NotificadorHttp` | `(urlBase, timeoutMs)` |
| Irina | Archivos Docker y Compose | Configuración de despliegues | Versiones A y B |

### Uso de los casos de uso (para la API)

- `crearReserva.ejecutar({ clienteId, origen, destino, tipoVehiculo, fechaHora })` devuelve `Promise<Reserva>` (CONFIRMADA).
  `fechaHora` es `Date`: la API convierte el string del body con `new Date(...)`. Si una regla no se cumple, rechaza con `ErrorDeDominio`.
- `consultarReserva.ejecutar(id)` devuelve `Promise<Reserva | null>` (`null` corresponde a 404).
- `listarPendientes.ejecutar()` devuelve `Promise<NotificacionPendiente[]>`.
- Para responder JSON se utilizan `reserva.aProps()` y `pendiente.aProps()`.
- El body de `POST /notificaciones` es un objeto `Notificacion` del dominio: `{ reservaId, destinatario, tipo, mensaje }`.

### Traducción sugerida de errores a HTTP (Valentino)

La API de Reservas debe traducir los errores del dominio
a los siguientes códigos HTTP:

| Error | Código HTTP |
|---|---|
| `DATOS_INVALIDOS` | 422 |
| `FECHA_PASADA` | 422 |
| `ANTICIPACION_INSUFICIENTE` | 422 |
| `ANTICIPACION_EXCEDIDA` | 422 |
| `MOTIVO_REQUERIDO` | 422 |
| `TRANSICION_INVALIDA` | 409 |
| Reserva inexistente | 404 |

### Comportamiento ante fallas

Si el servicio de Notificaciones no está disponible,
la reserva se guarda igualmente y la notificación
queda registrada como PENDIENTE.

No se implementan reintentos automáticos.

## Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `ANTICIPACION_MINIMA_MINUTOS` | 60 | Regla de anticipación |
| `ANTICIPACION_MAXIMA_DIAS` | 30 | Regla de anticipación |
| `MODO_NOTIFICACIONES` | `memoria` | `memoria` (versión A) o `http` (versión B) |
| `NOTIFICACIONES_URL` | — | URL del servicio en la versión B (obligatoria si es `http`) |
| `NOTIFICACIONES_TIMEOUT_MS` | 2000 | Timeout del cliente HTTP (versión B) |
| `PUERTO` | 3000 (Reservas) / 3001 (Notificaciones) | Puerto de cada servicio |
