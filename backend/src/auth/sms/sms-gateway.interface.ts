export const SMS_GATEWAY = Symbol('SMS_GATEWAY');

export interface SendSmsOptions {
  phone: string;
  message: string;
}

export interface SmsGateway {
  send(options: SendSmsOptions): Promise<void>;
}
