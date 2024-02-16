# Backup tools

To implement a backup and recovery strategy for installation data and transaction data in Hedera Guardian application here are the detailed guidelines/ steps to be followed:

## Guidelines

A. Determine what data needs to be backed up: Identify installation data and transaction data that needs to be backed up, determine the frequency at which it needs to be backed up.

B. Choose a backup storage location: Select a secure and reliable location to store your backups. Cloud storage services like Amazon S3, Google Cloud Storage, and Microsoft Azure are popular options.

C. Decide on a backup schedule: Define a backup schedule that ensures all critical data is backed up regularly and create a backup policy based on it.

D. Develop backup scripts: Write backup scripts in Node.js that automate the backup process. Use libraries like Node.js's built-in fs module or third-party libraries like node-schedule or node-cron to create and schedule backup jobs. Alternatively, we can use open source tools like "node-backup-manager" or "duplicity".

E. Test backups and recovery procedures: Test your backups regularly to ensure that the data is being backed up correctly and can be restored in the event of data loss. Develop recovery procedures that detail how to restore data from backups.

F. Monitor backups and automate notifications: Monitor the backup process to ensure that backups are being created and stored correctly. Automate notifications to alert you of any backup failures or issues.

G.Automate the backup process: Automating the backup process can save time and reduce the risk of human error.

H.Secure backups: Backups should be encrypted to prevent unauthorized access to sensitive data. This includes using strong passwords and encryption algorithms to protect data both in transit and at rest.

I.Test backups regularly: It is important to test backups regularly to ensure that the backup process is working correctly. This includes testing the restore process to ensure that data can be recovered in the event of a disaster.

J. Update backup strategy as necessary: Revisit your backup strategy periodically to ensure that it remains relevant and effective. Make changes as necessary based on changes to your data or infrastructure.

By following these steps, the implementer company can implement a backup and recovery strategy for the installation and transaction data in their Guardian application to protect them in the event of data loss or other issues.

## Guidelines in Detail

**A. Determine what data needs to be backed up: Identify installation data and transaction data that needs to be backed up, determine the frequency at which it needs to be backed up.**

### **Installation data:**

Installation data refers to the configuration settings and other data that are necessary to install and set up a software application. Some examples of installation data in a Guardian application might include:

1\. Server configurations: This includes information about the hardware and software requirements for the application to run, such as the operating system, CPU, memory, and storage.

2\. Environment variables: These are variables that specify settings for the environment in which the application runs. For example, they might include the database connection string, API keys, or other environment-specific settings.

3\. Application settings: These are settings that are specific to the application, such as the default language, time zone, or other user preferences.

4\. Dependencies: These binary files are the external libraries or modules that the application relies on to function correctly. They might include Node.js modules, third-party libraries, or other software packages. These executable files, required for the application to run, are part of the installation data.

5\. Scripts: These are scripts that are run during the installation process to perform certain tasks, such as setting up the **database schema** or initializing the application.

**Note**: The Guardian application does use a **MongoDB** database hence the database schema is part of the installation data that needs to be backed up.

6\. License agreements: These are the legal agreements that govern the use of the application and must be agreed upon before installation.

7\. Customizations: If you have made any customizations to your application or system during installation or setup, these customizations are part of the installation data and need to be backed up.

### Transaction data:

Transaction data in the Guardian application refers to the data related to user transactions or activities within the application. Examples of transaction data can include:

1. User registration and login information
2. User profile data such as name, email, and contact information
3. User-generated content such as posts, comments, and messages
4. Server logs and error logs that record server activities and errors
5. Session data that tracks user activity and preferences during a single session.
6. MongoDB data as entered by a standard registry user or by a field user.

In general, transaction data in the Guardian application includes any data that is generated or modified by different users’ actions within the application. This data is critical to the proper functioning of the application and must be backed up and protected in case of data loss or corruption.

**B. Choose a backup storage location: Select a secure and reliable location to store your backups. Cloud storage services like Amazon S3, Google Cloud Storage, and Microsoft Azure are popular options.**

When it comes to choosing a backup storage location, there are several factors to keep in mind to ensure that your data is secure and easily accessible. Here are some key considerations:

