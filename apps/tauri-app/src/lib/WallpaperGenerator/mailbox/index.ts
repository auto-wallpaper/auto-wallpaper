import { Body } from "@tauri-apps/api/http";
import type { MailboxResponse, MessagesResponse } from "./types";
import fetchCookie from "~/utils/fetchCookie";

export const makeMailbox = async () => {
  const fetch = fetchCookie({
    timeout: 30,
    throwOnFail: true
  });

  const resp = await fetch<MailboxResponse>(
    "https://api.internal.temp-mail.io/api/v3/email/new",
    {
      method: "POST",
      body: Body.json({
        max_name_length: 10,
        min_name_length: 10,
      })
    },
  );

  const { email } = resp.data;

  return {
    email,
    checkMessages: async () => {
      const resp = await fetch<MessagesResponse>(
        `https://api.internal.temp-mail.io/api/v3/email/${email}/messages`,
        {
          method: "GET",
        },
      );

      return resp.data;
    },
  };
};
