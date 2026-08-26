import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export interface InitializePaymentParams {
  email: string;
  amount: number; // In Naira (e.g. 185000)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
  channels?: string[];
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
  provider: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED';
  amount: number; // in Naira
  currency: string;
  reference: string;
  providerReference: string;
  paidAt?: string;
  channel?: string;
  cardType?: string;
  last4?: string;
  bankName?: string;
  gatewayResponse?: string;
  rawResponse?: any;
}

export interface RefundParams {
  transactionReference: string;
  amount?: number; // In Naira
  merchantNote?: string;
}

export interface RefundResult {
  success: boolean;
  refundReference: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  message?: string;
}

export interface PaymentGatewayProvider {
  name: string;
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean;
  processRefund(params: RefundParams): Promise<RefundResult>;
}

// --------------------------------------------------------------------------
// 1. Paystack Adapter (Standard Nigerian Gateway)
// --------------------------------------------------------------------------
export class PaystackAdapter implements PaymentGatewayProvider {
  name = 'PAYSTACK';
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured in environment variables');
    }

    // Paystack amounts are in kobo (1 NGN = 100 kobo)
    const amountInKobo = Math.round(params.amount * 100);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: params.email,
        amount: amountInKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
        channels: params.channels || ['card', 'bank', 'ussd', 'bank_transfer']
      })
    });

    const data = await response.json() as any;
    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize Paystack transaction');
    }

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
      provider: 'PAYSTACK'
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured in environment variables');
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json() as any;
    if (!data.status) {
      return {
        success: false,
        status: 'FAILED',
        amount: 0,
        currency: 'NGN',
        reference,
        providerReference: '',
        gatewayResponse: data.message
      };
    }

    const tx = data.data;
    const isSuccess = tx.status === 'success';

    return {
      success: isSuccess,
      status: isSuccess ? 'SUCCESS' : tx.status === 'abandoned' ? 'ABANDONED' : 'FAILED',
      amount: tx.amount / 100, // convert kobo back to NGN
      currency: tx.currency || 'NGN',
      reference: tx.reference,
      providerReference: String(tx.id),
      paidAt: tx.paid_at || new Date().toISOString(),
      channel: tx.channel,
      cardType: tx.authorization?.card_type,
      last4: tx.authorization?.last4,
      bankName: tx.authorization?.bank,
      gatewayResponse: tx.gateway_response,
      rawResponse: tx
    };
  }

  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || this.secretKey;
    if (!secret || !signature) return false;

    const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return hash === signature;
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured');
    }

    const body: any = { transaction: params.transactionReference };
    if (params.amount) {
      body.amount = Math.round(params.amount * 100);
    }
    if (params.merchantNote) {
      body.merchant_note = params.merchantNote;
    }

    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as any;
    if (!data.status) {
      return {
        success: false,
        refundReference: '',
        status: 'FAILED',
        amount: params.amount || 0,
        message: data.message
      };
    }

    return {
      success: true,
      refundReference: String(data.data.id),
      status: 'SUCCESS',
      amount: (data.data.amount || 0) / 100,
      message: data.message
    };
  }
}

