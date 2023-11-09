# Deploying Guardian using a specific Environment (QA)

The following steps will describe on how to deploy Guardian using the default Environment (QA):

**Step 1:**

Create the .env file

Set the GUARDIAN\_ENV="qa" in the .env file ( Refer .env.template as example)

<pre><code><strong>GUARDIAN_ENV="qa"
</strong></code></pre>

<figure><img src="https://lh5.googleusercontent.com/2QtngdvCtgOpN5xA5_DxhksChaFLO_DfRTS5HBbVZ6Bt8TyTNsMVsOHtzM2sCJuObErG41E0qmM15V_w82ntkkcFlHC2rD8b8eZ0LSSkEYVrFWDmYllF4LVsjdKhd9Hjuq8D4DIrpf3oEzIOCJNZtLo" alt=""><figcaption></figcaption></figure>

**Step 2 :**

Create `.env.qa.guardian.system` file inside configs Directory at the root level. ( Refer .env.template.guardian.system as example)

```
/configs/.env.qa.guardian.system
```

<figure><img src="https://lh4.googleusercontent.com/B1K8quUgHdiZLFJZ3CjPteD_3brt1jDwSMDMMxdnarr3ihl1OoF7cXZB7LgM-6y-w_VZjAToQQR1_-vWsXS4xcokrpe0_ytvEszNYJ0Fm8Dz_Hj2ruF5rSv-ZFkvqUsC4lM4ATE9DkpsgsskGXgsKoY" alt=""><figcaption></figcaption></figure>

**Step 3:**

Set **OPERATOR\_ID** , **OPERATOR\_KEY** and **IPFS\_STORAGE\_API\_KEY** in the `.env.qa.guardian.system` file inside configs Directory at the root level

<figure><img src="https://lh6.googleusercontent.com/0IjchilNsshCHpx3jZN4qMvtHeELO5fXRU1ZiJXydNUuUDlK_N_htnuBSv-hWRqmYr6hDstIaNVaVh1K8MEZlyu1R_kr-sfUS3bl11OqEENKwpoTodmkRZV819JmslL59RY7Mwp9PWXHsP6NWufxVaE" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/6DiedDKukaRjttq55iwGmmKkrDtob4Wjm1nz8nVePXlgKoqYH-5CyiSF521V-md5QPceKNbSUXyPzAyZTLq2lnP1bntsnKQEzpXw7g9me_15NLcv_AIiEYKC841BZPP-SoasHgxGWCN9n0e9--EZItM" alt=""><figcaption></figcaption></figure>

**Step 4:**

Run

```
docker-compose up -d --build
```

<figure><img src="https://lh4.googleusercontent.com/r9KO9vXnmDgZXjTY3uSU3A_2NnzHw0HLogPBFKa_Q8K3Gi461wp1BztucaHKzhBhIX7BYOZg6eQaWDSkCCzEr2ivmFxrLWyojwLUm4doiwf8RP-3X23xAbSPVvenM_lj4GDxpidW8epoWPHRD8TlRm8" alt=""><figcaption></figcaption></figure>

Wait until all the services are started.

<figure><img src="https://lh3.googleusercontent.com/QVwpaNw70EIOOcZldSW_oZiUv7ewayBfZvD9-SQ2NZ_I2n9yR_bfOJ0XJP2W_qqetF4-YyquV-T2hcdQQ3sVwqb7wmvgesDFZvS-HuUfzOJ9auKZUIcupR_xpYVfnMOHM3OI7lPSCes3rHTK1DO2JdI" alt=""><figcaption></figcaption></figure>

**Step 5:**

Launch localhost:3000

<figure><img src="https://lh5.googleusercontent.com/dxgG4yfiJIK1oRuh-8s4TR1KpoZwq9--5KuaKh3HDSGiT7EyRh2n5k_VWIwrVp0cYZvQEKZBvwzttYSdl97bAC4ORRzF5da5fAX7b8wE523MFIOzIpQUKY2U3V5-nAp0LCbBAqbzUUhbOnt9BxCfu9Q" alt=""><figcaption></figcaption></figure>
