export type MailboxResponse = {
  email: string;
  token: string;
};

export type MessagesResponse = {
  id: string,
  from: string,
  to: string,
  cc: string | null,
  subject: string,
  body_text: string,
  body_html: string,
  created_at: string,
  attachments: unknown[]
}[]
