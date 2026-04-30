declare module '@sendgrid/mail' {
  interface MailPayload {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
  }

  interface SendgridMailModule {
    setApiKey: (apiKey: string) => void;
    send: (payload: MailPayload) => Promise<unknown>;
  }

  const sendgridMail: SendgridMailModule;

  export default sendgridMail;
}
