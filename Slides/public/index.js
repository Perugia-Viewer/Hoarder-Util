/* For caching the lists */
let list;
let shuffledList;

/* State */
let currIndex = 0;
let timer = 5; /* in secomds */
let interval = null;
let cache = {};
let shuffle = true;
let optionsOpen = false;
let panelOpen = false;

/* Hide mouse variables */
let idleTimer;
let forceHide = false;

const nosleep = new NoSleep();

/** Localstorage cache items */
const LS_KEYS = {
    POS: 'pos',
    TIMER: 'timer'
};
const CACHE_KEEP_RANGE = 3;
const MIN_TIME = 3;

const reset = async () => {
    currIndex = 0;
    clearCache();
    main();
}

const toggleShuffle = () => {
    shuffle = !shuffle;
    $('#shuffle-option').toggleClass('active', shuffle);
    clearCache();
    loadNext(true);
};

const clearCache = () => {
    Object.keys(cache).forEach(key => {
        delete cache[key];
    });
};

const shuffleList = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
};

/**
 * @param {boolean} pausing 
 */
const showNotifier = (pausing) => {
    const target = '.notifier';
    let old = document.querySelector(target);
    let newEl = old.cloneNode(true);
    old.parentNode.replaceChild(newEl, old);
    if (pausing) {
        $(target).text('pause');
    } else {
        $(target).text('play_arrow');
    }

};

const startShow = () => {
    console.log('startShow');
    showNotifier(false);
    $('.play-pause').text('pause');
    interval = setInterval(advanceSlide, (Math.max(timer, MIN_TIME)) * 1000);
    nosleep.enable();
};

const clearShow = () => {
    if (interval) clearInterval(interval);
    showNotifier(true);
    interval = null;
    $('.play-pause').text('play_arrow');
    nosleep.disable();
};

const advanceSlide = () => {
    currIndex++;
    if (currIndex >= list.length) currIndex = 0;
    loadNext();
};

const backSlide = () => {
    currIndex--;
    if (currIndex < 0) currIndex = list.length - 1;
    loadNext();
}

const handlePlayPause = () => {
    if (interval) {
        clearShow();
    } else {
        startShow();
    }
};

/**
 * Fetch the file list
 */
const getFileList = async () => {
    const res = await fetch('list');
    const json = await res.json();
    list = json;
    const shuf = await fetch('list?shuffled=1');
    shuffledList = await shuf.json();
    console.log(list)
    return json;
}

const getSlotForIndex = (i) => {
    return `#slot-${ i % 3 }`;
};

const handleZIndexes = () => {
    const prevEle = getSlotForIndex(currIndex - 1);
    const currEle = getSlotForIndex(currIndex);
    const nextEle = getSlotForIndex(currIndex + 1);

    $(prevEle).removeClass('middle-slide');
    $(currEle).removeClass('top-slide');
    $(currEle).addClass('middle-slide');
    $(nextEle).addClass('top-slide');
};

const updateCaption = () => {
    const useList = selectList();
    const item = useList[currIndex];
    $('#mini-filename').text(`(${currIndex + 1}/${list.length}) - ${item.add}/${item.item}`);
};

/**
 * Actual fnc to load the images and manage the cache
 * @param {boolean} skipCurrent 
 */
const loadNext = (skipCurrent = false) => {
    brieflyHideLoader();
    cleanCaches(+currIndex);
    loadOne(currIndex - 1, false, skipCurrent);
    loadOne(currIndex, true, skipCurrent);
    loadOne(currIndex + 1, false, skipCurrent);

    loadOne(currIndex + 2, false, false, false);
    handleZIndexes();

    if (panelOpen) updateCaption();
};

const loadOne = async (i, onStage, shouldWipe = false, loadDom = true) => {
    const useList = selectList();
    if (!useList[i]) return;
    if (i < 0) i = useList.length - 1;
    if (i >= useList.length) i = 0;
    const target = getSlotForIndex(i);
    if (shouldWipe || onStage) $(target).attr('src', null);
    const fullPath = useList[i].fullPath;
    // console.log('onstage: index', i, onStage, !!cache[i]);
    if (loadDom) $(target).toggleClass('hidden', !onStage);
    const imgStr = cache[i] ? cache[i] : await fetchImage(fullPath);
    cache[i] = imgStr;
    if (loadDom) $(target).attr('src', imgStr);
    // console.log(Object.keys(cache))
};

