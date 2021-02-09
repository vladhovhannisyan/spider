"use strict";

var headers = new Headers();
    headers.append("Accept", "application/json");
var ip = '';

chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript(null, { file: "content.js" });
});

fetch("https://ipinfo.io", {
        method: 'POST',
        headers: headers,
        redirect: 'follow',
        // mode: 'no-cors',
    })
    .then(response => response.text())
    .then(result => {
        // console.log(result);
        result = JSON.parse(result);
        ip = result.ip;
    })
    .catch(error => console.log('error', error));


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

  // console.log('---------', message);

  if (message.name === "download-json") {
    let blob = new Blob([message.data], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `${message.filename || "spider"}.json`
    });
  }

  if (message.name === "download-csv") {
    let blob = new Blob([message.data], { type: "text/csv" });
    let url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `${message.filename || "spider"}.csv`
    });
  }

  if (message.name === "getLocalStorage") {
    const fieldName = localStorage.getItem("fieldname");
    sendResponse({ data: localStorage[message.data.key] });
  }

  if (message.name === "schedule-details") {
      let url = message.url;
      let page = message.page;
      let date = message.date;
      let siteData = message.siteData;

      date = new Date(message.date).toISOString();

      var requestOptions = {
          method: 'GET',
          redirect: 'follow',
          mode: 'no-cors'
      };

        fetch(`https://bmxh8t9fx2.execute-api.us-east-2.amazonaws.com/prod?ip="${ip}"&url="${url}"&page="${page}"&time="${date}"&siteData="${siteData}"`, requestOptions)
            .then(response => response.text())
            .then(result => console.log(result))
            .catch(error => console.log('error', error));

      //   fetch(`https://nai321302g.execute-api.us-east-2.amazonaws.com/prod?user="${ip}"&url="${url}"&page="${page}"&time="${date}"&siteData="${siteData}"`, requestOptions)

  }

  if (message.name === "schedule-run") {

      fetch(`https://vnfb35w2qk.execute-api.us-east-2.amazonaws.com/dev`, {
          method: 'GET',
          redirect: 'follow',
          mode: 'no-cors'
      })
          .then(response => response.text())
          .then(result => console.log(result))
          .catch(error => console.log('error', error));
  }

    if (message.name === "schedule-data-show") {


    }

});
