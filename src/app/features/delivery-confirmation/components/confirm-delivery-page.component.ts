import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DeliveryConfirmationService } from '../services/delivery-confirmation.service';
import { ConfirmationView, DeliveryOutcome } from '../models/confirmation.model';

type ViewState =
  | 'loading'
  | 'ready'
  | 'invalid'
  | 'already'
  | 'submitting'
  | 'confirmed'
  | 'retry'
  | 'error';

@Component({
  selector: 'app-confirm-delivery-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-delivery-page.component.html',
  styleUrls: ['./confirm-delivery-page.component.css'],
})
export class ConfirmDeliveryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(DeliveryConfirmationService);

  readonly state = signal<ViewState>('loading');
  readonly view = signal<ConfirmationView | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.state.set('invalid');
      return;
    }

    this.service.getByToken(this.token).subscribe({
      next: (view) => {
        this.view.set(view);
        this.state.set(view.status === 'confirmed' ? 'already' : 'ready');
      },
      error: () => this.state.set('invalid'),
    });
  }

  confirm(outcome: DeliveryOutcome): void {
    this.state.set('submitting');
    this.errorMessage.set(null);
    this.service.confirm(this.token, outcome).subscribe({
      next: (result) => this.state.set(result.status === 'confirmed' ? 'confirmed' : 'retry'),
      error: (err) => {
        this.errorMessage.set(
          err?.error?.error?.code === 'TOKEN_ALREADY_USED'
            ? 'Este enlace ya fue utilizado.'
            : 'No se pudo registrar la confirmación. El enlace puede haber vencido.',
        );
        this.state.set('error');
      },
    });
  }
}
