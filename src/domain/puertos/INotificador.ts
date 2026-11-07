/**
 * Puerto de salida hacia el módulo M8 Notificaciones.
 *
 * Es el punto que permite pasar de la versión A a la B sin tocar Domain ni Application:
 *   - Versión A: implementación en memoria, dentro del mismo proceso (Persona 4).
 *   - Versión B: cliente HTTP hacia el contenedor de Notificaciones (Persona 5).
 * Cuál se usa lo decide únicamente la composición de dependencias (src/main).
 */
export type TipoNotificacion = 'RESERVA_CREADA' | 'RESERVA_CANCELADA';

export interface Notificacion {
  reservaId: string;
  /** A quién se avisa; en el ejercicio, el clienteId. */
  destinatario: string;
  tipo: TipoNotificacion;
  mensaje: string;
}

export interface INotificador {
  /**
   * Entrega la notificación.
   * Si no se pudo entregar (servicio caído, timeout, respuesta con error),
   * la promesa se rechaza con un `ErrorDeNotificacion`. Nunca deja la
   * falla en silencio: quien llama decide qué hacer (guardarla como PENDIENTE).
   */
  notificar(notificacion: Notificacion): Promise<void>;
}

export class ErrorDeNotificacion extends Error {
  constructor(mensaje: string, options?: { cause?: unknown }) {
    super(mensaje, options);
    this.name = 'ErrorDeNotificacion';
  }
}
