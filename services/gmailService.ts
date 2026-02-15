import { supabase } from "../utils/supabaseClient";
import { Lead, ServiceResponse } from "../types";
import { updateLeadInMemory } from "./memoryService";

// =======================================================
// CHECK GMAIL CONNECTION STATUS
// =======================================================

export const checkGmailStatus = async (): Promise<boolean> => {
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Gmail Session Error:", error);
      return false;
    }

    return !!session?.provider_token;
  } catch (err) {
    console.error("Gmail Status Check Failed:", err);
    return false;
  }
};

// =======================================================
// CONNECT GMAIL (OAUTH FLOW)
// =======================================================

export const connectGmail = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/gmail.send",
        redirectTo: window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    if (error) {
      console.error("Gmail OAuth Error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Gmail OAuth Failed:", err);
    return false;
  }
};

// =======================================================
// DISCONNECT GMAIL
// =======================================================

export const disconnectGmail = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Gmail Disconnect Failed:", err);
  }
};

// =======================================================
// SEND EMAIL
// =======================================================

export const sendEmail = async (
  lead: Lead,
  subject: string,
  body: string
): Promise<ServiceResponse<{ messageId: string; threadId: string }>> => {
  try {
    if (!lead.email) {
      return {
        status: "error",
        error: {
          code: "INVALID_LEAD",
          message: "Lead email address missing."
        }
      };
    }

    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session?.provider_token) {
      return {
        status: "error",
        error: {
          code: "AUTH_ERROR",
          message: "Gmail session expired. Please reconnect in Settings."
        }
      };
    }

    const token = session.provider_token;

    // RFC 2822 Email Formatting
    const utf8Subject = `=?utf-8?B?${btoa(
      new TextEncoder().encode(subject).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    )}?=`;

    const messageParts = [
      `To: ${lead.email}`,
      `Subject: ${utf8Subject}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      body
    ];

    const message = messageParts.join("\n");

    // Base64URL Encoding
    const encodedMessage = btoa(
      new TextEncoder().encode(message).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: encodedMessage })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || "Failed to send email via Gmail API"
      );
    }

    // Update Local State
    const updatedLead: Lead = {
      ...lead,
      status: "Email Sent",
      lastContacted: new Date().toISOString(),
      emailThreadId: data.threadId,
      lastEmailSentAt: new Date().toISOString()
    };

    updateLeadInMemory(updatedLead);

    return {
      status: "success",
      data: {
        messageId: data.id,
        threadId: data.threadId
      }
    };

  } catch (e: any) {
    console.error("Gmail Send Error:", e);

    return {
      status: "error",
      error: {
        code: "API_ERROR",
        message: e.message || "Unknown Gmail API error"
      }
    };
  }
};

// =======================================================
// CHECK REPLIES (PLACEHOLDER SAFE)
// =======================================================

export const checkReplies = async (
  leads: Lead[]
): Promise<Lead[]> => {
  // Requires gmail.readonly scope and thread polling.
  // Safe placeholder to avoid breaking flow.

  return leads;
};
