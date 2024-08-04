const fileInput = document.getElementById('fileInput');
const fileListContainer = document.getElementById('fileList');
const imageContainer = document.getElementById('imageContainer');
const sizeRange = document.getElementById('sizeRange');
const toggleButton = document.getElementById('toggleButton');
const sidebar = document.getElementById('sidebar');
const popup = document.getElementById('popup');
const popupImage = document.getElementById('popupImage');
const popupClose = document.getElementById('popupClose');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const folderNavigation = document.getElementById('folderNavigation');
const folderButtons = document.getElementsByClassName('folder-button');

let currentIndex = -1; 
const images = []; 
let zipFiles = []; 
let folders = {}; 

fileInput.addEventListener('change', function(event) {
    const files = Array.from(event.target.files);
    zipFiles = files.filter(file => file.name.endsWith('.zip'));
    displayFileList();
});

toggleButton.addEventListener('click', function() {
    sidebar.classList.toggle('minimized');
    adjustMainContentMargin();
});

function displayFileList() {
    fileListContainer.innerHTML = '';
    zipFiles.forEach((file, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = file.name;
        listItem.addEventListener('click', () => loadZipFile(index));
        fileListContainer.appendChild(listItem);
    });
}

function loadZipFile(index) {
    const file = zipFiles[index];
    if (file && file.name.endsWith('.zip')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            JSZip.loadAsync(e.target.result).then(async function(zip) {
                imageContainer.innerHTML = ''; 
                images.length = 0; 
                folders = {}; 

                const imageEntries = [];
                zip.forEach(function(relativePath, zipEntry) {
                    if (!zipEntry.dir && /\.(jpg|jpeg|png|gif)$/i.test(zipEntry.name)) {
                        const folderPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
                        if (!folders[folderPath]) {
                            folders[folderPath] = [];
                        }
                        folders[folderPath].push(zipEntry);
                    }
                });

                for (const folder in folders) {
                    folders[folder].sort((a, b) => naturalSort(a.name, b.name));
                }

                createFolderButtons();

                console.log("Sorted image entries:");
                Object.keys(folders).forEach(folder => {
                    folders[folder].forEach(entry => console.log(entry.name));
                });

                displayImages(Object.keys(folders)[0]);
            }).catch(function(err) {
                console.error('Error loading ZIP file:', err);
            });
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Please select a valid ZIP file.');
    }
}

function createFolderButtons() {
    folderNavigation.innerHTML = '';

    const foldersWithImages = Object.keys(folders).filter(folder => folders[folder].length > 0);

    foldersWithImages.forEach(folder => {
        const button = document.createElement('button');
        button.textContent = folder.substring(folder.lastIndexOf('/') + 1) || 'Root'; 
        button.classList.add('folder-button');
        button.addEventListener('click', () => {
            setActiveButton(button);
            displayImages(folder);
        });
        folderNavigation.appendChild(button);
        
        const separator = document.createElement('div');
        separator.classList.add('folder-separator');
        folderNavigation.appendChild(separator);
    });
}

function setActiveButton(activeButton) {
    const buttons = document.querySelectorAll('.folder-button');
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    activeButton.classList.add('active');
}

function displayImages(folder) {
    imageContainer.innerHTML = '';
    const imageEntries = folders[folder] || [];
    
    const imagePromises = imageEntries.map(async function(zipEntry) {
        try {
            const blob = await zipEntry.async('blob');
            return { name: zipEntry.name, blob: blob, folder: folder };
        } catch (err) {
            console.error(`Error processing image ${zipEntry.name}:`, err);
        }
    });

    Promise.all(imagePromises).then(resolvedImages => {
        images.length = 0; 
        resolvedImages.forEach(function(image, idx) {
            if (image) {
                images.push(image); 
                const img = document.createElement('img');
                img.src = URL.createObjectURL(image.blob);
                img.style.width = sizeRange.value + 'px';
                img.classList.add('photo'); 
                imageContainer.appendChild(img);
                console.log(`Displayed image: ${image.name}`);
            }
        });

        const photoElements = document.querySelectorAll('#imageContainer .photo');
        photoElements.forEach((photoElement, idx) => {
            photoElement.addEventListener('click', () => openPopup(idx));
        });
    });
}

function openPopup(index) {
    currentIndex = index;
    updatePopup();
    popup.classList.remove('hidden');
}

function closePopup() {
    popup.classList.add('hidden');
}

function updatePopup() {
    if (currentIndex >= 0 && currentIndex < images.length) {
        popupImage.src = URL.createObjectURL(images[currentIndex].blob);
    }
}

function showNextImage() {
    if (currentIndex < images.length - 1) {
        currentIndex++;
        updatePopup();
    }
}

function showPreviousImage() {
    if (currentIndex > 0) {
        currentIndex--;
        updatePopup();
    }
}

popupClose.addEventListener('click', closePopup);
prevButton.addEventListener('click', showPreviousImage);
nextButton.addEventListener('click', showNextImage);

sizeRange.addEventListener('input', function(event) {
    const newSize = event.target.value + 'px';
    const imageElems = document.querySelectorAll('#imageContainer img');
    imageElems.forEach(function(img) {
        img.style.width = newSize;
    });
});

function naturalSort(a, b) {
    const numberExtractor = /(\d+)/g;

    const extractNumbers = (str) => {
        const numbers = str.match(numberExtractor) || [];
        return numbers.map(Number);
    };

    const aNumbers = extractNumbers(a);
    const bNumbers = extractNumbers(b);

    for (let i = 0; i < Math.min(aNumbers.length, bNumbers.length); i++) {
        if (aNumbers[i] !== bNumbers[i]) {
            return aNumbers[i] - bNumbers[i];
        }
    }

    return a.length - b.length;
}
