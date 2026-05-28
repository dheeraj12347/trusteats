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
    console.log("Existing page targetId:", existingPage.targetId);
    
    // 2. Attach to existing page
    const attachRes = await send("Target.attachToTarget", { targetId: existingPage.targetId, flatten: true });
    const sessionId = attachRes.sessionId;
    console.log("Attached to existing page with sessionId:", sessionId);
    
    // 3. Open new tab using window.open
    console.log("Opening new tab via window.open...");
    await send("Runtime.evaluate", { expression: `window.open("http://localhost:3000")` }, sessionId);
    
    // 4. Wait a bit and get targets again
    await new Promise(r => setTimeout(r, 2000));
    const getTargetsRes2 = await send("Target.getTargets");
    console.log("New Targets list:", JSON.stringify(getTargetsRes2.targetInfos, null, 2));
    
    const newPage = getTargetsRes2.targetInfos.find(t => t.type === "page" && t.url.includes("localhost:3000"));
    if (!newPage) {
      throw new Error("New page target for http://localhost:3000 not found!");
    }
    console.log("New page targetId:", newPage.targetId);
    
    // 5. Attach to new page
    const attachRes2 = await send("Target.attachToTarget", { targetId: newPage.targetId, flatten: true });
    const sessionId2 = attachRes2.sessionId;
    console.log("Attached to new page with sessionId:", sessionId2);
    
    // 6. Evaluate title and print it
    const evalTitle = await send("Runtime.evaluate", { expression: "document.title" }, sessionId2);
    console.log("New Page Title:", evalTitle.result.value);
    
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
