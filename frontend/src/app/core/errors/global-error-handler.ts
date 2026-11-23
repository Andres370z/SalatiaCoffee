import { ErrorHandler, Injectable } from '@angular/core';

/** Punto único para errores no controlados. Aquí se conectará un registro de errores si se necesita. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error('Error no controlado:', error);
  }
}
