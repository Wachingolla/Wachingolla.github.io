
// // UI References
const idleScreen = document.getElementById('idle-screen');
const loaderScreen = document.getElementById('loader-screen');
const statusMsg = document.getElementById('status-msg');
const debugLog = document.getElementById('debug-log');
const sendersInfo = document.getElementById('senders-info');
const senderCount = document.getElementById('sender-count');
const toastEl = document.getElementById('toast');

// HELPER FUNCTIONS

function log(msg) {
    console.log('[RECEIVER] ' + msg);
    debugLog.innerText = msg;
}

function showToast(message, duration) {
    duration = duration || 4000;
    toastEl.innerText = message;
    toastEl.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() {
        toastEl.classList.remove('show');
    }, duration);
}

function updateSenderUI() {
    var senders = context.getSenders();
    var count = senders.length;
    if (count > 0) {
        senderCount.innerHTML = count === 1 ? '1 dispositivo conectado' : count + ' dispositivos conectados';
        sendersInfo.classList.add('visible');
        statusMsg.innerText = 'Conectado';
    } else {
        sendersInfo.classList.remove('visible');
        senderCount.innerHTML = '';
        statusMsg.innerText = 'Conectando...';
    }
}

function broadcastStatus(eventType, extra) {
    var senders = context.getSenders();
    var status = {
        type: 'STATUS_UPDATE',
        event: eventType,
        senderCount: senders.length,
        senders: senders.map(function(s) { return s.id; }),
        timestamp: Date.now()
    };
    if (extra) Object.assign(status, extra);

    try {
        context.sendCustomMessage(CUSTOM_NAMESPACE, undefined, status);
    } catch (e) {
        console.warn('[RECEIVER] Broadcast failed:', e);
    }
}

// --- 0. INITIALIZATION ---
const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const playbackConfig = new cast.framework.PlaybackConfig();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

// --- 0.1 Enable debug logger (optional) ---
context.addEventListener(cast.framework.system.EventType.READY, () => {
    if (!castDebugLogger.debugOverlayElement_) {
        // Enable debug logger and show a 'DEBUG MODE' overlay at top left corner.
        castDebugLogger.setEnabled(true);
    }
});

// --- 0.2 Define a custom namespace for app-specific messages ---
const CUSTOM_NAMESPACE = 'urn:x-cast:com.fossynet.presumiendomx';

// --- 1 CONTEXT EVENT LISTENERS OF CONNECTION STATUS ---
context.addEventListener(
    cast.framework.system.EventType.SENDER_CONNECTED,
    function(event) {
        log('Sender connected: ' + event.senderId);
        updateSenderUI();
    }
);

context.addEventListener(
    cast.framework.system.EventType.READY,
    function(event) {
        log('Receiver is ready');
        updateSenderUI();
        // showToast('Receiver is ready');
    }
);

context.addEventListener(
    cast.framework.system.EventType.SENDER_DISCONNECTED,
    function(event) {
        log('Sender disconnected: ' + event.senderId);
        updateSenderUI();

        // if (context.getSenders().length === 0) {
        //     showToast('All devices disconnected');
        // } else {
        //     showToast('A device disconnected');
        //     broadcastStatus('SENDER_DISCONNECTED', { removedSenderId: event.senderId });
        // }
    }
);

// context.addCustomMessageListener(CUSTOM_NAMESPACE, function(customEvent) {
//     var data = customEvent.data;
//     switch (data.type) {
//         case 'SHOW_TOAST':
//             showToast(data.message || 'Notification', data.duration || 4000);
//             break;
//         case 'SET_STATUS_MSG':
//             statusMsg.innerText = data.message || '';
//             break;
//     }
// }); 

// // --- 2 PLAYER MANAGER INTERCEPTORS AND LISTENERS ---
// playerManager.setMessageInterceptor(
// cast.framework.messages.MessageType.LOAD, loadRequestData => {
//     const error = new cast.framework.messages.ErrorData(
//                     cast.framework.messages.ErrorType.LOAD_FAILED);
//     if (!loadRequestData.media) {
//     error.reason = cast.framework.messages.ErrorReason.INVALID_PARAM;
//     return error;
//     }

//     if (!loadRequestData.media.entity) {
//     return loadRequestData;
//     }

//     return thirdparty.fetchAssetAndAuth(loadRequestData.media.entity,
//                                         loadRequestData.credentials)
//     .then(asset => {
//         if (!asset) {
//         throw cast.framework.messages.ErrorReason.INVALID_REQUEST;
//         }

//         idleScreen.classList.remove('active');
//         loadRequestData.media.contentUrl = asset.url;
//         loadRequestData.media.metadata = asset.metadata;
//         loadRequestData.media.tracks = asset.tracks;
//         return loadRequestData;
//     }).catch(reason => {
//         error.reason = reason; // cast.framework.messages.ErrorReason
//         return error;
//     });
// });

// // --- 2. PLAYER STATE LISTENERS ---
playerManager.addEventListener(
    cast.framework.events.EventType.MEDIA_STATUS,
    function(event) {
        var state = event.value;
        switch(state) {
            case cast.framework.events.EventType.IDLE:
                idleScreen.classList.add('active');
                loaderScreen.classList.remove('active');
                updateSenderUI(); 
                break;
            case cast.framework.events.EventType.BUFFERING:
            case cast.framework.events.EventType.LOADING:
                idleScreen.classList.remove('active');
                loaderScreen.classList.add('active');
                break;
            case cast.framework.events.EventType.PLAYING:
                idleScreen.classList.remove('active');
                loaderScreen.classList.remove('active');
                break;
            case cast.framework.events.EventType.PAUSED:
                loaderScreen.classList.remove('active');
                break;
        }
        broadcastStatus('PLAYER_STATE_CHANGED', { playerState: state });
    }
);

// playerManager.setMessageInterceptor(
//     cast.framework.messages.MessageType.LOAD,
//     function(loadRequestData) {
//         if (loadRequestData.media && loadRequestData.media.metadata) {
//             var title = loadRequestData.media.metadata.title;
//             statusMsg.innerText = 'Loading: ' + title;
//             showToast('Loading: ' + title);
//         }
//         return loadRequestData;
//     }
// );

context.start({
    // playbackConfig: playbackConfig,
    playerManager: playerManager,
    // castDebugLogger: castDebugLogger
});
