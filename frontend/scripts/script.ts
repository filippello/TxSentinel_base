


const main = 
  async () => {

    const rpc = "https://solitary-wispy-yard.matic.quiknode.pro/"

    const value = await fetch(rpc, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_chainId",
        "params": []
      })
    })

    const result = await value.json()

    console.log(result)
  }


main()