const brieflyHideLoader = () => {
    $('#main-loader').addClass('hidden');
    setTimeout(() => $('#main-loader').removeClass('hidden'), 1000);
};

const cleanCaches = (currentIndex) => {
    if (cache[currentIndex - CACHE_KEEP_RANGE]) delete cache[currentIndex - CACHE_KEEP_RANGE];
    if (cache[currentIndex + CACHE_KEEP_RANGE]) delete cache[currentIndex + CACHE_KEEP_RANGE];
};

const fetchImage = async (requestedPath) => {
    const encoded = encodeURIComponent(requestedPath);
    const res = await fetch(`image?path=${encoded}`);
    const arrBuff = await res.arrayBuffer();
    const imageStr = 'data:image/jpeg;base64,' + arrayBufferToBase64(arrBuff);
    return imageStr;
};

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    let bytes = [].slice.call(new Uint8Array(buffer));
    bytes.forEach((b) => binary += String.fromCharCode(b));

    return window.btoa(binary);
};

const postRequest = async (url, params) => {
    return new Promise(async resolve => {
        const options = {
            headers: {
                'content-type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(params),
            method: 'post'
        };

        const res = await fetch(url, options);
        const text = await res.text();
        try {
            resolve(JSON.parse(text));
        } catch (e) {
            resolve(text);
        }
    });
};

const adjustInterval = () => {
    const timerTemp = $('#interval-field').val();
    if (timerTemp < MIN_TIME) {
        timer = MIN_TIME;
        $('#interval-field').val(MIN_TIME);
    } else {
        timer = timerTemp;
    }
};

const selectList = () => {
    return useList = shuffle ? shuffledList : list;
};

const rotateImage = async () => {
    if (interval) clearShow();
    const fullPath = selectList()[currIndex].fullPath;
    const encoded = encodeURIComponent(fullPath);
    const url = `edit?method=rotate&path=${encoded}`;
    await postRequest(url, {});
    const imgStr = await fetchImage(fullPath);
    cache[currIndex] = imgStr;
    $(getSlotForIndex(currIndex)).attr('src', imgStr);
};

const handleOpenOptions = () => {
    if (optionsOpen) return;
    setTimeout(() => {
        $('.viewer-area').toggleClass('blur', true);
        const useList = selectList();
        constructInfoArea();
        $('#filename').text(useList[currIndex].fullPath);
        $('#interval-field').val(timer);
        clearShow();
        $('.toolbar').toggleClass('hidden', false);
        optionsOpen = true;
    }, 10);
};

const closeOptions = () => {
    optionsOpen = false;
    $('.viewer-area').toggleClass('blur', false);
    $('.toolbar').toggleClass('hidden', true);
    emptyInfoArea();
    startShow();
};

const handleFullscreen = () => {
    const element = document.body;
    const doc = document;

    if (
        !doc.fullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.msFullscreenElement
    ) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen(Elem.ALLOW_KEYBOARD_INPUT);
        }

        element.style.width = '100%';
        element.style.height = '100%';
    } else {
        if (doc.exitFullscreen) {
            doc.exitFullscreen();
        } else if (doc.msExitFullscreen) {
            doc.msExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
            doc.mozCancelFullScreen();
        } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
        }
    }
};

/**
 * Check if a cached index lists
 */
const checkIndex = () => {
    const lIndex = localStorage.getItem(LS_KEYS.POS);
    if (lIndex !== undefined) {
        currIndex = +lIndex;
    }
    const lTimer = localStorage.getItem(LS_KEYS.TIMER);
    if (lTimer !== undefined) {
        timer = Math.max(lTimer, 3);
    }
};

/**
 * 
 * @param {boolean} show 
 */
const showControl = (show) => {
    $('.control-bar').toggleClass('control-bar-hover', show);
    panelOpen = show;
    if (show) updateCaption();
};

