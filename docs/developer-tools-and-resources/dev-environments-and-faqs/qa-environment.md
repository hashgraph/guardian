# Deploying Guardian using a specific Environment (QA)

The following steps will describe on how to deploy Guardian using the default Environment (QA):

**Step 1:**

Create the .env file

Set the GUARDIAN\_ENV="qa" in the .env file ( Refer .env.template as example)

<pre><code><strong>GUARDIAN_ENV="qa"
</strong></code></pre>

**Step 2 :**

Create `.env.qa.guardian.system` file inside configs Directory at the root level. ( Refer .env.template.guardian.system as example)

```
/configs/.env.qa.guardian.system
```

**Step 3:**

Set **OPERATOR\_ID** , **OPERATOR\_KEY** and **IPFS\_STORAGE\_API\_KEY** in the `.env.qa.guardian.system` file inside configs Directory at the root level

**Step 4:**

Run

```
docker-compose up -d --build
```

Wait until all the services are started.

**Step 5:**

Launch [localhost:3000](http://localhost:3000/)