1. Security: Your backup storage location should be secure and protected against unauthorized access. This means using encryption and access controls to prevent data breaches.
2. Reliability: Your backup storage location should be reliable and have a high level of uptime. This means choosing a provider with a proven track record of reliability and ensuring that your data is backed up regularly.
3. Scalability: Your backup storage location should be scalable and able to accommodate your growing data needs. This means choosing a provider that can easily scale up or down as your business needs change.
4. Accessibility: Your backup storage location should be easily accessible, both in terms of physical location and connectivity. This means choosing a provider with multiple data centers in different geographic locations and ensuring that you have reliable internet connectivity.
5. Cost: Your backup storage location should be cost-effective, without sacrificing security or reliability. This means comparing prices from different providers and choosing one that offers the best balance of cost, security, and reliability.
6. Compliance: Your backup storage location should comply with any relevant data protection regulations, such as GDPR or HIPAA. This means choosing a provider that has the necessary certifications and can provide proof of compliance.

By keeping these factors in mind, you can choose a backup storage location that meets your business needs and ensures the security and accessibility of your data.

**C. Decide on a backup schedule: Define a backup schedule that ensures all critical data is backed up regularly and create a backup policy based on it.**\\

When deciding on a backup schedule, there are several important factors to consider to ensure that your data is protected and easily recoverable in the event of a disaster or data loss. Here are some key considerations:

1. Recovery Point Objective (RPO): The RPO is the maximum amount of data that can be lost before it starts to impact your business. When deciding on a backup schedule, you should consider your RPO and ensure that your backups are frequent enough to meet this requirement.
2. Recovery Time Objective (RTO): The RTO is the amount of time it takes to restore your data after a disaster or data loss. When deciding on a backup schedule, you should consider your RTO and ensure that your backups are frequent enough to meet this requirement.
3. Data Volume: The size of your data volume will affect the backup schedule. Large volumes of data will require more time to back up, so you may need to schedule backups more frequently.
4. Data Criticality: The criticality of your data will also affect the backup schedule. Critical data should be backed up more frequently than non-critical data to minimize the risk of data loss.
5. Backup Window: The backup window is the time during which backups can be performed without impacting the performance of your systems. When deciding on a backup schedule, you should consider your backup window and ensure that backups are scheduled during a time when they will not impact system performance.
6. Backup Type: The type of backup you use will also affect the backup schedule. Full backups may take longer to perform, but they provide complete data protection. Incremental and differential backups may be faster, but they provide less complete data protection.

By considering these factors, you can develop a backup schedule that meets your business needs and ensures the protection and recoverability of your data.

**D. Develop backup scripts: Write backup scripts in Node.js that automate the backup process. Use libraries like Node.js's built-in fs module or third-party libraries like node-schedule or node-cron to create and schedule backup jobs. Alternatively, we can use open source tools like "node-backup-manager" or "duplicity".**

Example 1: Example backup script in Node.js that uses the built-in fs module to automate the backup process.

```
const fs = require('fs');
const { exec } = require('child_process');
const backupDir = '/path/to/backup/directory'; // The directory where backups will be stored
const sourceDir = '/path/to/source/directory'; // The directory to be backed up
const fileName = `backup_${new Date().toISOString()}.tar.gz`; // The filename for the backup file
// Create a backup of the source directory
const createBackup = () => {
  return new Promise((resolve, reject) => {
    exec(`tar -czf ${backupDir}/${fileName} ${sourceDir}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error creating backup: ${err.message}`);
        reject(err);
      }
      console.log(`Backup created successfully: ${fileName}`);
      resolve(fileName);
    });
  });
};
// Copy the backup file to a remote server
const copyBackup = (backupFile) => {
  return new Promise((resolve, reject) => {
    const remoteHost = 'user@remote.host'; // The remote server to copy the backup to
    exec(`scp ${backupDir}/${backupFile} ${remoteHost}:${backupDir}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error copying backup to remote server: ${err.message}`);
        reject(err);
      }
      console.log(`Backup copied to remote server successfully: ${backupFile}`);
      resolve();
    });
  });
};
// Delete old backup files to free up space
const deleteOldBackups = () => {
  const backupRetentionPeriod = 30; // The number of days to keep backup files
  const currentTime = Date.now();
  fs.readdirSync(backupDir).forEach((file) => {
    const filePath = `${backupDir}/${file}`;
    const fileStat = fs.statSync(filePath);
    const fileAge = (currentTime - fileStat.mtimeMs) / (1000 * 60 * 60 * 24); // Convert age to days
    if (fileAge > backupRetentionPeriod) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup file: ${file}`);
    }
  });
};
// Run the backup process
const runBackup = async () => {
  try {
    const backupFile = await createBackup();
    await copyBackup(backupFile);
    deleteOldBackups();
  } catch (err) {
    console.error(`Error running backup process: ${err.message}`);
  }
};
runBackup();
```

Example 2:.Example backup script in Node.js that uses the "node-schedule" library to automate the backup process.

```
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const schedule = require('node-schedule');
// Define backup directory path
const backupDir = path.join(__dirname, 'backups');
// Ensure that backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Define source directory to backup
const sourceDir = path.join(__dirname, 'myApp');

