const wsUrl = process.env.AGY_BROWSER_WS_URL;
if (!wsUrl) {
  console.error("No AGY_BROWSER_WS_URL env variable found!");
  process.exit(1);
}

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log("Connected to browser WebSocket");
  ws.send(JSON.stringify({
    id: 1,
    method: "Target.getTargets"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id === 1) {
    console.log("Targets:", JSON.stringify(data.result.targetInfos, null, 2));
    ws.close();
  }
};

ws.onerror = (err) => {
  console.error("WebSocket error:", err);
};

ws.onclose = () => {
  console.log("Connection closed");
};
