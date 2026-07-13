import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SALES_CALLS_API } from '../config/api.config';
import { SalesCallsService } from './sales-calls.service';

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
});

describe('SalesCallsService', () => {
  let service: SalesCallsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SalesCallsService],
    });
    service = TestBed.inject(SalesCallsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('initiates call', () => {
    service.initiateCall({ phoneNumber: '+573001234567' }).subscribe((res) => {
      expect(res.id).toBe('c1');
    });
    const req = http.expectOne(`${SALES_CALLS_API}/calls`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'c1', status: 'queued', phoneNumber: '+573001234567' });
  });

  it('creates batch', () => {
    service.createBatch({ name: 'batch', leads: [] }).subscribe((res) => {
      expect(res.id).toBe('b1');
    });
    http.expectOne(`${SALES_CALLS_API}/batches`).flush({ id: 'b1', name: 'batch', status: 'queued' });
  });

  it('lists and gets calls', () => {
    service.listCalls().subscribe((calls) => expect(calls.length).toBe(1));
    http.expectOne(`${SALES_CALLS_API}/calls`).flush([{ id: 'c1' }]);

    service.getCall('c1').subscribe((call) => expect(call.id).toBe('c1'));
    http.expectOne(`${SALES_CALLS_API}/calls/c1`).flush({ id: 'c1' });
  });

  it('registers manual call and builds recording URL', () => {
    service
      .registerManual({
        customerName: 'Ana',
        variables: { empresa: 'ACME', nit: '900' },
        identidadVerificada: true,
        clienteInteresado: true,
      })
      .subscribe();
    http.expectOne(`${SALES_CALLS_API}/calls/manual`).flush({ id: 'm1' });
    expect(service.recordingUrl('m1')).toBe(`${SALES_CALLS_API}/calls/m1/recording`);
  });
});
