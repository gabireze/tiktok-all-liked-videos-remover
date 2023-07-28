chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  if (request.action === "removeFavoriteVideos") {
    try {
      const tabs = await chrome.tabs.query({ active: true });
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: initiateLikedVideosRemoval,
      });
    } catch (error) {
      console.log({ message: "Error starting removal process.", error: error });
    }
  }
});

const initiateLikedVideosRemoval = async () => {
  const clickLikedTab = async () => {
    try {
      let elements = document.querySelectorAll('[class^="tiktok"]');
      let elementsArray = Array.from(elements);
      let divVideoFeedTab = elementsArray.find((element) => {
        let className = String(element.className);
        if (className.includes("DivVideoFeedTab")) {
          return element;
        }
      });
      if (divVideoFeedTab) {
        let likedTab = divVideoFeedTab.querySelector("p:nth-of-type(3)");
        if (!likedTab) {
          stopScript("'Liked' tab not found on the page");
          return;
        }
        likedTab.click();
        console.log("Successfully opened the 'Liked' tab.");
        await sleep(5000);
      } else {
        stopScript("The 'Liked' tab container not found on the page");
        return;
      }
    } catch (error) {
      stopScript("Error finding or clicking the 'Liked' tab", error);
    }
  };

  const clickLikedVideo = async () => {
    try {
      let elements = document.querySelectorAll('[class^="tiktok"]');
      let elementsArray = Array.from(elements);
      let firstVideo = elementsArray.find((element) => {
        let className = String(element.className);
        if (className.includes("DivPlayerContainer")) {
          return element;
        }
      });
      if (firstVideo) {
        firstVideo.click();
        console.log("Successfully opened the first liked video.");
        await sleep(5000);
      } else {
        stopScript("No liked videos found. Your liked videos list is empty");
        return;
      }
    } catch (error) {
      stopScript("Error finding or clicking the first liked video", error);
    }
  };

  const clickNextLikedVideoAndRemove = async () => {
    try {
      let elements = document.querySelectorAll('[class^="tiktok"]');
      let elementsArray = Array.from(elements);
      let nextVideoButton = elementsArray.filter((element) => {
        let className = String(element.className);
        if (className.includes("ButtonBasicButtonContainer-StyledVideoSwitch")) {
          return element;
        }
      })[1];
      let likeButton = elementsArray
        .find((element) => {
          let className = String(element.className);
          if (className.includes("DivFlexCenterRow-StyledWrapper")) {
            return element;
          }
        })
        .getElementsByTagName("button")[0];
      const interval = setInterval(() => {
        if (!likeButton) {
          clearInterval(interval);
          stopScript("Could not find the like button");
          return;
        }
        likeButton.click();
        console.log("Successfully removed the like from the current video.");
        if (!nextVideoButton || nextVideoButton.disabled) {
          clearInterval(interval);
          stopScript("Script completed: All actions executed successfully");
          return;
        }
        nextVideoButton.click();
        console.log("Clicked the next liked video.");
      }, 2000);
    } catch (error) {
      stopScript("Could not click next liked video", error);
    }
  };

  const stopScript = (message, error = "") => {
    error ? console.log({ message: `${message}. Stopping script...`, error: error }) : console.log(`${message}. Stopping script...`);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    console.log("Script started: Initiating actions...");
    await clickLikedTab();
    await clickLikedVideo();
    await clickNextLikedVideoAndRemove();
  } catch (error) {
    stopScript("Error in script", error);
  }
};
