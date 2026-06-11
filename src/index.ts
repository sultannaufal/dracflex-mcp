#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer, WebSocket } from "ws";

// Keep track of the active web socket client
let activeSocket: WebSocket | null = null;

// Map to store pending GET_STATE/GET_PREVIEW requests
const pendingRequests = new Map<string, (val: any) => void>();

// Spawn WebSocket server using standard Node 'ws' library
let wsServer: WebSocketServer | null = null;
try {
  wsServer = new WebSocketServer({ port: 9001, host: "127.0.0.1" });
  
  wsServer.on("error", (err: any) => {
    console.error(`[WS] WebSocket server error: ${err.message}`);
    console.error("[WS] Proceeding in stdio-only gateway mode. Another instance may be active on port 9001.");
  });

  wsServer.on("connection", (ws: WebSocket) => {
    console.error("[WS] Browser client connected.");
    activeSocket = ws;

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.requestId) {
          const resolver = pendingRequests.get(data.requestId);
          if (resolver) {
            resolver(data);
            pendingRequests.delete(data.requestId);
          }
        }
      } catch (e) {
        console.error("[WS] Error parsing message:", e);
      }
    });

    ws.on("close", () => {
      console.error("[WS] Browser client disconnected.");
      if (activeSocket === ws) {
        activeSocket = null;
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] Socket error:", err);
    });
  });

  console.error(`[WS] Server listening on ws://127.0.0.1:9001`);
} catch (e: any) {
  console.error(`[WS] Failed to bind WebSocket server: ${e.message}`);
  console.error("[WS] Proceeding in stdio-only gateway mode. Another instance may be active on port 9001.");
}

