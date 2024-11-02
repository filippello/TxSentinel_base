import BN from "bn.js";

const getQuote = async (baseTokenAddress: string, baseTokenAmount: string, targetToken: string, userAddress: string) => {
  const quoteResponse = await fetch("https://api.odos.xyz/sor/quote/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // TODO: get chainId from transaction data
      "chainId": 137,
      "userAddr": userAddress,
      "inputTokens": [
        {
          "tokenAddress": baseTokenAddress,
          "amount": baseTokenAmount
        }
      ],
      "outputTokens": [
        {
          "tokenAddress": targetToken,
          "proportion": 1
        }
      ]
    }),
  });
  const quoteData = await quoteResponse.json();
  console.log("API quote response:", quoteData);
  return quoteData;
};

const assembleQuote = async (pathId: string, userAddress: string) => {
  const assembleResponse = await fetch("https://api.odos.xyz/sor/assemble", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "pathId": pathId,
      "userAddr": userAddress,
      "simulate": false
    }),
  });
  const response = await assembleResponse.json();
  console.log("API assemble response:", response);
  return response;
};

const novesApiKey = "d5RJLF11LMo6oUaXdt";
const agentAccount = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
const wsUrl = "wss://securerpc.filicodelab.xyz/agent/";
const pingInterval = 10000;
const ws = new WebSocket(wsUrl);

let wsPingIntervalId: Timer;

ws.onopen = () => {
  console.log("Connected to RPC server.");
  ws.send(
    JSON.stringify(
      {
        "type": "AgentSubscribe",
        "account": agentAccount,
      }
    )
  );
  wsPingIntervalId = setInterval(() => {
    ws.send("ping");
    console.log("Ping sent to keep the connection alive.");
  }, pingInterval);
};

ws.onmessage = async (event) => {
  const message = JSON.parse(event.data);
  console.log("Received message:", message.unsignedTx);

  const novesResponse = await fetch("https://foresight.noves.fi/evm/polygon/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apiKey": novesApiKey },
    body: JSON.stringify({
      "transaction": message.unsignedTx,
    }),
  });

  const novesData = await novesResponse.json();
  console.log("Noves response:", novesData);

  // TODO: handle multi chain
  const isDexSwap = novesData.classificationData.type === "swap";
  if (!isDexSwap) {
    return;
  }

  const sentAction = novesData.classificationData.sent.find((item: any) => item.action === "sent");
  if (!sentAction) {
    // TODO: handle error
    return;
  }

  const receivedAction = novesData.classificationData.received.find((item: any) => item.action === "received");
  const baseTokenAddress = sentAction.token.address;
  const targetToken = receivedAction.token.address;

  const baseDecimals = sentAction.token.decimals;
  const targetDecimals = receivedAction.token.decimals;
  const baseTokenAmount = parseFloat(sentAction.amount) * 10 ** baseDecimals;
  const baseTokenAmountString = baseTokenAmount.toString();
  const userAddress = message.unsignedTx.from;

  console.log("Calling ODO API.", {
    baseTokenAddress,
    baseTokenAmount,
    targetToken,
    userAddress,
  });

  try {
    const quoteData = await getQuote(baseTokenAddress, baseTokenAmountString, targetToken, userAddress);
    console.log("Quote response:", quoteData);

    const originalAmount = (parseFloat(receivedAction.amount) * 10 ** targetDecimals).toString();

    // TODO: handle errors on quoteData
    if (quoteData.outAmounts.length !== 1) {
      return;
    }

    const odosAmount = quoteData.outAmounts[0];
    const isOdosQuoteBetter = new BN(originalAmount).lt(new BN(odosAmount));

    console.log("Is Odos quote better:", {
      originalAmount,
      odosAmount,
      isOdosQuoteBetter,
    });

    if (!isOdosQuoteBetter) {
      return;
    }

    const assembleResponse = await assembleQuote(quoteData.pathId, userAddress);
    console.log("Assemble response:", assembleResponse);

    ws.send(
      JSON.stringify(
        {
          "type": "Warning",
          "tx_hash": message.txHash,
          "message": "Try using Odos for a better price.",
          "transaction": {
            unsignedTx: assembleResponse.transaction,
          }
        }
      )
    );
  } catch (error) {
    console.error("Error calling API:", error);
  }
};

ws.onclose = () => {
  console.log("WebSocket connection closed.");
  clearInterval(wsPingIntervalId);
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
