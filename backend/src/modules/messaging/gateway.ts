/**
 * Channel gateway abstraction (ADR-0006, NFR-31).
 *
 * Core code depends only on this interface, so the concrete aggregator adapter
 * (e.g. Africa's Talking / a telecom short code) is swappable and the arrangement
 * (Q5) can change without touching business logic. A real HTTP adapter is a
 * later slice; the fake and log gateways cover tests and the no-aggregator case.
 */

export interface OutboundSms {
  to: string;
  body: string;
}

export interface MessageGateway {
  sendSms(message: OutboundSms): Promise<void>;
}

/** Records messages instead of sending — for tests and local dev. */
export class FakeGateway implements MessageGateway {
  readonly sent: OutboundSms[] = [];
  async sendSms(message: OutboundSms): Promise<void> {
    this.sent.push(message);
  }
}

/**
 * Default when no aggregator is configured (Q5): logs intent and no-ops, so the
 * system runs end-to-end without a live SMS provider. Never throws.
 */
export class LogGateway implements MessageGateway {
  constructor(private readonly log: (msg: string) => void = () => {}) {}
  async sendSms(message: OutboundSms): Promise<void> {
    // Never log the message body/number in clear in production (NFR-10); this is
    // a dev stand-in only.
    this.log(`[LogGateway] would send SMS (${message.body.length} chars)`);
  }
}
