/***********
 * HELPERS *
 ***********/

const injectJSPayload = (payload, args = "") => {
  // Injecting scraper JS payload
  let script = document.createElement("script");
  script.textContent = `(${payload.toString()})(${JSON.stringify(args)})`;
  document.head.appendChild(script);
};

/************
 * PAYLOADS *
 ************/

const scraperPayload = () => {
  let currentURL = window.location.href;

  setInterval(() => {
    let newURL = window.location.href;

    if (currentURL != newURL) {
      // URL change
      currentURL = newURL;

      let subdomain = newURL.split("mail.google.com/mail/u/0/#")[1];
      let emailHash = subdomain.split("/")[1];

      // An email is open
      if (emailHash) {
        let smartReplies = Array.from(document.getElementsByClassName("bra"));

        // Smart Reply elements are present
        if (typeof smartReplies !== "undefined" && smartReplies.length > 0) {
          let receivedEmailAuthor = document.getElementsByClassName("go")[0];
          let receivedEmailSubject = document.getElementsByClassName("hP")[0];
          let receivedEmail = document.getElementsByClassName("a3s aXjCH ")[0];

          // Send scraped email content to the content script
          window.postMessage(
            {
              title: "scrapedEmailContent",
              value: {
                author: receivedEmailAuthor.innerText
                  .replace("<", "")
                  .replace(">", ""),
                subject: receivedEmailSubject.innerText,
                email: receivedEmail.innerText,
                smartReplies: smartReplies.map(reply => reply.innerText)
              }
            },
            "*"
          );
        }
      }
    }
  }, 500);

  // MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
  //
  // let observer = new MutationObserver((mutations, observer) => {
  //   let targetElems = Array.from(document.getElementsByClassName("ams bkH"));
  //
  //   if (typeof targetElems !== "undefined" && targetElems.length > 0) {
  //   }
  // });
  //
  // observer.observe(document, {
  //   subtree: true,
  //   attributes: true
  // });
};

const customSmartReplyPayload = smartReplies => {
  const injectEmailIntoContainer = email => {
    let emailContainer = document.getElementsByClassName(
      "Am Al editable LW-avf"
    )[0];
    if (emailContainer !== "undefined" && emailContainer != null) {
      emailContainer.innerText = email;
    } else {
      setTimeout(() => injectEmailIntoContainer(email), 200);
    }
  };

  const createNewSmartReply = (label, email) => {
    let smartRepliesContainer = document.getElementsByClassName("brb")[0];
    let clonedNode = smartRepliesContainer.lastChild.cloneNode(true);
    clonedNode.innerHTML = `<div style='height: 10px; width: 10px; border-radius: 50%; margin-right: 8px; background-color: #1a73e8;'></div>${label}`;
    clonedNode.addEventListener(
      "click",
      () => {
        injectEmailIntoContainer(email);
      },
      false
    );

    smartRepliesContainer.appendChild(clonedNode);
  };

  // Creates smart reply HTML elements
  for (let idx in smartReplies) {
    createNewSmartReply(smartReplies[idx].label, smartReplies[idx].email);
    // TODO: Limit the # of visible smart replies to three; create a "Load More"
    // button
  }

  // TODO: Create a "New Custom Smart Reply" button and append to the list of
  // Smart Reply elements
};

/*******************
 * MESSAGE PASSING *
 *******************/

// Listens for the "injectScraper" event from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.ping) {
    sendResponse({ pong: true });
    return;
  } else if (request.message === "injectScraper") {
    injectJSPayload(scraperPayload);
  }
});

// Opens a long-lived port connection with the background script
const port = chrome.runtime.connect(
  window.localStorage.getItem("smarterreply-id"),
  { name: "mainPort" }
);

port.onMessage.addListener(msg => {
  if (msg.title === "injectSmartReplies") {
    injectJSPayload(customSmartReplyPayload, msg.smartReplies);
  }
});

// Listens for messages from injected scripts
window.addEventListener("message", event => {
  if (event.data.title === "scrapedEmailContent") {
    // Retrieves scraped email content and sends to the background script
    port.postMessage({
      title: "scrapedEmailContent",
      author: event.data.value.author,
      subject: event.data.value.subject,
      email: event.data.value.email,
      smartReplies: event.data.value.smartReplies
    });
  } else if (event.data.type == "newCustomSmartReply") {
    // Do things
  }
});

/* PLAN A
 *
 * 1. Background script tells the content script to inject the JS payload
 * 2. Payload scrapes email content and sends it to the content script
 * 3. Content script sends the email content to the background script
 * 4. Background script ranks custom smart replies and sends them to the content
 *    script
 * 5. Content script sends smart replies to payload, which creates and injects
 *    the smart reply HTML elements and the "Create Smart Reply" HTML element
 * 6. If the "Create Smart Reply" button is clicked, then the payload sends the
 *    custom reply to content script
 * 7. Content script sends the custom reply to the background script, which
 *    stores it
 */