// Define backup function
const backup = () => {
  // Define backup file name and path
  const backupFileName = `backup_${Date.now()}.tar.gz`;
  const backupFilePath = path.join(backupDir, backupFileName);
  // Execute backup command using child_process module
  const backupCommand = `tar -czvf ${backupFilePath} ${sourceDir}`;
  exec(backupCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Backup stderr: ${stderr}`);
      return;
    }
    console.log(`Backup complete. Output: ${stdout}`);
  });
};
// Schedule backup to run every day at midnight
const backupSchedule = schedule.scheduleJob('0 0 * * *', backup);
// Log backup schedule information
console.log(`Backup scheduled to run every day at midnight: ${backupSchedule.nextInvocation()}`);

```

This script uses the "node-schedule" library to schedule a backup function to run every day at midnight. The backup function creates a backup file name and path, and executes a backup command using the child\_process module to compress and archive the source directory into a backup file in the backup directory. The script also includes error handling and logging capabilities to ensure that the backup process is reliable and can be monitored for issues.

Example 3: Backup script in Node.js that uses the "node-crone" library to automate the backup process.

```
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');
// Define backup directory path
const backupDir = path.join(__dirname, 'backups');
// Ensure that backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}
// Define source directory to backup
const sourceDir = path.join(__dirname, 'myApp');
// Define backup function
const backup = () => {
  // Define backup file name and path
  const backupFileName = `backup_${Date.now()}.tar.gz`;
  const backupFilePath = path.join(backupDir, backupFileName);
  // Execute backup command using child_process module
  const backupCommand = `tar -czvf ${backupFilePath} ${sourceDir}`;
  exec(backupCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Backup stderr: ${stderr}`);
      return;
    }
    console.log(`Backup complete. Output: ${stdout}`);
  });
};
// Schedule backup to run every day at midnight
cron.schedule('0 0 * * *', backup, {
  scheduled: true,
  timezone: 'America/New_York'
});
// Log backup schedule information
console.log('Backup scheduled to run every day at midnight in America/New_York timezone.');

```

This script uses the "node-cron" library to schedule a backup function to run every day at midnight in the America/New\_York timezone. The backup function creates a backup file name and path, and executes a backup command using the child\_process module to compress and archive the source directory into a backup file in the backup directory. The script also includes error handling and logging capabilities to ensure that the backup process is reliable and can be monitored for issues.

Example 4:.Example backup script in Node.js that uses the "node-backup-manager" library to automate the backup process.

```
const BackupManager = require('node-backup-manager');
// Initialize backup manager
const backupManager = new BackupManager();
// Configure backup options
const options = {
  backupDir: '/path/to/backup/directory',
  targets: [
    {
      name: 'mongodb',
      type: 'mongodb',
      host: 'localhost',
      port: 27017,
      database: 'mydatabase',
      username: 'myuser',
      password: 'mypassword',
    },
    {
      name: 'files',
      type: 'file',
      sourceDir: '/path/to/source/directory',
    },
  ],
};
// Schedule backups
backupManager.schedule(options, {
  interval: 'daily',
  at: '02:00',
});
// Start backup manager
backupManager.start();

