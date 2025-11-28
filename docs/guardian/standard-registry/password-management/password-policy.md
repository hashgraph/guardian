---
icon: building-shield
---

# Password Policy

## Step By Step Process

1. The variables **PASSWORD\_COMPLEXITY** and **MIN\_PASSWORD\_LENGTH** can be added to the auth-service configuration (.env). This is either the `./<service_name>/configs/.env.<service_name>.<GUARDIAN_ENV>` file,

or

if you’re using Building from Pre-build containers ([https://docs.hedera.com/guardian/guardian/readme/getting-started/installation/building-from-pre-build-containers](https://docs.hedera.com/guardian/guardian/readme/getting-started/installation/building-from-pre-build-containers)) - the corresponding file is used for the auth-service.

<figure><img src="../../../.gitbook/assets/image (4) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note: These variables are not mandatory, if they’re not present, default values will be used.
{% endhint %}

Variables:

* **MIN\_PASSWORD\_LENGTH** sets the required minimum password length. If it’s not specified, a default value of 8 will be used. The minimum allowable value for this variable is 1.
* **PASSWORD\_COMPLEXITY** sets the password complexity level. If PASSWORD\_COMPLEXITY isn’t set, medium will be used by default.. Available values are:
  * easy: no rules
  * medium: at least one uppercase letter, one lowercase letter, and one number
  * hard: at least one uppercase letter, one lowercase letter, one number, and one special character

{% hint style="info" %}
**Note:**

Existing users whose passwords don’t comply with the new password policy will see a notification asking them to change their password each time they log in.
{% endhint %}

<figure><img src="../../../.gitbook/assets/image (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:**

When changing a password or creating a new user, if the password doesn’t meet the policy requirements, the backend will return a 422 error and the frontend will display a notification stating that the password does not comply with the password policy.
{% endhint %}

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>
