# Deploying Guardian using a specific Environment ( DEVELOP )

The following steps will describe on how to deploy Guardian using the default Environment (Develop):

**Step 1:**

Create the .env file Set the GUARDIAN\_ENV="develop" in the .env file ( Refer .env.template as example)

<pre><code><strong>GUARDIAN_ENV="develop"
</strong></code></pre>

<figure><img src="https://lh4.googleusercontent.com/MHvuUn6gwwK8_bObtcfKCc_rwXmN824pk6E5UFh0C6l9ynrjeQ51nlvsPlvN7Cd9MYip_jVWYFqI7QYtsmHLcYTQUC7tcfMfC04xmINKoN_tQ2nTlSQtGscdRPwg7JX-rOs8meEgAFUxLSYMoUUuIWQ" alt=""><figcaption></figcaption></figure>

**Step 2:**

Select the `.env.develop.guardian.system` file which is already provided as in example inside configs Directory at the root level.

```
/configs/.env.develop.guardian.system
```

<figure><img src="https://lh4.googleusercontent.com/_2o8ofJqkSu0Vv8kBhxVmoXeKZRueovaegt_x8gtgD--hQul7zCv-VE9f61AbggeRngMSTyEiO7SmH5eoT_ddzbl037ht17wem-xhQJOIMJBDKm3JRvup78TgkFHmsToCqQH8iaG1Tl6QYhqxccAmZE" alt=""><figcaption></figcaption></figure>

**Step 3:**

Set **OPERATOR\_ID** , **OPERATOR\_KEY** and **IPFS\_STORAGE\_API\_KEY** in the `.env.develop.guardian.system` file inside configs Directory at the root level

<figure><img src="https://lh3.googleusercontent.com/S1dg4YW60Ii-NwDflJviLSWpeU4BWrMv-Zrr6KhkMaOvtQ7Rapb-SUq7TZZcHIcXl3nkb4Uv5rRKOZqSCZuDSywPR18TgRI9qk9v_KaTs2CgS4IvG-F6p-GKPJDWixRMh0yjZi70g-rTnj2SVVNN9NM" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/kewxChAWKmpdMTgDB59DEx_LdRq4IAaSIOzvbzlPtx75vR0MDMmpezHQCEFYT33i1d5yQu4U5niPYBRziDOZ27S5cqprVptQFOSx_J6g_e-lNZ5BX2_-aXPrvUxs3hEzJJZzdMKMvBw2g81ah_KDqns" alt=""><figcaption></figcaption></figure>

**Step 4:**

Run

```
docker-compose up -d --build
```

<figure><img src="https://lh4.googleusercontent.com/6-lcBW4JAy0khECbx4UVWfswAQou8KwVmawvMEBqSuFZp__NtTP6a2s6U_w6Q2mu4g-xZdUSvnNWPDAMkot1_BUfgwLLGJU2WN7hZZ2tG40kB7PT4tvUGZDLdg-G2yKe6GweZpcsJU3HrgkgBHiXPcc" alt=""><figcaption></figcaption></figure>

Wait until all the services are started.

<figure><img src="https://lh5.googleusercontent.com/3zTg8RsJ1v5EDPdVIhGhCNRJLGRsoRYf_wKK9tP-pwvLBpaZRHUVw6lK_ZoLLyNQwXrBsXUmsGNwhcuQf2UCKKfVE2EemdYiEG6qc8nOfNLfyOc-W8xdy6BA3lU3cTLEhflgFfUUc98T6MT0BVX9ZZc" alt=""><figcaption></figcaption></figure>

**Step 5:**

Launch localhost:3000

<figure><img src="https://lh4.googleusercontent.com/fFvnldDDUc0sa15WcTrHk_SOsFt3QY_MSptWG7AoN4V7ZmF48yFu-ySLhEwpOetb1yVwyn0_gTBdSAq80BUwQHW2hJDaSJcR8QSpI2IGKpzTYrY2GzcxUj5nvMxccVATpkqIFMPDyJjTZTt-oteN-eU" alt=""><figcaption></figcaption></figure>