```

In this example, we first import the node-backup-manager library and create an instance of the BackupManager class. We then configure the backup options by specifying the backup directory and the targets to be backed up. In this case, we have two targets: a MongoDB database and a file system directory.

Next, we schedule backups to be performed daily at 2:00 am using the schedule method. Finally, we start the backup manager using the start method.

Note that this is just a basic example, and you can customize the backup options and schedule according to your specific backup requirements.

Example 5:.Example backup script in Node.js that uses the "duplicity" library to automate the backup process.

```
const { spawn } = require('child_process');
// Set backup directory
const backupDir = '/path/to/backup/directory';
// Set source directories to be backed up
const sourceDirs = ['/path/to/source/directory', '/path/to/another/source/directory'];
// Set target URL for backup storage
const targetUrl = 's3://my-bucket/my-backup-folder';
// Set passphrase for encryption (optional)
const passphrase = 'my-passphrase';
// Set duplicity command options
const duplicityOptions = [
  '--no-print-statistics',
  '--s3-use-new-style',
  '--s3-use-ia',
  '--s3-use-multiprocessing',
  '--encrypt-key=MY_ENCRYPTION_KEY',
];
// Create backup command
const backupCommand = [
  'duplicity',
  '--full-if-older-than', '1M',
  ...duplicityOptions,
  ...sourceDirs,
  targetUrl,
];
// If passphrase is provided, add encryption option to command
if (passphrase) {
  backupCommand.splice(1, 0, '--encrypt-key');
  backupCommand.splice(2, 0, passphrase);
}
// Run backup command
const backupProcess = spawn(backupCommand[0], backupCommand.slice(1), {
  cwd: backupDir,
});
// Listen for backup process events
backupProcess.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});
backupProcess.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});
backupProcess.on('close', (code) => {
  console.log(`Backup process exited with code ${code}`);
});

```

In this example, we first set the backup directory, source directories to be backed up, target URL for backup storage, and passphrase for encryption (optional).

We then set the duplicity command options, including disabling statistics output, using S3 in new-style mode, using S3 Intelligent-Tiering, and using multiprocessing. We also specify the encryption key if a passphrase is provided.

Next, we create the duplicity backup command by combining the duplicity executable, the --full-if-older-than option to perform full backups after 1 month, the duplicityOptions, the sourceDirs, and the targetUrl. If a passphrase is provided, we add the encryption option to the command.

Finally, we use the child\_process.spawn method to run the duplicity command as a child process. We listen for events from the backup process, including stdout, stderr, and close events.

**E. Test backups and recovery procedures: Test your backups regularly to ensure that the data is being backed up correctly and can be restored in the event of data loss. Develop recovery procedures that detail how to restore data from backups.**

**F. Monitor backups and automate notifications: Monitor the backup process to ensure that backups are being created and stored correctly. Automate notifications to alert you of any backup failures or issues.**

**G. Update backup strategy as necessary: Revisit your backup strategy periodically to ensure that it remains relevant and effective. Make changes as necessary based on changes to your data or infrastructure.**

## Implementation: MongoDB and .env Files Backup

Backups are an important part of application development. In order to ensure this feature in the Guardian application the following steps could be taken if you want to save the backups in the Amazon S3. This [repository](https://github.com/IntellectEU/nodejs-app-backup) contains an example of how to simulate in detail the process to backup the mongodb collections and .env files. The same could be applied to the Guardian application.

1. Create a new folder called backup in the root folder of the Guardian Application.
2. Change the current docker-compose.yml addin this service:

```
backup:
 build: ./backup
 environment:
   - AWS_ACCESS_KEY_ID=AKIAXC*******D6QV7
   - AWS_SECRET_ACCESS_KEY=Ipk6*****************sfMV
   - S3_BUCKET=application-backups
   - AWS_DEFAULT_REGION=eu-central-1
   - S3_MONGODB_PREFIX=mongodb
   - S3_CONFIGS_PREFIX=configs
   - BACKUP_NAME_FORMAT=mongodb-%Y-%m-%d-%H-%M-%S.archive
 volumes:
   - ./backup:/data
   - /var/run/docker.sock:/var/run/docker.sock
 depends_on:
   - mongodb

