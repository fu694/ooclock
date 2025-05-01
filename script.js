import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// 1Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBotf9wLzGYH54FVHV4EbmWEjzTDXn_IQI",
  authDomain: "oclock-8378b.firebaseapp.com",
  projectId: "oclock-8378b",
  storageBucket: "oclock-8378b.firebasestorage.app",
  messagingSenderId: "217669506746",
  appId: "1:217669506746:web:b5af90b413170603601483",
  measurementId: "G-TDG40NE9M2"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let numberImages = {};
export async function fetchAndDisplayImages(onlyApproved = false) {
  if (!db) {
    alert("Firestore connection is not properly set up!");
    return;
  }
  const numbersCollection = collection(db, "numbers");
    const numbersSnapshot = await getDocs(numbersCollection);
    if (numbersSnapshot.empty) {
      return;
    }
    const fragment = document.createDocumentFragment();
    numberImages = {}; 
    for (const numberDoc of numbersSnapshot.docs) {
      const numberId = numberDoc.id;
      const historyRef = collection(db, "numbers", numberId, "history");
      let q = historyRef;
      if (onlyApproved) {
        q = query(historyRef, where("status", "==", "approved"));
      }
      const historySnapshot = await getDocs(q);
      if (historySnapshot.empty) {
        continue;
      }
      numberImages[numberId] = [];
      for (const doc of historySnapshot.docs) {
        const data = doc.data();
        if (!numberImages[numberId]) {
          numberImages[numberId] = [];
        }
        if (!data.canvasData) {
          continue;
        }
        if (data.canvasData) {
          numberImages[numberId].push({ type: "canvasData", url: data.canvasData });
        }
        const validCanvasData = data.canvasData ? data.canvasData : null;
        const imgElement = createImageElement(data.canvasData);
        fragment.appendChild(imgElement);
      }
    }
}
function createImageElement(canvasData, char) {
  let imgElement = document.createElement("img");
  if (canvasData && canvasData.startsWith("data:image")) {
    imgElement.src = canvasData;
  } else {
    imgElement.src = "./images/default.png";
  }
  imgElement.classList.add("clock-image");
  imgElement.onerror = () => {
    imgElement.src = "./images/default.png";
  };
  return imgElement;
}
fetchAndDisplayImages().then(() => {
});
function getImageForTime(number, images, currentTime, interval) {
  if (!images || images.length === 0) {
    return "/default-image.png";
  }
  const index = Math.floor(currentTime / interval) % images.length; 
  const imageObj = images[index];
  if (!imageObj || !imageObj.url) {
    return "/default-image.png";
  }
  return imageObj.url; 
}
async function updateClockWithImages() {
  if (Object.keys(numberImages).length === 0) {
    numberImages = await fetchAndDisplayImages();
  }
  
const now = new Date(); 
const hours = String(now.getUTCHours()).padStart(2, '0');
const minutes = String(now.getUTCMinutes()).padStart(2, '0');
const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  const timeString = `${hours}:${minutes}:${seconds}`;
  const digitalClock = document.getElementById('digitalClock');
  if (!digitalClock) {
    return; 
  }
  digitalClock.innerHTML = "";
const nowSeconds = Math.floor(new Date().getTime() / 1000);

  for (let i = 0; i < timeString.length; i++) {
    const char = timeString[i];
    if (char === ":") {
      const colonSpan = document.createElement("span");
      colonSpan.textContent = ":";
      colonSpan.style.fontSize = "2rem";
      digitalClock.appendChild(colonSpan);
    } else {
      let cycle = 10; 
      if (i < 2) {
        cycle = 36000; 
      } else if (i >= 3 && i < 5) {
        cycle = 600; 
      } else if (i >= 6) {
        cycle = 10;
      }
      const img = document.createElement("img");
      img.src = getImageForTime(char, numberImages[char], nowSeconds, cycle);
      img.setAttribute("style", "width: 80px; height: auto; margin: 2px;");
      digitalClock.appendChild(img);
    }
  }
}
function getCurrentTimeString() {
  const now = new Date();
return now.toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" });

}
window.onload = async function () {
  await fetchAndDisplayImages(true); 
  updateClockWithImages(); 
  setInterval(updateClockWithImages, 1000); };
