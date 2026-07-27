# 11 — Account and security

**Requires a signed-in account.**

This chapter covers Account Settings — the only settings page in the Atlas. It holds your profile,
your password, your request allowance, your API keys, a log of recent activity on your account, and a
card for replaying the guided tour.

Reach it from the account menu in the top-right corner: click your name, then **Account Settings**.

## Profile

The profile card shows your details and an **Edit** button that turns them into a form.

| Field | Editable? |
|---|---|
| **First name**, **Last name** | Yes. |
| **Organisation**, **Job Title**, **Country** | Yes. |
| **Email Address** | **No.** Your email identifies your account and cannot be changed here. The page says so explicitly. |
| **Member Since** | No — it is a fact, not a setting. |

**Save changes** applies your edits and confirms with a short *Profile updated* message. **Cancel**
discards them.

A badge shows your role — **Administrator** or **Registered User**. It is set by an administrator,
not by you. If you need a different role, ask one.

## Changing your password

The **Security** section explains that this changes the password you use to sign in, with a **Change
password** button that opens the form.

You are asked for your current password and a new one. As you type the new password, the same live
rule checklist you saw at sign-up appears, ticking each rule off as you satisfy it — typically a
minimum length plus a mix of character types. The rules come from the server, so what the checklist
accepts is exactly what will be accepted. A short *Password updated* confirmation appears when it is
done.

If you were required to change your password on first sign-in, that is a different, non-dismissible
dialog and is covered in chapter 01.

## Request limits

The **API Rate Limit** card shows how many requests per hour your account is allowed, and what the
default for your role is. It exists because programmatic access has to be metered — it does not
affect normal browsing.

If the allowance is not enough, **Request Increase** opens a short form: the quota you want (up to a
stated maximum) and a **Justification** of at least a few sentences explaining why. Submitting it
puts the request in front of an administrator; while it is waiting, the card shows an *Increase
request pending* marker.

**Request history** lists your past requests with their current, requested and submitted values, and
their outcome — **Pending**, **Approved**, **Adjusted** or **Declined**. *Adjusted* means an
administrator approved a different number from the one you asked for; the approved figure is the one
that applies.

Two variations you may see. Administrators hold the administrator quota and review other people's
requests rather than submitting their own, so the card shows a note to that effect and a link to the
review queue instead of a request form. And if rate limiting is switched off for this deployment
entirely, the card carries an **Off** badge and explains that no limit is being enforced.

## API keys

API keys let a script or an integration read Atlas data without a browser session.

- **Generate Key** asks for a name — something that tells you later where the key is used, like
  `prod-pipeline` or `dev` — and creates it.
- The full key is shown **once**, immediately after generation, with a **Copy** button and the
  explicit warning that this is the only time you will see it. Copy it into wherever it is going
  before you dismiss the dialog. There is no way to retrieve it afterwards; if you lose it, revoke
  the key and generate a new one.
- The table lists your keys by **Name / Key**, **Created**, **Last Used** and **Status**, with a
  **Revoke** action. Revoking is immediate and permanent — the key stops working and is marked
  **Revoked**.
- You may hold a maximum of **three active keys**. At the limit, the generate control explains that
  you must revoke one before creating another.

The whole section can appear with a **Not required** badge. That means this deployment serves data
publicly and does not need a key at all — nothing is broken and there is nothing you need to do.

## Recent activity

A log of what has happened on your account: sign-ins, password changes, profile edits, key
generation and revocation, and similar events.

Each row shows the **Activity**, its **Status**, the **IP address** it came from and **When** it
happened. The **All activity** dropdown filters to a single kind of event, and the table pages
through history with **Previous** and **Next**.

It is worth a glance occasionally. A sign-in you do not recognise, from an address you do not
recognise, is the earliest signal that something is wrong — change your password and revoke your API
keys if you see one.

## Product tour

The last card on the page is **Product tour**, with a **Replay the tour** button. It restarts the
guided tour described in chapter 01, from step one, taking you back to the Dashboard first.

This is the second of the two ways to restart the tour; the other is the **?** button in the top bar,
which is available on every page and to guests as well.

---

Next: [12 — Sync status](12-sync-status.md) · Back to [index](README.md)
