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
    
    // 1. Get targets
    const getTargetsRes = await send("Target.getTargets");
    const existingPage = getTargetsRes.targetInfos.find(t => t.type === "page");
    if (!existingPage) {
      throw new Error("No existing page target found");
    }
    const originalUrl = existingPage.url;
    console.log("Existing page URL:", originalUrl);
    
    // 2. Attach to existing page
    const attachRes = await send("Target.attachToTarget", { targetId: existingPage.targetId, flatten: true });
    const sessionId = attachRes.sessionId;
    console.log("Attached to existing page with sessionId:", sessionId);
    
    // 3. Navigate existing page to localhost:3000
    console.log("Navigating to http://localhost:3000...");
    await send("Runtime.evaluate", { expression: `window.location.href = "http://localhost:3000"` }, sessionId);
    
    // 4. Wait for page to load
    await new Promise(r => setTimeout(r, 4000));
    
    // 5. Evaluate and verify page content
    const evalTitle = await send("Runtime.evaluate", { expression: "document.title" }, sessionId);
    const evalBody = await send("Runtime.evaluate", { expression: "document.body.innerText" }, sessionId);
    console.log("Navigated Page Title:", evalTitle.result.value);
    console.log("Navigated Page Body length:", evalBody.result.value ? evalBody.result.value.length : 0);
    console.log("Navigated Page Body preview:", evalBody.result.value ? evalBody.result.value.substring(0, 300) : "empty");
    
    // 6. Navigate back to original URL
    console.log("Navigating back to original URL...");
    await send("Runtime.evaluate", { expression: `window.location.href = ${JSON.stringify(originalUrl)}` }, sessionId);
    
    // 7. Wait for original page to restore
    await new Promise(r => setTimeout(r, 2000));
    console.log("Done!");
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
