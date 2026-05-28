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
    
    // 1. Create a new target pointing to localhost:3000
    console.log("Creating new tab...");
    const createRes = await send("Target.createTarget", { url: "http://localhost:3000" });
    const targetId = createRes.targetId;
    console.log("Created target:", targetId);
    
    // 2. Attach to target
    console.log("Attaching to target...");
    const attachRes = await send("Target.attachToTarget", { targetId, flatten: true });
    const sessionId = attachRes.sessionId;
    console.log("Attached with sessionId:", sessionId);
    
    // 3. Wait a bit for page to load
    await new Promise(r => setTimeout(r, 3000));
    
    // 4. Enable Page and Runtime domains
    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    
    // 5. Evaluate document.title and body.innerText
    console.log("Evaluating page state...");
    const evalTitle = await send("Runtime.evaluate", { expression: "document.title" }, sessionId);
    const evalBody = await send("Runtime.evaluate", { expression: "document.body.innerText" }, sessionId);
    
    console.log("Page Title:", evalTitle.result.value);
    console.log("Page Body length:", evalBody.result.value ? evalBody.result.value.length : 0);
    console.log("Page Body snippet:", evalBody.result.value ? evalBody.result.value.substring(0, 500) : "empty");
    
    ws.close();
  } catch (err) {
    console.error("Error in execution:", err);
    ws.close();
  }
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // If it's a response to a request we sent
  if (data.id && pendingRequests.has(data.id)) {
    const { resolve, reject } = pendingRequests.get(data.id);
    pendingRequests.delete(data.id);
    if (data.error) {
      reject(data.error);
    } else {
      resolve(data.result);
    }
  } else {
    // Console or other events
    if (data.method === "Runtime.consoleAPICalled") {
      console.log("[Browser Console]", data.params.args.map(a => a.value).join(" "));
    }
  }
};

ws.onerror = (err) => {
  console.error("WebSocket error:", err);
};

ws.onclose = () => {
  console.log("Connection closed");
};
