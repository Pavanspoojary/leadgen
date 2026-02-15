import { supabase } from '../utils/supabaseClient';
import { Lead, ServiceResponse } from '../types';
import { updateLeadInMemory } from './memoryService';

export const checkGmailStatus = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  // Check if we have a provider token. Note: This token is valid for 1 hour.
  // For a robust app, we'd handle refresh tokens backend-side, but for this private SaaS, 
  // re-connecting or using the active session token is the approach.
  return !!session?.provider_token;
};

export const connectGmail = async (): Promise<boolean> => {
  // Initiates the OAuth flow. The page will redirect.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/gmail.send',
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error("Gmail Auth Error:", error);
    return false;
  }
  
  return true;
};

export const disconnectGmail = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const sendEmail = async (lead: Lead, subject: string, body: string): Promise<ServiceResponse<{ messageId: string, threadId: string }>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.provider_token;

  if (!token) {
    return { 
        status: 'error', 
        error: { code: 'AUTH_ERROR', message: 'Gmail session expired. Please reconnect in Settings.' } 
    };
  }

  // RFC 2822 formatting
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${lead.email}`,
    `Subject: ${utf8Subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    body
  ];
  const message = messageParts.join("\n");

  // Base64URL encode
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send email via Gmail API');
    }

    // Update local state
    const updatedLead: Lead = {
        ...lead,
        status: 'Email Sent',
        lastContacted: new Date().toISOString(),
        emailThreadId: data.threadId,
        lastEmailSentAt: new Date().toISOString()
    };
    updateLeadInMemory(updatedLead);

    return {
      status: 'success',
      data: {
        messageId: data.id,
        threadId: data.threadId
      }
    };

  } catch (e: any) {
    return {
      status: 'error',
      error: {
        code: 'API_ERROR',
        message: e.message
      }
    };
  }
};

export const checkReplies = async (leads: Lead[]): Promise<Lead[]> => {
    // Logic to check replies requires 'gmail.readonly' scope and listing messages by threadId.
    // Keeping mock behavior for now to focus on Sending fix, or returning input if not implemented.
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(leads);
        }, 1000);
    });
};