let timeString; 
setInterval(() => {
  timeString = getCurrentTimeString();
  updateClockWithImages();
}, 1000);
const homePage = document.getElementById('homePage');
const uploadPage = document.getElementById('uploadPage');
const postStatus = document.getElementById('postStatus');
const toUploadPageButton = document.getElementById('toUploadPage');
toUploadPageButton.addEventListener('click', () => {
  homePage.style.display = 'none';
  uploadPage.style.display = 'block';
  toUploadPageButton.style.display = 'none'; 
});
 setTimeout(() => {
  const postButton = document.getElementById("postButton");
  if (postButton) {
    postButton.addEventListener("click", async () => {
      if (!window.selectedNumber) {
        console.error("No number button is selected.");
        postStatus.textContent = 'Status: Please select a number.';
        postStatus.style.color = "red"; 
        return;
       }
       let number = window.selectedNumber;
       number = (number || '').replace(/[^a-zA-Z0-9_-]/g, '');
       if (!number) {
        postStatus.textContent = 'Status: Selected number is empty. Please select a valid number.';
        postStatus.style.color = "red"; 
        return;
       }
       number = number.trim();
       const canvasData = drawCanvas.toDataURL();
       if (!canvasData) {
         postStatus.textContent = 'Status: Please draw or select an image.';
         postStatus.style.color = "red";
         return;
       }
       try {
         await saveImageToHistory(number, canvasData);
       } catch (error) {
         postStatus.textContent = "Status: Error uploading image.";
         postStatus.style.color = "red";
       }
  });
    const backButton = document.getElementById('backButton');
    if (backButton) {
      backButton.addEventListener('click', () => {
        uploadPage.style.display = 'none';
        homePage.style.display = 'block';
        toUploadPageButton.style.display = 'block';
      });
    } else {
      console.error(" backButton not found!");
    }
  } else {
    console.error("postButton not found!");
  }
}, 100); 
const saveImageToHistory = async (number, canvasData) => {
  try {
    const historyCollectionRef = collection(db, 'numbers', number, 'history');
    if (!number || typeof number !== 'string') {
      throw new Error("Invalid number selected.");
    }
    await addDoc(historyCollectionRef, {
        canvasData: canvasData || null,
        status: 'pending', 
        number: number,
        timestamp: serverTimestamp()
    }), 
    postStatus.textContent = 'Status: Uploaded successfully!!';
    postStatus.style.color = "black"; 
    const canvas = document.getElementById("drawCanvas"); 
    if (canvas && canvas.getContext) {
     const ctx = canvas.getContext("2d");
     ctx.clearRect(0, 0, canvas.width, canvas.height);
}
  } catch (error) {
     if (error.code === "permission-denied") {
      console.error("Firestore permission error. Check your Firestore rules.");
    } else if (error.code === "unavailable") {
      console.error("Network issue or Firestore service is down.");
    } else if (error.code === "not-found") {
      console.error("Specified document path does not exist.");
    } else {
      console.error("Unknown error occurred.");
    }
    postStatus.textContent = `Status: Error - ${error.message}`;
    postStatus.style.color = "red";
  }
};
const drawCanvas = document.getElementById('drawCanvas');
const clearCanvas = document.getElementById('clearCanvas');
const penColorInput = document.getElementById('penColor');
const penSizeContainer = document.getElementById('penSizeContainer');
const eraserButton = document.getElementById('eraserButton');
const penIconButton = document.getElementById('penIconButton');
const ctx = drawCanvas.getContext('2d');
ctx.fillStyle = "white";
ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
let drawing = false;
let penColor = "#000000";
let penSize = 10;
let lastX = 0;
let lastY = 0;
let isErasing = false; 
ctx.lineWidth = penSize;
ctx.strokeStyle = penColor;
ctx.lineCap = 'round';
ctx.lineJoin = 'round'; 
penColorInput.addEventListener('change', (e) => {
  penColor = e.target.value;
  if (!isErasing) { 
    ctx.strokeStyle = penColor;
  }
});
penIconButton.addEventListener('click', () => {
  penColorInput.click(); 
});
penColorInput.addEventListener('input', (event) => {
  const selectedColor = event.target.value;
  penIconButton.querySelector('i').style.color = selectedColor; 
});
penSizeContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('pen-size')) {
    const buttons = penSizeContainer.querySelectorAll('.pen-size');
    buttons.forEach(button => button.classList.remove('selected'));
    e.target.classList.add('selected');
    if (e.target.id === 'penThin') {
      penSize = 2;
    } else if (e.target.id === 'penMedium') {
      penSize = 6;
    } else if (e.target.id === 'penThick') {
      penSize = 10;
    }
    ctx.lineWidth = penSize;
  }
});
let isEracing = false;
eraserButton.addEventListener('click', () => {
  isErasing = !isErasing;
  if (isErasing) {
    ctx.strokeStyle = "white"; 
    ctx.lineWidth = penSize; 
    eraserButton.classList.add('no-border');
  } else {
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    eraserButton.classList.remove('no-border');
  }
});
drawCanvas.addEventListener('mousedown', (e) => {
  drawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY); 
});
drawCanvas.addEventListener('mouseup', () => (drawing = false));
drawCanvas.addEventListener('mousemove', (e) => {
  if (!drawing) return;
  let deltaX = e.offsetX - lastX;
  let deltaY = e.offsetY - lastY;
  let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance > 2) {
    let steps = Math.max(1, distance / 5); 
    for (let i = 0; i < steps; i++) {
      let x = lastX + (deltaX / steps) * i;
      let y = lastY + (deltaY / steps) * i;
      ctx.lineTo(x, y); 
      ctx.stroke();     
    }
  }
  lastX = e.offsetX || e.clientX;
  lastY = e.offsetY || e.clientY;
});
clearCanvas.addEventListener('click', () => {
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
});
// タッチ操作をサポート
drawCanvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = drawCanvas.getBoundingClientRect();
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    drawing = true;
  }
  e.preventDefault(); // スクロールなどを無効化
}, { passive: false });

