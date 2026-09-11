# Google sign-in rollout

Google is the selected identity provider. The initial administrator email was supplied privately and is intentionally omitted from this public repository.

The current deployment is still a shared demo. The Google provider was verified disabled on September 11, 2026. Do not present the demo role selector as individual authentication or invite the full staff yet.

## Required configuration

1. In the organization's Google Cloud project, configure the OAuth consent screen and a Web application OAuth client. Confirm whether the audience must include the initial administrator's personal Google account as well as staff Workspace accounts.
2. Use `https://zqrotlehxgeztrukddck.supabase.co/auth/v1/callback` as the authorized redirect URI. Enter the client ID and secret only in Supabase's Google provider settings; never commit the secret or put it in a Vite environment variable.
3. Configure the production redirect URL for the app's current canonical domain, `https://websiteplaygroundsandbox.com`, and any authorized preview URLs separately.
4. Implement and verify the login/callback/logout screens and account-to-person mapping before switching the live app away from the demo gate. Do not grant access solely because Google authenticated an email address. Maintain an explicit active staff allowlist, with the first administrator assigned out of band.
5. Replace shared-demo policies across data, storage, and RPCs with server-enforced access. Bind each action's actor to the authenticated person; protect role changes, timeline ownership, and approvals. Remove role switching from normal sessions.
6. Test administrator, contributor, viewer, unlisted Google account, revoked account, and expired session. Verify that opening a shared deep link returns to its exact file or conversation after sign-in.
7. Only then enable the live sign-in gate and invite a small pilot group. Email notification delivery also needs an approved sender/service configuration, quiet-hour scheduling, unsubscribe/preferences behavior, and delivery checks. Browser alerts in this UX pass work only while the app is open; they are not background mobile push or an email digest.

References: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
