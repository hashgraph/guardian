# Deploying Guardian using a specific Environment ( DEVELOP )

The following steps will describe on how to deploy Guardian using the default Environment (Develop):

**Step 1:**

Create the .env file Set the GUARDIAN\_ENV="develop" in the .env file ( Refer .env.template as example)

<pre><code><strong>GUARDIAN_ENV="develop"
</strong></code></pre>

**Step 2:**

Select the `.env.develop.guardian.system` file which is already provided as in example inside configs Directory at the root level.

```
/configs/.env.develop.guardian.system
```

**Step 3:**

Set **OPERATOR\_ID** , **OPERATOR\_KEY** and **IPFS\_STORAGE\_API\_KEY** in the `.env.develop.guardian.system` file inside configs Directory at the root level

**Step 4:**

Run

```
docker-compose up -d --build
```

Wait until all the services are started.

**Step 5:**

Launch [localhost:3000](http://localhost:3000/)
