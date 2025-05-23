/**
 * Content script for the Webpage Clipper extension
 * Extracts page content and sends it to the background script
 */

// Function to extract text content from the DOM
function extractTextContent(doc) {
  const bodyText = doc.body.innerText || doc.body.textContent || '';
  const words = bodyText.split(/\s+/);
  const wordCount = words.length;
  const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute
  const firstHundredWords = words.slice(0, 100).join(' ') + (words.length > 100 ? '...' : '');

  return {
    content: firstHundredWords,
    wordCount,
    readingTime
  };
}

// Function to fetch and convert favicon to Base64
async function fetchFaviconBase64() {
  const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (!faviconLink || !faviconLink.href) return null;

  try {
    const response = await fetch(faviconLink.href);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to fetch favicon:', error);
    return null;
  }
}

// Function to clip the current page
async function clipCurrentPage() {
  const textData = extractTextContent(document);
  const faviconBase64 = await fetchFaviconBase64();
  const pageData = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    content: textData.content,
    wordCount: textData.wordCount,
    readingTime: textData.readingTime,
    favicon: faviconBase64 // Include favicon in the data
  };

  // Send the data to the background script
  chrome.runtime.sendMessage({
    action: 'clipPage',
    data: pageData
  }, response => {
    if (response && response.success) {
      console.log('Page clipped successfully');
    } else {
      console.error('Failed to clip page');
    }
  });
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Respond to ping to check if content script is loaded
  if (message.action === 'ping') {
    sendResponse({ success: true });
    return;
  }
  
  if (message.action === 'clipPage') {
    clipCurrentPage();
    sendResponse({ success: true });
  }
});