```

3. Create this folder structure:

<figure><img src="https://lh5.googleusercontent.com/jrskzKjjcdljK_uHD1TKFOhNXZlEaSSObnWF_PgbzytBH6V_yWN9e3kldiomolxGHB8gkSyiHAEB3WW2J6akuqQlby8YT52w_kAnRbqhDfjb3JKP9Z0oFRixC_yql5ULZor7t81bfmZ4e-d4ItPtb14" alt="" width="563"><figcaption></figcaption></figure>

4.  The dockerfile will look like this:\
    \
    `FROM mongo:latest`\\

    \# Set the working directory

    `WORKDIR /usr/local/bin`

    `COPY . .`

    \# Install required tools

    `RUN apt-get update && apt-get install -y \`

    `curl unzip cron zip`\\

    \# Install AWS CLI dependencies

```
RUN apt-get update && apt-get install -y \
   python3 \
   python3-pip \
   groff \
   less \
   --no-install-recommends// Some code
```

\# Install AWS CLI

`RUN pip3 install awscli`

\
\# Add AWS CLI to the system path

`ENV PATH="/usr/local/aws-cli/bin:${PATH}"`

\# Copy your backup script to the container

```
COPY mongodb-backup.sh /usr/local/bin/mongodb-backup.sh
COPY configs-backup.sh /usr/local/bin/configs-backup.sh
```

\# Set execute permissions for the backup script

```
RUN chmod +x /usr/local/bin/mongodb-backup.sh
RUN chmod +x /usr/local/bin/configs-backup.sh
```

\# Copy the entrypoint script to the container

`COPY entrypoint.sh /usr/local/bin/entrypoint.sh`

\# Set execute permissions for the entrypoint script

```
RUN chmod +x /usr/local/bin/entrypoint.sh
CMD ["/usr/local/bin/entrypoint.sh"]
```

5. **Mongodb-backup.sh script:**

`#!/bin/bash`

\# Add a log entry indicating cron execution

`echo "$(date): Cron job executed" >> /var/log/mongodb-backup.log`

\# Dump the MongoDB data

`mongodump --uri="mongodb://host.docker.internal:27017" --gzip --archive=/tmp/mongo.gz`

\# Upload the backup to S3 using AWS CLI Docker image

`aws s3 cp /tmp/mongo.gz s3://$S3_BUCKET/$S3_MONGODB_PREFIX/$(date +%Y%m%d-%H%M%S).gz`

6. **Configs-backup.sh script:**

`#!/bin/bash`

\# Add a log entry indicating cron execution

`echo "$(date): Cron job executed" >> /var/log/configs-backup.log`

`zip -r -D /tmp/configs.zip /usr/local/bin/configs`

\# Upload the backup to S3 using AWS CLI Docker image

`aws s3 cp /tmp/configs.zip s3://$S3_BUCKET/$S3_CONFIGS_PREFIX/$(date +%Y%m%d-%H%M%S).zip`

7. **entrypoint.sh script:**

The script below will execute hourly to backup the database and the configuration files.

`#!/bin/bash`

\# Start cron

`service cron start`

\# Run the backup script in an infinite loop

```
while true; do
 /usr/local/bin/configs-backup.sh
 /usr/local/bin/mongodb-backup.sh
 sleep 1h  # Adjust the sleep duration as needed
done
```

_Remember that inside the config files we have .env files which are invisible unless you run `ls -lha command`._

<figure><img src="https://lh5.googleusercontent.com/ZI-HVqLo8hXhgDvq---NvtIWGpXywR27Au-c-C5QAJeLGSSySGc3pplVwOCDZpxGu09IlPVy2VPayvm2EZ2wyAORpl8Bj0NL1dU8e19lNwv9ze7ZF_YRsi-KIrdQMYQWhYHLIkIBuPzTTmEkhHuzuHs" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/h4j0tvoV7GWWeH5su1-I33-tlqN5xw_wLpb0aRAT__Mjf4sXRlz7gyyako96chOA-tOXEuvotCcLWcBwADDedtbN2XIVAgZbvHq8PMzRFf8AaMvHoOS1zX-wBfMIAXdIIaPo4LqHWY-qy47LcygsIoc" alt=""><figcaption></figcaption></figure>

The final result will look like the image above. After that you can easily download the last file of the configuration or of the database to be reintroduced in the application.
