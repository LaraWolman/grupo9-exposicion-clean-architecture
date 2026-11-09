# Guion de los cinco escenarios

**Grupo 9 — Desarrollo de Software**  
**Persona 8 — Demostración**

## Escenario 1 — Crear una reserva en la versión A

En este caso vamos a mostrar cómo funciona la reserva en el monolito modular. Reservas y Notificaciones forman parte de una misma aplicación, por lo que el aviso se registra en memoria, sin llamar a otro servicio por HTTP.

1. Iniciar la versión A de la aplicación.
2. Enviar una solicitud para crear una reserva.
3. Revisar la respuesta y consultar la reserva para comprobar que quedó guardada.
4. Verificar que también se registró la notificación en memoria.

**Para mostrar:** la reserva creada y el registro de la notificación dentro de la aplicación.

## Escenario 2 — Crear una reserva en la versión B

Acá vamos a repetir la creación de una reserva, pero usando microservicios. Reservas y Notificaciones funcionan por separado y se comunican mediante HTTP.

1. Iniciar los dos contenedores: uno para Reservas y otro para Notificaciones.
2. Comprobar que ambos servicios estén funcionando.
3. Crear una reserva desde la API de Reservas.
4. Verificar que la reserva se guardó y que Notificaciones recibió el aviso enviado por HTTP.

**Para mostrar:** los dos servicios en ejecución, la reserva creada y el registro del aviso recibido por Notificaciones.

## Escenario 3 — Crear una reserva con Notificaciones detenido

En este escenario vamos a provocar una falla para comprobar que el servicio de Reservas puede seguir funcionando aunque Notificaciones no esté disponible.

1. Mantener Reservas funcionando y detener el servicio de Notificaciones.
2. Intentar crear una nueva reserva.
3. Comprobar que la reserva se guarda igualmente.
4. Revisar que el aviso que no pudo enviarse quede registrado como `PENDIENTE`.

**Para mostrar:** el servicio de Notificaciones detenido, la reserva creada y la notificación pendiente.

## Escenario 4 — Recuperar las notificaciones pendientes

Después de la falla anterior, vamos a mostrar qué ocurre cuando Notificaciones vuelve a estar disponible y se reintenta enviar el aviso que había quedado pendiente.

1. Volver a iniciar el servicio de Notificaciones.
2. Ejecutar el reintento de las notificaciones pendientes.
3. Comprobar que se envía el aviso que quedó pendiente en el escenario 3.
4. Verificar que el registro se actualiza y que la notificación figura como entregada.

**Para mostrar:** el reintento y el cambio de estado de la notificación pendiente a entregada.

## Escenario 5 — Ejecutar las pruebas

Por último, vamos a mostrar las pruebas automatizadas para comprobar el comportamiento del programa sin tener que repetir toda la demostración manualmente.

1. Ejecutar las pruebas unitarias del proyecto.
2. Ejecutar la prueba de integración de la API de Reservas en las versiones A y B.
3. Revisar que la prueba compruebe la creación de la reserva y el registro de la notificación.
4. Mostrar también la comprobación del caso en que Notificaciones está detenido: la reserva se crea y el aviso queda `PENDIENTE`.
5. Mostrar el resultado de la ejecución de las pruebas.

**Para mostrar:** la salida de las pruebas y una explicación breve de qué comprueba cada una. Las unitarias verifican partes del programa por separado; la de integración comprueba cómo funcionan juntas las partes involucradas.
