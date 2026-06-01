# 🚀 simple-col — Modular Colab Automator

A professional TypeScript template for automating Google Colab notebooks and other web tasks using Playwright and Telegram.

## 📂 Project Structure

The project follows a **modular layered architecture**, separating technical services from business logic.

```text
simple-col/
├── .gitignore          # Git exclusions (cookies, node_modules, etc.)
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── src/
    ├── config.ts       # ⚙️ Central Configuration (Tokens, IDs)
    ├── index.ts        # 🚦 Main Entry Point (Command Dispatcher)
    ├── services/       # 🛠 Technical Services (Reusable Tools)
    │   ├── telegram.ts # Telegram Bot API integration (Text, Photos, Docs)
    │   └── browser.ts  # Playwright Browser setup with Stealth mode
    └── tasks/          # 🎯 Business Logic (Specific Automation Tasks)
        ├── colab.ts    # Google Colab: Auto-open and "Run All Cells"
        ├── auth.ts     # Google: Authentication and Cookie saving
        └── work.ts     # Status: Public IP check and system ping
```

## ⚙️ Logic Flow

1.  **Dispatcher**: `index.ts` receives a command-line argument (e.g., `colab`, `auth`, `work`).
2.  **Service Initialization**: The dispatcher calls a task from the `tasks/` folder.
3.  **Tooling**: Each task uses `services/browser.ts` to get a managed browser instance and `services/telegram.ts` to report results.
4.  **Configuration**: All tasks read secrets and IDs from `config.ts`.

## 🚀 Setup & Installation

### 1. Clone the repository
```bash
git clone git@github.com:dbrehov/simple-col.git
cd simple-col
```

### 2. Install dependencies
```bash
npm install
npx playwright install chromium
```

## 🛠 Usage

Run the project using `npx ts-node src/index.ts [command]`:

| Command | Description | Mode |
| :--- | :--- | :--- |
| `auth` | Authenticate with Google and save `cookies.json` | Visible |
| `work` | Check public IP and send status to Telegram | Visible |
| `colab` | Open Colab notebook and run all cells | Visible |
| `colab less` | Open Colab notebook and run all cells | **Headless** |

### Examples:
```bash
# Check if everything is working
npx ts-node src/index.ts work

# Save Google cookies (mandatory for Colab)
npx ts-node src/index.ts auth

# Launch Colab in headless mode
npx ts-node src/index.ts colab less
```

## 📝 Notes
- **Cookies**: The `cookies.json` file is essential for the `colab` task to bypass Google login.
- **Stealth**: The project uses stealth plugins and custom User-Agents to avoid bot detection.
- **Colab Execution**: The bot uses the `Ctrl+F9` hotkey (or Command Palette) to execute all cells in the notebook.
