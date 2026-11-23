import { Pipe, PipeTransform } from '@angular/core';

import { APP_CURRENCY, APP_LOCALE } from '@constants/app.constants';

const formatter = new Intl.NumberFormat(APP_LOCALE, {
  style: 'currency',
  currency: APP_CURRENCY,
  maximumFractionDigits: 0,
});

/** Pesos colombianos sin decimales: 7000 -> "$ 7.000". */
@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    return formatter.format(Number(value ?? 0));
  }
}
