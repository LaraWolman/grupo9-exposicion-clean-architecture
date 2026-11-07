import type { NotificacionPendiente } from '../NotificacionPendiente.js';

/**
 * Puerto de salida para guardar las notificaciones que no se pudieron entregar.
 * Implementación concreta: Persona 7 (en memoria o SQLite).
 * Lo usan: Persona 5 (guardar como PENDIENTE al fallar) y Persona 4 (reintento).
 */
export interface INotificacionPendienteRepository {
  /** Inserta o reemplaza (mismo id). Se usa al registrar la falla y al marcarla entregada. */
  guardar(pendiente: NotificacionPendiente): Promise<void>;

  /** Solo las que están en estado PENDIENTE, de la más vieja a la más nueva. */
  listarPendientes(): Promise<NotificacionPendiente[]>;
}
