import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { ApiError } from '@core/models/api-error.model';
import { APP_URLS } from '@routes/route-paths';
import { ChatLine, SimulatorOrderResponse } from '../../models/simulator.model';
import { SimulatorService } from '../../services/simulator.service';

const DEFAULT_PHONE = '573001234567';
const PHONE_PATTERN = /^\d{7,20}$/;

/** Prueba el flujo del cliente sin WhatsApp: chat simulado y atajo para crear un pedido. */
@Component({
  selector: 'app-simulator-page',
  templateUrl: './simulator-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorPageComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly simulator = inject(SimulatorService);

  protected readonly ordersUrl = APP_URLS.orders;

  protected readonly phone = this.fb.control(DEFAULT_PHONE, [Validators.required, Validators.pattern(PHONE_PATTERN)]);
  protected readonly chatForm = this.fb.group({ text: ['', [Validators.required]] });
  protected readonly orderForm = this.fb.group({ mesa: [1, [Validators.required, Validators.min(1)]] });

  protected readonly chat = signal<ChatLine[]>([]);
  protected readonly chatError = signal<string | null>(null);
  protected readonly sending = signal(false);

  protected readonly orderError = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly createdOrder = signal<SimulatorOrderResponse | null>(null);

  /** Caja de la conversación: tiene alto fijo y su propio scroll. */
  private readonly chatBox = viewChild<ElementRef<HTMLElement>>('chatBox');

  constructor() {
    // Cada mensaje nuevo baja el scroll interno hasta el final.
    effect(() => {
      this.chat();
      setTimeout(() => {
        const box = this.chatBox()?.nativeElement;
        if (box) box.scrollTop = box.scrollHeight;
      });
    });
  }

  protected phoneInvalid(): boolean {
    return this.phone.invalid && (this.phone.touched || this.phone.dirty);
  }

  protected send(): void {
    if (this.phone.invalid || this.chatForm.invalid) {
      this.phone.markAsTouched();
      this.chatForm.markAllAsTouched();
      return;
    }
    const text = this.chatForm.controls.text.value.trim();
    if (!text) return;
    this.sending.set(true);
    this.chatError.set(null);
    this.chat.update((lines) => [...lines, { from: 'cliente', text }]);
    this.chatForm.reset({ text: '' });
    this.simulator.sendMessage(this.phone.value, text).subscribe({
      next: ({ respuesta }) => {
        this.chat.update((lines) => [...lines, { from: 'bot', text: this.asText(respuesta) }]);
        this.sending.set(false);
      },
      error: (error: ApiError) => {
        this.chatError.set(error.message);
        this.sending.set(false);
      },
    });
  }

  protected clearChat(): void {
    this.chat.set([]);
    this.chatError.set(null);
  }

  protected createOrder(): void {
    if (this.phone.invalid || this.orderForm.invalid) {
      this.phone.markAsTouched();
      this.orderForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.orderError.set(null);
    this.createdOrder.set(null);
    this.simulator
      .createOrder({ telefono: this.phone.value, mesa: Number(this.orderForm.controls.mesa.value) })
      .subscribe({
        next: (order) => {
          this.createdOrder.set(order);
          this.creating.set(false);
        },
        error: (error: ApiError) => {
          this.orderError.set(error.message);
          this.creating.set(false);
        },
      });
  }

  /** El bot responde texto; si llegara otra cosa se muestra tal cual. */
  private asText(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }
}
