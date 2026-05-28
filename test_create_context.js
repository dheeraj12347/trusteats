const wsUrl = process.env.AGY_BROWSER_WS_URL;
if (!wsUrl) {
  console.error("No AGY_BROWSER_WS_URL env variable found!");
  process.exit(1);
}

const ws = new WebSocket(wsUrl);
let id = 1;
const pendingRequests = new Map();

function send(method, params = {}, sessionId = null) {
  return new Promise((resolve, reject) => {
    const msgId = id++;
    const msg = { id: msgId, method, params };
    if (sessionId) {
      msg.sessionId = sessionId;
    }
    pendingRequests.set(msgId, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
}

ws.onopen = async () => {
  try {
    console.log("Connected to browser WebSocket");
    
    // 1. Get targets to find browserContextId
    const getTargetsRes = await send("Target.getTargets");
    const existingPage = getTargetsRes.targetInfos.find(t => t.type === "page");
    if (!existingPage) {
      throw new Error("No existing page target found");
    }
    const browserContextId = existingPage.browserContextId;
    console.log("Using browserContextId:", browserContextId);
    
    // 2. Create target with browserContextId
    console.log("Creating new tab with context...");
    const createRes = await send("Target.createTarget", { 
      url: "http://localhost:3000",
      browserContextId: browserContextId
    });
    const targetId = createRes.targetId;
    console.log("Created target successfully! ID:", targetId);
    
    // 3. Attach to new page
    const attachRes = await send("Target.attachToTarget", { targetId, flatten: true });
    const sessionId = attachRes.sessionId;
    console.log("Attached with sessionId:", sessionId);
    
    // 4. Wait for it to load
    await new Promise(r => setTimeout(r, 2000));
    
    // 5. Evaluate document.title
    const evalTitle = await send("Runtime.evaluate", { expression: "document.title" }, sessionId);
    console.log("Page Title:", evalTitle.result.value);
    
    ws.close();
  } catch (err) {
    console.error("Error in execution:", err);
    ws.close();
  }
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pendingRequests.has(data.id)) {
    const { resolve, reject } = pendingRequests.get(data.id);
    pendingRequests.delete(data.id);
    if (data.error) {
      reject(data.error);
    } else {
      resolve(data.result);
    }
  }
};

ws.onerror = (err) => {
  console.error("WebSocket error:", err);
};

ws.onclose = () => {
  console.log("Connection closed");
};
