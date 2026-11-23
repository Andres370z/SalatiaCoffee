import { DestroyRef, Injectable, signal } from '@angular/core';

/**
 * Buscador de la barra superior. Cada pantalla que sabe filtrar lo activa con `enable()`;
 * mientras ninguna lo active, la barra no muestra el campo.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  /** Texto escrito en el buscador. */
  readonly term = signal('');
  /** Texto de ayuda del campo; `null` = el buscador está oculto. */
  readonly placeholder = signal<string | null>(null);

  /** Activa el buscador y lo apaga solo cuando se destruye el componente que lo pidió. */
  enableFor(destroyRef: DestroyRef, placeholder: string): void {
    this.term.set('');
    this.placeholder.set(placeholder);
    destroyRef.onDestroy(() => {
      this.placeholder.set(null);
      this.term.set('');
    });
  }
}

/** Texto en minúsculas y sin tildes, para comparar sin que importen mayúsculas ni acentos. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