// Initialize MCP Server
const server = new Server(
  {
    name: "dracflex-app",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Register resources list
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "dracflex-app://docs/alignment-guide",
        name: "Card Alignment and Layout Guidelines",
        mimeType: "text/markdown",
        description: "Official guide on how to design, align, and position elements within the DracFlex canvas."
      },
      {
        uri: "dracflex-app://docs/elements-guide",
        name: "DracFlex Element Types and Properties",
        mimeType: "text/markdown",
        description: "Official documentation of all available element types (text, shape, link, gaming, crypto, qr, barcode) and their schema properties."
      }
    ]
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "dracflex-app://docs/alignment-guide") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: `# DracFlex Alignment & Layout Guide

When designing a card, follow these guidelines to make sure elements are aligned and professional:

## Dimensions
- Card width: **603px**
- Card height: **380px**
- Aspect ratio: Standard CR80 credit card (85.6mm x 53.98mm).

## Layout & Margins
- Default Margin: **30px** to **40px** from all borders. 
- Avoid putting text elements closer than 20px to any edge of the card.
- Standard left column start: **40px**.

## Tooling
- Always prefer using the **align_element** tool to align or snap elements. It handles math calculations automatically.
- To center an element horizontally, use \`align_element\` with alignment \`center-x\`.
- To stack elements (e.g. title text below a logo), use \`align_element\` with alignment \`below\`, specifying the target logo element's ID as \`relativeToId\` and a spacing of \`10\` or \`12\` px.

## Text Sizing
- Full Name / Main Title: **24px** to **28px** (Font: Outfit, weight: Bold/800).
- Subtitles / Job Description: **14px** to **16px** (Font: Inter, color: muted/gray).
- Detail labels / handles: **11px** to **12px** (Font: Inter/Fira Code).`
        }
      ]
    };
  }

  if (uri === "dracflex-app://docs/elements-guide") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: `# DracFlex Element Types & Properties

Use these schemas and property definitions when adding or updating elements on the canvas:

## 1. Text Element (\`type: "text"\`)
- **properties**:
  - \`text\`: string (The text content to display)
  - \`fontSize\`: number (e.g. \`12\` to \`28\`)
  - \`fontWeight\`: string (e.g. \`"normal"\`, \`"bold"\`, \`"800"\`, \`"600"\`, \`"500"\`)
  - \`fontFamily\`: string (e.g. \`"Inter"\`, \`"Outfit"\`, \`"Georgia"\`, \`"Arial"\`, \`"Fira Code"\`)
  - \`color\`: CSS color string (e.g. \`"#ffffff"\`, \`"#ebd090"\`)
  - \`align\`: \`"left" | "center" | "right"\` (Default is \`"left"\`. IMPORTANT: If you want text to be centered on the card, you MUST set this to \`"center"\` in addition to centering the element bounding box)
  - \`italic\`: boolean (optional)
  - \`underline\`: boolean (optional)
  - \`letterSpacing\`: number (optional, e.g. \`2\` for track-spacing)
  - \`lineHeight\`: number (optional, e.g. \`1.2\`)
  - \`textTransform\`: \`"none" | "uppercase" | "lowercase"\` (optional)
  - \`verticalAlign\`: \`"top" | "middle" | "bottom"\` (optional)
  - \`strokeWidth\`: number (optional, e.g. \`1.5\`)
  - \`strokeColor\`: CSS color string (optional)
  - \`textShadowColor\`: CSS color string (optional, for neon glow)
  - \`textShadowBlur\`: number (optional)
  - \`textShadowX\`: number (optional)
  - \`textShadowY\`: number (optional)

## 2. Shape Element (\`type: "shape"\`)
- **properties**:
  - \`shapeType\`: \`"rectangle" | "circle" | "hexagon" | "star" | "triangle"\`
  - \`fillType\`: \`"solid" | "gradient" | "image"\`
  - \`fillColor\`: CSS color string (for solid type, e.g. \`"#6366f1"\`)
  - \`fillColorStart\`: CSS color string (for gradient start)
  - \`fillColorEnd\`: CSS color string (for gradient end)
  - \`fillAngle\`: number (gradient angle in degrees, default \`135\`)
  - \`imageUrl\`: string (for image type)
  - \`imageZoom\`: number (default \`1\`)
  - \`imageX\`: number (default \`0\`)
  - \`imageY\`: number (default \`0\`)
  - \`strokeColor\`: CSS color string (for shape outline)
  - \`strokeWidth\`: number (border width)
  - \`borderRadius\`: number (for rounded rectangle, e.g. \`12\`)

## 3. Social Badge Element (\`type: "link"\`)
- **properties**:
  - \`platform\`: \`"twitter" | "github" | "youtube" | "discord" | "linkedin" | "telegram" | "custom"\`
  - \`username\`: string (e.g. \`"@username"\` or display text)
  - \`url\`: string (the URL, e.g. \`"https://..."\`)
  - \`theme\`: \`"glassmorphism" | "solid" | "neon"\`
  - \`backgroundColor\`: CSS color string (optional, if theme is solid)
  - \`textColor\`: CSS color string (optional, if theme is solid)

## 4. Gaming Badge Element (\`type: "gaming"\`)
- **properties**:
  - \`platform\`: \`"steam" | "xbox" | "playstation" | "nintendo" | "discord"\`
  - \`gamertag\`: string (Gamer ID / tag)
  - \`theme\`: \`"glassmorphism" | "solid" | "neon"\`
  - \`backgroundColor\`: CSS color string
  - \`textColor\`: CSS color string

## 5. Crypto Address Badge Element (\`type: "crypto"\`)
- **properties**:
  - \`network\`: \`"ethereum" | "bitcoin" | "solana"\`
  - \`address\`: string (full crypto wallet address)
  - \`showQR\`: boolean (whether to render a QR code next to it)
  - \`theme\`: \`"glassmorphism" | "solid" | "neon"\`
  - \`backgroundColor\`: CSS color string
  - \`textColor\`: CSS color string

## 6. QR Code Element (\`type: "qr"\`)
- **properties**:
  - \`value\`: string (text or URL to encode)
  - \`fgColor\`: CSS color string (default \`"#000000"\`)
  - \`bgColor\`: CSS color string (default \`"#ffffff"\`)
  - \`includeMargin\`: boolean (default \`true\`)

## 7. Barcode Element (\`type: "barcode"\`)
- **properties**:
  - \`value\`: string (digits/text to encode)
  - \`format\`: \`"CODE128" | "EAN13" | "UPC" | "ITF14" | "CODE39" | "MSI" | "PHARMACODE"\` (default \`"CODE128"\`)
  - \`lineColor\`: CSS color string (default \`"#000000"\`)
  - \`bgColor\`: CSS color string (default \`"#ffffff"\`)
  - \`displayValue\`: boolean (default \`true\`)`
        }
      ]
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});

