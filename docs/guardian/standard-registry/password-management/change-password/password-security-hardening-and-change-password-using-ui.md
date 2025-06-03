---
icon: computer
---

# Password Security Hardening and Change Password using UI

## 1. Password Security Hardening

Changed encryption algorithm to pbkdf2 with the following parameters:

`Digest: sha512`

`Iterations: 600 000`

## 2. User passwords upgrade path

Following Guardian instance upgrade, at the first login existing users are prompted to change the password which would be encrypted using the new method.

<figure><img src="../../../../.gitbook/assets/image (687).png" alt=""><figcaption></figcaption></figure>

## 3. Change user password

Users can change passwords using  the new option in their profile page.

<figure><img src="../../../../.gitbook/assets/image (688).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (689).png" alt=""><figcaption></figcaption></figure>
