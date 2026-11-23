import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Mensaje de error o aviso. Siempre lleva icono y texto, nunca solo color. */
@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
  readonly tone = input<'error' | 'info'>('error');
}