const addListeners = () => {
    $('body').css('cursor', 'none');

    window.onbeforeunload = () => {
        localStorage.setItem(LS_KEYS.POS, currIndex);
        localStorage.setItem(LS_KEYS.TIMER, timer);
    };

    let specifiedElement = document.querySelector('.toolbar');
    document.addEventListener('click', (event) => {
        let isClickInside = specifiedElement.contains(event.target);

        if (!isClickInside && optionsOpen) {
            closeOptions();
        }
    });

    $('.control-bar').hover(
        () => showControl(true),
        () => showControl(false)
    );

    document.addEventListener('keydown', (e) => {
        e.preventDefault();
        const key = e.key;
        switch (key) {
            case ' ':
                return handlePlayPause();
            case 'ArrowLeft':
                return backSlide();
            case 'ArrowRight':
                return advanceSlide();
        }
    });

    $('body').mousemove(() => {
        if (!forceHide) {
            $('body').css('cursor', '');
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                $('body').css('cursor', 'none');

                forceHide = true;
                setTimeout(() => {
                    forceHide = false;
                }, 200);
            }, 1000);
        }
    });
};

const constructInfoArea = async () => {
    $('.info-area').append('<img class="loader" src="loading.svg" />');
    const res = await fetch('config');
    const json = await res.json();
    const exif = await getExif();
    const exifInsert = constructExifInfo(exif);
    const { basePath, exclude, version } = json;
    const contents = `
        <h3>Image Exif Data</h3>
        ${exifInsert}
        <h3>Back-end Information</h3>
        <li>Root Scan Path: ${basePath}</li>
        <li>Excluded Dirs: ${exclude.join(',')}</li>
        <li>Version: ${version}</li>
        <li>Powered by 我是印度人™ tech</li>
        `;
    $('.info-area').empty();
    $('.info-area').append(contents);
};

const constructExifInfo = (info) => {
    if (info.message) {
        return '<li>Could not read Exif data</li>';
    }
    const {
        ExposureTime,
        FNumber,
        ISO,
        CreateDate,
        LensMake,
        LensModel
    } = info;
    const mod = (info) => info ? info : 'unknown';

    return `
        <li>Create Date: ${mod(CreateDate)}</li>
        <li>Aperture: ${mod(FNumber)}</li>
        <li>Exposure Time: ${mod(decimalToFraction(ExposureTime))}</li>
        <li>ISO: ${mod(ISO)}</li>
        <li>Lens: ${mod(LensMake)} ${mod(LensModel)}</li>
    `;
};

const emptyInfoArea = () => {
    $('.info-area').empty();
}; 

const getExif = async () => {
    try {
        const encoded = encodeURIComponent(selectList()[currIndex].fullPath);
        const res = await fetch(`exif?path=${encoded}`);
        const json = await res.json();
        return json;
    } catch (e) {
        console.log('Error getting exif', e);
    }
};
                          
const main = async () => {
    await getFileList();
    checkIndex();
    $('#shuffle-option').toggleClass('active', shuffle);
    addListeners();
    loadNext();
    startShow();
};

$(document).ready(main);

/** Courtesy redteamsnippets from Github */
function gcd(a, b) {
    return (b) ? gcd(b, a % b) : a;
}
var decimalToFraction = function (decimal) {
    if (!decimal) return null;

    const _decimal = +decimal;
    if (_decimal == parseInt(_decimal)) {
        return {
            top: parseInt(_decimal),
            bottom: 1,
            display: parseInt(_decimal) + '/' + 1
        };
    }
    else {
        var top = _decimal.toString().includes(".") ? _decimal.toString().replace(/\d+[.]/, '') : 0;
        var bottom = Math.pow(10, top.toString().replace('-', '').length);
        if (_decimal >= 1) {
            top = +top + (Math.floor(_decimal) * bottom);
        }
        else if (_decimal <= -1) {
            top = +top + (Math.ceil(_decimal) * bottom);
        }

        var x = Math.abs(gcd(top, bottom));
        // return {
        //     top: (top / x),
        //     bottom: (bottom / x),
        //     display: (top / x) + '/' + (bottom / x)
        // };
        const fracString = `${top / x}/${bottom / x}`;
        return fracString.length > 10 ? decimal : fracString;
    }
};