// --------------------------------------------------------------------------
// 2. Flutterwave Adapter
// --------------------------------------------------------------------------
export class FlutterwaveAdapter implements PaymentGatewayProvider {
  name = 'FLUTTERWAVE';
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    if (!this.secretKey) {
      throw new Error('Flutterwave secret key is not configured in environment variables');
    }

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amount,
        currency: 'NGN',
        redirect_url: params.callbackUrl,
        customer: {
          email: params.email
        },
        meta: params.metadata,
        customizations: {
          title: 'Hostel Ease LAUTECH',
          description: 'Student Accommodation Reservation Fee'
        }
      })
    });

    const data = await response.json() as any;
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to initialize Flutterwave transaction');
    }

    return {
      authorizationUrl: data.data.link,
      reference: params.reference,
      provider: 'FLUTTERWAVE'
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    if (!this.secretKey) {
      throw new Error('Flutterwave secret key is not configured in environment variables');
    }

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json() as any;
    if (data.status !== 'success') {
      return {
        success: false,
        status: 'FAILED',
        amount: 0,
        currency: 'NGN',
        reference,
        providerReference: '',
        gatewayResponse: data.message
      };
    }

    const tx = data.data;
    const isSuccess = tx.status === 'successful';

    return {
      success: isSuccess,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      amount: tx.amount,
      currency: tx.currency || 'NGN',
      reference: tx.tx_ref,
      providerReference: String(tx.id),
      paidAt: tx.created_at || new Date().toISOString(),
      channel: tx.payment_type,
      cardType: tx.card?.type,
      last4: tx.card?.last_4digits,
      gatewayResponse: tx.processor_response,
      rawResponse: tx
    };
  }

  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLUTTERWAVE_SECRET_HASH;
    if (!secretHash || !signature) return false;
    return signature === secretHash;
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    if (!this.secretKey) {
      throw new Error('Flutterwave secret key is not configured');
    }

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${params.transactionReference}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: params.amount,
        comments: params.merchantNote
      })
    });

    const data = await response.json() as any;
    if (data.status !== 'success') {
      return {
        success: false,
        refundReference: '',
        status: 'FAILED',
        amount: params.amount || 0,
        message: data.message
      };
    }

    return {
      success: true,
      refundReference: String(data.data.id),
      status: 'SUCCESS',
      amount: data.data.amount || params.amount || 0,
      message: data.message
    };
  }
}

// --------------------------------------------------------------------------
// 3. Test / Mock Gateway Adapter (Zero configuration required for dev/testing)
// --------------------------------------------------------------------------
export class TestGatewayAdapter implements PaymentGatewayProvider {
  name = 'TEST_GATEWAY';

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const mockAuthUrl = `/checkout/mock?reference=${encodeURIComponent(params.reference)}&amount=${params.amount}&email=${encodeURIComponent(params.email)}`;
    return {
      authorizationUrl: mockAuthUrl,
      accessCode: `ACC_${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      reference: params.reference,
      provider: 'TEST_GATEWAY'
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    // In test mode, references starting with 'FAIL_' simulate failure, otherwise success
    const isFail = reference.startsWith('FAIL_');

    return {
      success: !isFail,
      status: isFail ? 'FAILED' : 'SUCCESS',
      amount: 0, // Server will verify against DB booking total
      currency: 'NGN',
      reference,
      providerReference: `TX_MOCK_${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      paidAt: new Date().toISOString(),
      channel: 'CARD',
      cardType: 'VERVE',
      last4: '4123',
      bankName: 'Access Bank Nigeria',
      gatewayResponse: isFail ? 'Insufficient funds' : 'Approved by Issuer'
    };
  }

  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    // For test gateway, verify matching header or test key
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'hostel_ease_test_secret';
    if (!signature) return false;
    const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return hash === signature || signature === 'test_valid_signature';
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    return {
      success: true,
      refundReference: `REF_MOCK_${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      status: 'SUCCESS',
      amount: params.amount || 0,
      message: 'Test refund processed successfully'
    };
  }
}

// --------------------------------------------------------------------------
// Gateway Factory Resolver
// --------------------------------------------------------------------------
export function getPaymentGateway(preferredProvider?: string): PaymentGatewayProvider {
  const provider = (preferredProvider || process.env.PAYMENT_PROVIDER || 'TEST_GATEWAY').toUpperCase();

  if (provider === 'PAYSTACK' && process.env.PAYSTACK_SECRET_KEY) {
    return new PaystackAdapter();
  }

  if (provider === 'FLUTTERWAVE' && process.env.FLUTTERWAVE_SECRET_KEY) {
    return new FlutterwaveAdapter();
  }

  // Fallback to robust Test Gateway for seamless developer testing and zero external friction
  return new TestGatewayAdapter();
}
