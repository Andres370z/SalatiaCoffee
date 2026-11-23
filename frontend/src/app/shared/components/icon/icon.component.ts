import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'bell'
  | 'flame'
  | 'check'
  | 'bag'
  | 'x'
  | 'plus'
  | 'pencil'
  | 'alert'
  | 'logout'
  | 'refresh'
  | 'list'
  | 'cup';

/** Trazos de 24x24 (estilo línea, 2 px). Se pintan con el color del texto. */
const PATHS: Record<IconName, string> = {
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-8Z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  bag: 'M5 8h14l-1 12H6L5 8ZM9 8V6a3 3 0 0 1 6 0v2',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  pencil: 'M4 20l4-1 11-11-3-3L5 16l-1 4ZM14 6l3 3',
  alert: 'M12 4l9 16H3L12 4ZM12 10v4M12 17.5v.01',
  logout: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9',
  refresh: 'M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  cup: 'M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8ZM16 10h2a2 2 0 0 1 0 5h-2M8 3v2M12 3v2',
};

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  protected readonly path = computed(() => PATHS[this.name()]);
}
