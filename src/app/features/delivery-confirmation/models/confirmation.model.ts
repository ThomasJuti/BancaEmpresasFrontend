export type DeliveryEmailStatus =
  | 'scheduled'
  | 'sent'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'retry_scheduled'
  | 'failed';

/** Datos que devuelve GET /confirmations/:token para renderizar la página. */
export interface ConfirmationView {
  cardHolderName: string;
  cardLastFour: string;
  companyId: string;
  status: DeliveryEmailStatus;
}

export type DeliveryOutcome =
  | 'delivered_to_holder'
  | 'not_arrived'
  | 'holder_absent'
  | 'return_to_bank';

/** Resultado de POST /confirm. */
export interface ConfirmResult {
  status: 'confirmed' | 'retry_scheduled';
  nextEmailAt?: string;
}
