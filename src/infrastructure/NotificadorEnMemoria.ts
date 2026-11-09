
import type {
  INotificador,
  Notificacion
} from '../domain/index.js';

export class NotificadorEnMemoria implements INotificador {

  async notificar(notificacion: Notificacion): Promise<void> {

    console.log('=== NOTIFICACIÓN ===');
    console.log('Reserva:', notificacion.reservaId);
    console.log('Destinatario:', notificacion.destinatario);
    console.log('Tipo:', notificacion.tipo);
    console.log('Mensaje:', notificacion.mensaje);
    console.log('====================');

  }

}
