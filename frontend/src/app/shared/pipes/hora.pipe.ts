import { Pipe, PipeTransform } from '@angular/core';

import { APP_LOCALE, APP_TIME_ZONE } from '@constants/app.constants';

const formatter = new Intl.DateTimeFormat(APP_LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: APP_TIME_ZONE,
});

/** Hora corta del negocio: "3:45 p. m.". */
@Pipe({ name: 'hora' })
export class HoraPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return value ? formatter.format(new Date(value)) : '';
  }
}
