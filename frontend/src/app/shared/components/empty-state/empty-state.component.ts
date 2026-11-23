import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconName } from '../icon/icon.component';

/** Estado vacío: dice qué pasa y, si hace falta, qué hacer (contenido proyectado). */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly icon = input<IconName>('cup');
}
