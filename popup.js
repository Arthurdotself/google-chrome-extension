// popup.js
document.getElementById("generate").addEventListener("click", () => {
    const prompt = document.getElementById("prompt").value;
    chrome.runtime.sendMessage({ action: "callAPI", userId: prompt }, (response) => {
      if (response.result) {
        document.getElementById("response").textContent = response.result;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "fillAnswerBox", text: response.result });
        });
      } else {
        document.getElementById("response").textContent = "Error: " + response.error;
      }
    });
  });
  