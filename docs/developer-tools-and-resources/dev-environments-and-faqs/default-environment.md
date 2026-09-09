# Deploying Guardian using default Environment

The following steps will describe on how to deploy Guardian using the default Environment:

**Step 1:**

By default GUARDIAN\_ENV="" is Blank in the .env.template

Create .env file and leave the variable as Empty

<pre><code><strong>GUARDIAN_ENV=""
</strong></code></pre>

{% hint style="info" %}
**Note : If you forget to create the .env file , the docker compose will evaluate the variable as Empty, giving a warning, but the end result will be the same.**
{% endhint %}

**Step 2:**

Select the `.env..guardian.system` file which is already provided as in example inside configs Directory at the root level.

```
/configs/.env..guardian.system
```

**Step 3:**

Set **OPERATOR\_ID** , **OPERATOR\_KEY** and **IPFS\_STORAGE\_API\_KEY** in the `.env..guardian.system` file inside configs Directory at the root level.

**Step 4:**

Run

```
docker-compose up -d --build
```

Wait until all the services are started.

**Step 5:**

Launch [localhost:3000](http://localhost:3000/)
