chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "callAPI") {
      fetch("https://nodejs-production-83b6.up.railway.app/api/getResponse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: request.userId
        })
      })
      .then(response => response.json())
      .then(data => sendResponse({ result: data.response }))
      .catch(error => sendResponse({ error: error.message }));
      return true; // Keeps the message channel open for async response
    }
  });