drawCanvas.addEventListener('touchmove', (e) => {
  if (drawing && e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = drawCanvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    lastX = currentX;
    lastY = currentY;
  }
  e.preventDefault();
}, { passive: false });

drawCanvas.addEventListener('touchend', () => {
  drawing = false;
});

window.selectedNumber = null;
document.addEventListener("DOMContentLoaded", function() {
  const numberButtons = document.querySelectorAll('.numberButton');
  numberButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      numberButtons.forEach((btn) => btn.classList.remove('selected'));
    e.target.classList.add('selected');
    window.selectedNumber = e.target.textContent.trim();
    e.target.style.backgroundColor = "#000000";
    e.target.style.color = "white";
    document.querySelectorAll('.numberButton').forEach((btn) => {
      if (!btn.classList.contains('selected')) {
        btn.style.backgroundColor = "";
        btn.style.color = "";
      }
    });
    });
  });
});
function dataURLToBlob(dataURL) {
  const byteString = atob(dataURL.split(',')[1]);
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}
const canvasData = drawCanvas.toDataURL('image/png');
const imageBlob = dataURLToBlob(canvasData);
const img = new Image();
img.onload = () => {
};
img.onerror = () => {
};
document.body.appendChild(img); 
let number = '';
const fallbackSave = async(number, canvasData) =>{
if (typeof number !== 'string' || number.trim() === '') {
  postStatus.textContent = 'Status: Invalid number. Please try again.';
  postStatus.style.color = "red";
  return;
} 
try {
  console.warn("Trying Fallback: Adding document directly under numbers/");
  const fallbackRef = doc(db, 'numbers', number);
  await setDoc(fallbackRef, {
    canvasData: canvasData || null,
    status: 'pending (fallback)',
    timestamp: serverTimestamp()
  });
} catch (fallbackError) {
  postStatus.textContent = "Status: Fallback Error - Unable to save.";
  postStatus.style.color = "red";
}
};
