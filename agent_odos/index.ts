import BN from "bn.js";
import Web3 from "web3";

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

const novesApiKey = "d5RJLF11LMo6oUaXdt";
const agentAccount = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"
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
    const diffAmount = new BN(odosAmount).sub(new BN(originalAmount));
    const isOdosQuoteBetter = diffAmount.gt(new BN(0));
    const diffAmountString = Web3.utils.fromWei(diffAmount.toString(), targetDecimals);

    console.log("Is Odos quote better:", {
      originalAmount,
      odosAmount,
      isOdosQuoteBetter,
    });

    if (!isOdosQuoteBetter) {
      return;
    }

    const tokenSymbol = receivedAction.token.symbol;

    ws.send(
      JSON.stringify(
        {
          "type": "Warning",
          "tx_hash": message.txHash,
          "message": `
**Better swap found**

You could get ${diffAmountString} ${tokenSymbol} more with Odos swap.

[Click here to swap on ODOS](https://app.odos.xyz)
`,
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
