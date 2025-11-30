# Scholarship Scraper Project

A robust web scraping project that collects scholarship data from the National Scholarship Portal (NSP) and J&K scholarship portals using **Node.js**, **Playwright**, and **Cheerio**. Data is stored in **Firebase Firestore**.

## 📂 Project Structure

```
scraper/
 ├── scrape.js                # Main scraping logic
 ├── scrape_scholarships.sh   # Automation shell script
 ├── package.json             # Dependencies and scripts
 ├── .env.sample              # Environment variables template
 ├── utils/
 │     └── firebase.js        # Firebase Admin SDK integration
 └── logs/                    # Execution logs (auto-created)
```

## 🚀 Prerequisites

- Node.js (v14 or higher)
- Firebase Project with Firestore enabled

## 🛠️ Setup Instructions

### 1. Install Dependencies
Navigate to the `scraper` directory and install the required packages:
```bash
cd scraper
npm install
npx playwright install chromium
```

### 2. Configure Firebase
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **Project Settings** > **Service accounts**.
4. Click **Generate new private key**. This will download a JSON file.
5. Open the JSON file and copy the `project_id`, `client_email`, and `private_key`.

### 3. Set Environment Variables
1. Rename `.env.sample` to `.env`:
   ```bash
   cp .env.sample .env
   ```
2. Open `.env` and fill in your Firebase credentials:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----"
   ```
   > **Note:** Ensure the private key is enclosed in quotes and includes the `\n` newline characters.

## 🏃‍♂️ How to Run

### Manual Execution
To run the scraper once:
```bash
npm run scrape
```

### Automated Execution (Shell Script)
The provided shell script installs dependencies (if missing), runs the scraper, and logs output to the `logs/` directory.
```bash
# Make the script executable (Linux/macOS/WSL)
# Scholarship Scraper Project

A robust web scraping project that collects scholarship data from the National Scholarship Portal (NSP) and J&K scholarship portals using **Node.js**, **Playwright**, and **Cheerio**. Data is stored in **Firebase Firestore**.

## 📂 Project Structure

```
scraper/
 ├── scrape.js                # Main scraping logic
 ├── scrape_scholarships.sh   # Automation shell script
 ├── package.json             # Dependencies and scripts
 ├── .env.sample              # Environment variables template
 ├── utils/
 │     └── firebase.js        # Firebase Admin SDK integration
 └── logs/                    # Execution logs (auto-created)
```

## 🚀 Prerequisites

- Node.js (v14 or higher)
- Firebase Project with Firestore enabled

## 🛠️ Setup Instructions

### 1. Install Dependencies
Navigate to the `scraper` directory and install the required packages:
```bash
cd scraper
npm install
npx playwright install chromium
```

### 2. Configure Firebase
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **Project Settings** > **Service accounts**.
4. Click **Generate new private key**. This will download a JSON file.
5. Open the JSON file and copy the `project_id`, `client_email`, and `private_key`.

### 3. Set Environment Variables
1. Rename `.env.sample` to `.env`:
   ```bash
   cp .env.sample .env
   ```
2. Open `.env` and fill in your Firebase credentials:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----"
   ```
   > **Note:** Ensure the private key is enclosed in quotes and includes the `\n` newline characters.

## 🏃‍♂️ How to Run

### Manual Execution
To run the scraper once:
```bash
npm run scrape
```

### Automated Execution (Shell Script)
The provided shell script installs dependencies (if missing), runs the scraper, and logs output to the `logs/` directory.
```bash
# Make the script executable (Linux/macOS/WSL)
chmod +x scrape_scholarships.sh

# Run the script
./scrape_scholarships.sh
```

## ⏰ Scheduling & Automation

### 1. Windows (Local)
To run the scraper automatically every 24 hours on your local Windows machine:

1.  **Open Task Scheduler**: Press `Win + R`, type `taskschd.msc`, and hit Enter.
2.  **Create Task**: Click **Create Basic Task** in the right sidebar.
3.  **Name**: Enter "Scholarship Scraper" and click Next.
4.  **Trigger**: Select **Daily** > Next > Set time (e.g., 12:00:00 AM) > Next.
5.  **Action**: Select **Start a program** > Next.
6.  **Program/script**: Browse and select `C:\Users\PC-ALG\Desktop\scaper\scraper\scrape_scholarships.bat`.
    *   *Tip: In "Start in (optional)", enter the folder path: `C:\Users\PC-ALG\Desktop\scaper\scraper`*.
7.  **Finish**: Click Finish.

### 2. Linux / macOS (Cron)
To run the scraper automatically every 12 hours:

1.  Open your crontab:
    ```bash
    crontab -e
    ```
2.  Add the following line:
    ```cron
    0 */12 * * * /path/to/your/scraper/scrape_scholarships.sh
    ```

### 3. Render (Cloud Deployment)
To deploy this as a free Cron Job on [Render.com](https://render.com):

1.  **Push to GitHub**: Upload this code to a GitHub repository.
2.  **Create Blueprint**:
    *   Go to Render Dashboard > **Blueprints**.
    *   Click **New Blueprint Instance**.
    *   Connect your repository.
    *   Render will automatically detect `render.yaml`.
3.  **Configure Environment**:
    *   You will be prompted to enter your environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
    *   Copy these values from your local `.env` file.
4.  **Deploy**: Click **Apply**. Render will build the Docker container and schedule it to run every 24 hours.

## 🐳 Docker Usage

To build and run the scraper in a Docker container locally:

```bash
# Build the image
docker build -t scholarship-scraper .

# Run the container (passing env vars)
docker run --env-file .env scholarship-scraper
```

## 🔍 Troubleshooting
- **Playwright Errors**: Ensure dependencies are installed (`npx playwright install deps` on Linux).
- **Firebase Auth Errors**: Double-check the `.env` file, especially the `FIREBASE_PRIVATE_KEY` format.
- **Empty Data**: The selectors in `scrape.js` might need updating if the target websites change their layout.