// Register tools list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_canvas_state",
        description: "Retrieve the current JSON state of the DracFlex canvas, including all elements and coordinates.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "clear_canvas",
        description: "Clear all components from the canvas, resetting it to a blank template.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "add_element",
        description: "Add a new element (text, shape, qr, barcode, link, gaming preset, or crypto preset) to the canvas.",
        inputSchema: {
          type: "object",
          properties: {
            elementType: {
              type: "string",
              enum: ["text", "shape", "link", "gaming", "crypto", "qr", "barcode"],
              description: "The type of element to add."
            },
            x: {
              type: "number",
              description: "The X coordinate for the element's top-left corner (card width: 603px)."
            },
            y: {
              type: "number",
              description: "The Y coordinate for the element's top-left corner (card height: 380px)."
            },
            properties: {
              type: "object",
              description: "Properties for the element depending on its type. Refer to resource 'dracflex-app://docs/elements-guide' for a full details of all properties. Highlights: \n- For 'text': { text, fontSize, color, fontFamily, fontWeight, align: 'left'|'center'|'right' (MUST be 'center' for centered elements) }.\n- For 'shape': { shapeType: 'rectangle'|'circle'|'hexagon'|'star'|'triangle', fillColor, strokeColor, strokeWidth, borderRadius }.\n- For presets/badges ('link', 'gaming', 'crypto'): refer to guide for platform, username, theme etc."
            }
          },
          required: ["elementType"]
        },
      },
      {
        name: "update_element",
        description: "Modify an existing element on the canvas (position, size, or styling properties).",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the element to modify (e.g. 'element-1718293'). Get this ID by calling get_canvas_state first."
            },
            updates: {
              type: "object",
              properties: {
                x: { type: "number", description: "Top-left X coordinate." },
                y: { type: "number", description: "Top-left Y coordinate." },
                width: { type: "number" },
                height: { type: "number" },
                zIndex: { type: "number" },
                properties: {
                  type: "object",
                  description: "New properties to merge with the existing element properties. Refer to resource 'dracflex-app://docs/elements-guide' for property names."
                }
              },
              description: "The updates to apply to the element."
            }
          },
          required: ["id", "updates"]
        },
      },
      {
        name: "delete_element",
        description: "Delete an element from the canvas by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the element to delete."
            }
          },
          required: ["id"]
        },
      },
      {
        name: "set_canvas_background",
        description: "Set the background style, border, shadow, or border radius of the card canvas.",
        inputSchema: {
          type: "object",
          properties: {
            backgroundType: {
              type: "string",
              enum: ["solid", "gradient"],
              description: "Background type."
            },
            solidColor: {
              type: "string",
              description: "CSS color for solid background (e.g., '#0f172a')."
            },
            colorStart: {
              type: "string",
              description: "CSS start color for gradient background."
            },
            colorEnd: {
              type: "string",
              description: "CSS end color for gradient background."
            },
            angle: {
              type: "number",
              description: "Angle for the gradient in degrees (default 135)."
            },
            borderRadius: {
              type: "number",
              description: "Corner radius of the card (default 24)."
            },
            borderColor: {
              type: "string",
              description: "Border color."
            },
            borderWidth: {
              type: "number",
              description: "Border width in pixels."
            }
          }
        },
      },
      {
        name: "get_card_preview",
        description: "Retrieve a visual preview of the current card as a PNG image.",
        inputSchema: {
          type: "object",
          properties: {
            savePath: {
              type: "string",
              description: "Optional absolute or relative path to save the generated PNG image on the server."
            }
          }
        }
      },
      {
        name: "align_element",
        description: "Align an element relative to the canvas borders or relative to another element.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The ID of the element to align (e.g. 'element-1718293').",
            },
            alignment: {
              type: "string",
              enum: [
                "center-x", "center-y", "center-both", 
                "left", "right", "top", "bottom",
                "below", "above", "right-of", "left-of",
                "match-x", "match-y"
              ],
              description: "The type of alignment to apply. For canvas-relative alignments, do not specify 'relativeToId'."
            },
            relativeToId: {
              type: "string",
              description: "Optional ID of the target reference element to align relative to."
            },
            spacing: {
              type: "number",
              description: "Optional gap/padding in pixels between elements (used for relative alignments, default is 12px)."
            },
            matchEdge: {
              type: "string",
              enum: ["center", "left", "right", "top", "bottom"],
              description: "Optional secondary edge alignment (e.g. alignment 'below' with matchEdge 'left' positions the element below the target, matching their left edges. Default is 'center')."
            }
          },
          required: ["id", "alignment"]
        }
      }
    ],
  };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = (request.params.arguments || {}) as Record<string, any>;

  if (!activeSocket) {
    return {
      content: [
        {
          type: "text",
          text: "Error: No active DracFlex browser tab is connected. Open the DracFlex application in your browser to enable AI editing.",
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case "get_canvas_state": {
        const requestId = Math.random().toString(36).substring(2, 11);
        const promise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error("Timeout waiting for DracFlex web app response. Make sure the tab is open and active."));
          }, 8000);

          pendingRequests.set(requestId, (response) => {
            clearTimeout(timeout);
            resolve(response.state);
          });
        });

        activeSocket.send(JSON.stringify({ type: "GET_STATE", requestId }));
        const state = await promise;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(state, null, 2),
            },
          ],
        };
      }

      case "clear_canvas": {
        activeSocket.send(JSON.stringify({ type: "CLEAR_CANVAS" }));
        return {
          content: [{ type: "text", text: "Canvas cleared successfully." }],
        };
      }

      case "add_element": {
        activeSocket.send(
          JSON.stringify({
            type: "ADD_ELEMENT",
            payload: {
              elementType: args.elementType,
              x: args.x,
              y: args.y,
              properties: args.properties || {},
            },
          })
        );
        return {
          content: [{ type: "text", text: `Element of type '${args.elementType}' added successfully.` }],
        };
      }

      case "update_element": {
        activeSocket.send(
          JSON.stringify({
            type: "UPDATE_ELEMENT",
            payload: {
              id: args.id,
              updates: args.updates,
            },
          })
        );
        return {
          content: [{ type: "text", text: `Element '${args.id}' updated successfully.` }],
        };
      }

      case "delete_element": {
        activeSocket.send(
          JSON.stringify({
            type: "DELETE_ELEMENT",
            payload: { id: args.id },
          })
        );
        return {
          content: [{ type: "text", text: `Element '${args.id}' deleted successfully.` }],
        };
      }

      case "set_canvas_background": {
        activeSocket.send(
          JSON.stringify({
            type: "SET_BACKGROUND",
            payload: args,
          })
        );
        return {
          content: [{ type: "text", text: "Canvas background updated successfully." }],
        };
      }

      case "get_card_preview": {
        const requestId = Math.random().toString(36).substring(2, 11);
        const promise = new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error("Timeout waiting for DracFlex web app response. Make sure the tab is open and active."));
          }, 10000);

          pendingRequests.set(requestId, (response) => {
            clearTimeout(timeout);
            resolve(response);
          });
        });

        activeSocket.send(JSON.stringify({ type: "GET_PREVIEW", requestId }));
        const response = await promise;

        if (response.error) {
          throw new Error(response.error);
        }

        const dataUrl = response.dataUrl;
        if (!dataUrl) {
          throw new Error("No data URL received from DracFlex web app.");
        }

        const match = dataUrl.match(/^data:(image\/png);base64,(.+)$/);
        if (!match) {
          throw new Error("Invalid image format returned from web app.");
        }

        const mimeType = match[1];
        const base64Data = match[2];

        if (args.savePath) {
          const fs = await import("fs/promises");
          const path = await import("path");
          
          let absolutePath = args.savePath;
          if (!path.isAbsolute(absolutePath)) {
            absolutePath = path.resolve(process.cwd(), absolutePath);
          }
          
          const buffer = Buffer.from(base64Data, "base64");
          const dir = path.dirname(absolutePath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(absolutePath, buffer);
          console.error(`[MCP] Saved preview image to ${absolutePath}`);
        }

        return {
          content: [
            {
              type: "image",
              data: base64Data,
              mimeType: mimeType,
            },
          ],
        };
      }

      case "align_element": {
        activeSocket.send(
          JSON.stringify({
            type: "ALIGN_ELEMENT",
            payload: {
              id: args.id,
              alignment: args.alignment,
              relativeToId: args.relativeToId,
              spacing: args.spacing,
              matchEdge: args.matchEdge,
            },
          })
        );
        return {
          content: [{ type: "text", text: `Element '${args.id}' alignment request sent successfully.` }],
        };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
      isError: true,
    };
  }
});

function cleanupAndExit() {
  console.error("[MCP] Cleaning up resources and shutting down...");
  if (wsServer) {
    try {
      wsServer.close();
      console.error("[MCP] WebSocket server closed successfully.");
    } catch (e: any) {
      console.error(`[MCP] Error closing WebSocket server: ${e.message}`);
    }
  }
  process.exit(0);
}

// Monitor stdin to exit when parent process disconnects (avoids dangling server/port)
process.stdin.on("close", () => {
  console.error("[MCP] Stdin closed. Initiating shutdown.");
  cleanupAndExit();
});

process.stdin.on("end", () => {
  console.error("[MCP] Stdin ended. Initiating shutdown.");
  cleanupAndExit();
});

// Monitor standard termination signals
process.on("SIGINT", () => {
  console.error("[MCP] SIGINT received. Initiating shutdown.");
  cleanupAndExit();
});

process.on("SIGTERM", () => {
  console.error("[MCP] SIGTERM received. Initiating shutdown.");
  cleanupAndExit();
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DracFlex MCP Server running on stdio mode and WebSocket ws://localhost:9001");
}

run().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
