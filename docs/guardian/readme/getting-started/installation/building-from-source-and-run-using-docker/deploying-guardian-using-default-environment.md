# Deploying Guardian using default Environment

The following steps will describe on how to deploy Guardian using the default Environment:

**Step 1:**

By default GUARDIAN\_ENV="" is Blank in the .env.template

Create .env file and leave the variable as Empty

<pre><code><strong>GUARDIAN_ENV=""
</strong></code></pre>

<figure><img src="https://lh4.googleusercontent.com/c_vawEODtE2kE9u1_FUQ9fTXnoLeJXxQcnXzCJH10f4S8pu8IHFLzqNQ6kd0oiAT_wMztfa-e00TtX6HhxxcUbsdkq6-_ky09zRA9vV47wuwUpX6YFtT9T79dWlvEvqCi_zJgqH5tHkUmOZfiHbh7z4" alt=""><figcaption></figcaption></figure>

**Note : If you forget to create the .env file , the docker compose will evaluate the variable as Empty, giving a warning, but the end result will be the same.**

**Step 2:**

Select the `.env..guardian.system` file which is already provided as in example inside configs Directory at the root level.

```
/configs/.env..guardian.system
```

<figure><img src="https://lh5.googleusercontent.com/LtN1YP13dedYCdXYeNUrDPEA_Keluq8cUkbFoQH5N3aGG-OpgQLJjn05tjeTbyX3ZzKWe5vdCbsVpRCtBy9XJkWM_WapNc19bXjWVkm_hHQJN_8qTW-voQMm-_KYXerC8fxzehrwAXIOmBpn5xdP2sk" alt=""><figcaption></figcaption></figure>

**Step 3:**

Set **OPERATOR\_ID** , **OPERATOR\_KEY** and **IPFS\_STORAGE\_API\_KEY** in the `.env..guardian.system` file inside configs Directory at the root level.

<figure><img src="https://lh6.googleusercontent.com/_q-coqUYOlkrz0W4o8jRpNGAiyrrjGoghQVPSmWeiyxAeThm_nvWZWA2BGIURIeai6ElSQE4xE3HmKTggph13rmrPl5T8xcXYkzk8DC-17DMrjnhjIQmt1aOFgm-SpWTB4tKll4qwJZPbtSJFO2lzfY" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/dt5Jneew1VdxU86C-hgGeBvSyzt0YnImkYHBAaEIWCTpO0nrYkFy70usQ29N2MGv76woI1v6J2ZDf0c9oKUqLJwGPnP_u0S5lNAkZyv0jDlRBnpUfq5SI60_fIVkhyuW97Jzwk0PY0Uxo3GygHO_nnM" alt=""><figcaption></figcaption></figure>

**Step 4:**

Run

```
docker-compose up -d --build
```

<figure><img src="https://lh3.googleusercontent.com/ugoPsYDdHwBs2IKtryjI6Gt84Ax_r94cZHzo9CnkZcGDnJiCPAliPpfo5b7Qh7VfZHSaYez2YM7qwwPdliWgukCWJgMcZZW8wjAfUIsnPePYYqUYlcd2vyhj33A3OzAHNFHCdKnVg1wJ9lOMpRcOZVc" alt=""><figcaption></figcaption></figure>

Wait until all the services are started.

<figure><img src="https://lh6.googleusercontent.com/WdapNk_pxZsQ-yD2rvgnwbMav8J41abPmzPwVhGMbzWEHslm5S8q63nLKZkOuHnRSDcSb8BpEU9BpffvIE-nwsvAHHLbMA0MjG45jTOHubq8WEktfN_lS3lJphhghIWHJW6_xsJKgKH60EUP26zEgoo" alt=""><figcaption></figcaption></figure>

**Step 5:**

Launch localhost:3000

<figure><img src="https://lh3.googleusercontent.com/Wg9Qt4eo4PEpKhqEU7hnKNwoDo9o_Ui66yYulgnbUryrL473q-dHVBUMYJQlf0jkVTKVJWX5_WnXTWeAXbjV6VXXkDPyYIZVxaIEDiWrSnB8Zot9-1hO5tnhreQp4vqEUyraNrwLWNsK3ajHNvWBlUA" alt=""><figcaption></figcaption></figure>
