/**
 * Composición de dependencias (composition root).
 *
 * Es el ÚNICO lugar del proyecto donde se eligen las implementaciones concretas
 * de cada puerto y se las "inyecta" en los casos de uso. Domain y Application
 * nunca hacen `new` de algo de Infrastructure: reciben los puertos ya armados.
 *
 * Pasar de la versión A a la B = cambiar MODO_NOTIFICACIONES de "memoria" a "http".
 * No se toca ningún archivo de Domain ni de Application.
 */
import { ReglaAnticipacion } from '../domain/index.js';
import type { INotificador, IReservaRepository, INotificacionPendienteRepository } from '../domain/index.js';

import { CrearReserva } from '../application/CrearReserva.js';                   // Persona 2
import { CancelarReserva } from '../application/CancelarReserva.js';             // Persona 2
import { ReintentarNotificaciones } from '../application/ReintentarNotificaciones.js'; // Persona 4

import { ReservaRepositoryEnMemoria } from '../infrastructure/ReservaRepositoryEnMemoria.js';   // Persona 3
import { NotificacionPendienteRepositoryEnMemoria } from '../infrastructure/NotificacionPendienteRepositoryEnMemoria.js'; // Persona 7
import { NotificadorEnMemoria } from '../infrastructure/NotificadorEnMemoria.js'; // Persona 4 (versión A)
import { NotificadorHttp } from '../infrastructure/NotificadorHttp.js';           // Persona 5 (versión B)

import type { Config } from './config.js';

export interface Dependencias {
  reservas: IReservaRepository;
  pendientes: INotificacionPendienteRepository;
  notificador: INotificador;
  crearReserva: CrearReserva;
  cancelarReserva: CancelarReserva;
  reintentarNotificaciones: ReintentarNotificaciones;
}

/** El punto de A contra B: la única decisión que cambia entre las dos versiones. */
function elegirNotificador(config: Config): INotificador {
  if (config.modoNotificaciones === 'http') {
    // Versión B: Notificaciones es otro contenedor y se le habla por HTTP.
    return new NotificadorHttp(config.notificacionesUrl!, config.notificacionesTimeoutMs);
  }
  // Versión A: Notificaciones es un módulo dentro del mismo proceso.
  return new NotificadorEnMemoria();
}

export function componer(config: Config): Dependencias {
  const reloj = () => new Date();
  const regla = new ReglaAnticipacion(config.anticipacionMinimaMinutos, config.anticipacionMaximaDias);

  // Adaptadores (Infrastructure) que implementan los puertos.
  const reservas: IReservaRepository = new ReservaRepositoryEnMemoria();
  const pendientes: INotificacionPendienteRepository = new NotificacionPendienteRepositoryEnMemoria();
  const notificador = elegirNotificador(config);

  // Casos de uso (Application): reciben los puertos, no saben qué implementación hay detrás.
  return {
    reservas,
    pendientes,
    notificador,
    crearReserva: new CrearReserva(reservas, notificador, pendientes, regla, reloj),
    cancelarReserva: new CancelarReserva(reservas, notificador, pendientes, reloj),
    reintentarNotificaciones: new ReintentarNotificaciones(notificador, pendientes, reloj),
  };
}
