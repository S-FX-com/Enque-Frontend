# Project Setup Guide

## Prerequisites

-   Node.js (recommended version: 20.x or later)
-   npm (comes with Node.js)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/S-FX-com/ObieDesk-Frontend.git
cd ObieDesk-Frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and fill in any required configuration values

### 4. Modify Hosts File

To set up local domain routing, you'll need to modify your hosts file:

#### Windows

1. Open Command Prompt as Administrator
2. Navigate to: `C:\Windows\System32\drivers\etc\`
3. Open `hosts` file in a text editor (e.g., Notepad)
4. Add the following lines at the end of the file:

```
127.0.0.1 platform.test
127.0.0.1 sfx.platform.test
```

5. Save the file

#### macOS/Linux

```bash
sudo echo "127.0.0.1 platform.test" | sudo tee -a /etc/hosts
sudo echo "127.0.0.1 sfx.platform.test" | sudo tee -a /etc/hosts
```

### 5. Start Development Server

```bash
npm run dev
```

## Troubleshooting

-   Ensure all dependencies are correctly installed
-   Check that your environment variables are properly configured
-   Verify hosts file modifications were saved correctly

## Additional Notes

-   Recommended Node.js version: 20.x or later
-   Ensure you have the latest npm version
