# DracFlex MCP Server

Model Context Protocol (MCP) companion server for the **DracFlex Card Builder** application. This server enables AI agents (such as Claude in Claude Desktop, Cursor, or VSCode) to read, modify, and style your card designs in real-time through the browser canvas.

The MCP server sets up a **Stdio Transport** for the AI client (e.g. Claude Desktop) and opens a **WebSocket Gateway** on port `9001` which the DracFlex web application automatically connects to when active in your browser.

---

## ⚡ Easiest Way: Run via `npx` (No Cloning Needed)

If the package is published to npm as `dracflex-mcp`, or if you wish to run it instantly, you can use `npx` (Node.js) or `bunx` (Bun):

### For Claude Desktop Config

Open your `claude_desktop_config.json`:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "dracflex-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "dracflex-mcp"
      ]
    }
  }
}
```

If you prefer to run it using Bun:

```json
{
  "mcpServers": {
    "dracflex-mcp": {
      "command": "bunx",
      "args": [
        "dracflex-mcp"
      ]
    }
  }
}
```

---

## 🛠️ Developer Setup: Clone & Run Locally

If you want to clone this repository to make changes or run it locally:

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/dracflex-mcp.git
cd dracflex-mcp
```

### 2. Install Dependencies
You can use either **Node.js** (npm) or **Bun**:

```bash
# Using npm
npm install

# Using Bun
bun install
```

### 3. Build the TypeScript Source
Compile the TS files into the `dist/` directory:

```bash
# Using npm
npm run build

# Using Bun
bun run build
```

### 4. Running the Server

#### Option A: Running with Node.js / `tsx` (Dev Mode)
To run the server dynamically without ahead-of-time building:
```bash
npm run start
```

#### Option B: Running with Bun (Fastest)
To run using Bun's native TS execution:
```bash
bun run src/index.ts
```

---

## ⚙️ Connecting to AI Clients (Local Development Config)

To point Claude Desktop to your locally cloned/built repository, configure it like this:

### Using Node.js:
```json
{
  "mcpServers": {
    "dracflex-mcp-local": {
      "command": "node",
      "args": [
        "C:/absolute/path/to/dracflex-mcp/dist/index.js"
      ]
    }
  }
}
```

### Using Bun (Direct TypeScript execution):
```json
{
  "mcpServers": {
    "dracflex-mcp-local": {
      "command": "bun",
      "args": [
        "run",
        "C:/absolute/path/to/dracflex-mcp/src/index.ts"
      ]
    }
  }
}
```

*(Note: Replace `C:/absolute/path/to/dracflex-mcp` with the actual absolute path to the directory on your system).*

---

## 🎛️ Provided Capabilities

This MCP server provides the following tools and resources:

### Tools:
1. `get_canvas_state`: Get the full JSON structure (components, colors, coordinates, border radius) of the card builder.
2. `add_element`: Add a component (text, shape, social/gaming/crypto badge, QR, barcode) onto the canvas.
3. `update_element`: Modify coordinates, scale, z-index, or custom attributes of any element.
4. `delete_element`: Remove elements from the canvas.
5. `set_canvas_background`: Configure background colors, gradients, angles, borders, or shadows of the card.
6. `align_element`: Align elements relative to the card borders or snap/stack them relative to other elements (e.g. stack text below a logo).
7. `get_card_preview`: Render a high-resolution PNG image of the canvas layout and return it as a base64 asset.
8. `clear_canvas`: Reset the canvas back to blank.

### Resources:
- `dracflex-app://docs/alignment-guide`: Official guidelines for standard card sizes, columns, margins, and layout rules.
- `dracflex-app://docs/elements-guide`: Schema definitions and styling parameters for text, shape, and badge elements.
