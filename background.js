chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  if (request.action === "startRemoval") {
    try {
      const tabs = await chrome.tabs.query({ active: true });
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: startFunction,
      });
    } catch (error) {
      console.log("Error starting removal:", error);
    }
  }
});

const startFunction = async () => {
  const clickLikedTab = async () => {
    try {
      const likedTabButton = document.querySelector(".tiktok-ixtc0z-PLike") ?? document.querySelector(".tiktok-1uazqi2-PLike");
      if (likedTabButton) {
        if (likedTabButton.className.includes("tiktok-1uazqi2-PLike")) {
          likedTabButton.click();
          console.log("Liked tab opened");
          await sleep(5000);
        }
      } else {
        console.log("Liked tab not found");
      }
    } catch (error) {
      console.log("Error clicking liked tab:", error);
    }
  };

  const clickLikedVideo = async () => {
    try {
      const firstLikedVideo = document.querySelectorAll(".tiktok-1s72ajp-DivWrapper")[0];
      if (firstLikedVideo) {
        firstLikedVideo.querySelector("a").click();
        console.log("First liked video opened");
      } else {
        console.log("You have no favorites");
      }
    } catch (error) {
      console.log("Error clicking liked video:", error);
    }
  };

  const clickNextFavoriteAndRemove = async () => {
    try {
      const interval = setInterval(() => {
        const nextVideoButton = document.querySelector(".tiktok-1s9jpf8-ButtonBasicButtonContainer-StyledVideoSwitch");
        const actionButtons = document.querySelector(".tiktok-1d39a26-DivFlexCenterRow");
        if (actionButtons) {
          const likeButton = actionButtons.getElementsByTagName("button")[0];
          likeButton.click();
          console.log("Liked removed");
        } else {
          clearInterval(interval);
          stopScript("No more favorites");
        }
        if (nextVideoButton && !nextVideoButton.disabled) {
          nextVideoButton.click();
          console.log("Next liked clicked");
        } else {
          clearInterval(interval);
          stopScript("No more favorites");
        }
      }, 2000);
    } catch (error) {
      console.log("Error clicking next video button", error);
    }
  };

  const stopScript = (message) => {
    console.log(`${message}, stopping script`);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    console.log("Start function");
    await clickLikedTab();
    await clickLikedVideo();
    await clickNextFavoriteAndRemove();
  } catch (error) {
    console.log("Error in start function:", error);
  }
};
